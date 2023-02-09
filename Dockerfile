FROM node:18.13.0-bullseye-slim as base-with-encryption

WORKDIR /cryptd

RUN apt-get update && \
    apt-get install curl -y && \
    curl https://repo.mongodb.com/apt/debian/dists/bullseye/mongodb-enterprise/5.0/main/binary-amd64/mongodb-enterprise-cryptd_5.0.14_amd64.deb -o mongocryptd.deb && \
    curl https://libmongocrypt.s3.amazonaws.com/apt/debian/dists/buster/libmongocrypt/1.6/main/binary-amd64/libmongocrypt-dev_1.6.2-0_amd64.deb -o libmongocrypt-dev.deb && \
    curl https://libmongocrypt.s3.amazonaws.com/apt/debian/dists/buster/libmongocrypt/1.6/main/binary-amd64/libmongocrypt0_1.6.2-0_amd64.deb -o libmongocrypt0.deb

########################################################################################################################

FROM node:18.13.0-bullseye-slim as build

ARG COMMIT_SHA=<not-specified>
ENV NODE_ENV=production

WORKDIR /build-dir

COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY . .

RUN echo "crud-service: $COMMIT_SHA" >> ./commit.sha

########################################################################################################################

# create a CRUD Service image that does not support automatic CSFLE
# and therefore it can be employed by everybody in any MongoDB product
FROM node:18.13.0-bullseye-slim as crud-service-no-encryption

RUN apt-get update \
    && apt-get install -f tini -y \
    && apt-get clean autoclean -y \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

LABEL maintainer="Mia Platform Core Team<core@mia-platform.eu>" \
    name="CRUD Service" \
    description="HTTP interface to perform CRUD operations on configured MongoDB collections" \
    eu.mia-platform.url="https://www.mia-platform.eu" \
    eu.mia-platform.version="6.3.0"

ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV HTTP_PORT=3000
ENV SERVICE_PREFIX=/
ENV EXPOSE_METRICS=true

EXPOSE ${HTTP_PORT}

WORKDIR /home/node/app

COPY --from=build /build-dir ./

HEALTHCHECK --start-period=5s CMD wget -qO- http://localhost:${HTTP_PORT}/-/healthz &> /dev/null || exit 1

USER node

ENTRYPOINT ["/usr/bin/tini", "--"]

CMD ./node_modules/.bin/lc39 ./index.js --port=${HTTP_PORT} --log-level=${LOG_LEVEL} --prefix=${SERVICE_PREFIX} --expose-metrics ${EXPOSE_METRICS}

########################################################################################################################

# extend previous stage to add the support to automatic MongoDB CSFLE feature,
# which can be leveraged by users adopting a MongoDB Atlas or MongoDB enterprise products
FROM crud-service-no-encryption as crud-service-with-encryption

USER root

COPY --from=base-with-encryption /cryptd /cryptd

RUN apt-get update \
    && apt-get install -f /cryptd/mongocryptd.deb /cryptd/libmongocrypt0.deb /cryptd/libmongocrypt-dev.deb -y \
    && apt-get clean autoclean -y \
    && apt-get autoremove -y \
    && rm -rf /cryptd \
    && rm -rf /var/lib/apt/lists/*

USER node
