FROM node:20.17.0-bookworm-slim AS base-with-encryption

WORKDIR /cryptd

RUN apt-get update && apt-get install curl -y
RUN curl https://downloads.mongodb.com/linux/mongo_crypt_shared_v1-linux-x86_64-enterprise-debian12-7.0.12.tgz | tar -xz

########################################################################################################################

FROM node:20.17.0-bookworm-slim AS build

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
FROM node:20.17.0-bookworm-slim AS crud-service-no-encryption

# note: zlib can be removed once node image version is updated
RUN apt-get update \
    && apt-get install -f tini zlib1g -y \
    && apt-get clean autoclean -y \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

LABEL maintainer="Mia Platform Core Team<core@mia-platform.eu>" \
    name="CRUD Service" \
    description="HTTP interface to perform CRUD operations on configured MongoDB collections" \
    eu.mia-platform.url="https://www.mia-platform.eu" \
    eu.mia-platform.version="7.2.0"

ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV HTTP_PORT=3000
ENV SERVICE_PREFIX=/
ENV EXPOSE_METRICS=true
ENV ENABLE_TRACING=false

EXPOSE ${HTTP_PORT}

WORKDIR /home/node/app

COPY --from=build /build-dir ./

HEALTHCHECK --start-period=5s CMD wget -qO- http://localhost:${HTTP_PORT}/-/healthz &> /dev/null || exit 1

USER node

ENTRYPOINT ["/usr/bin/tini", "--"]

CMD ./node_modules/.bin/lc39 ./index.js --port=${HTTP_PORT} --log-level=${LOG_LEVEL} --prefix=${SERVICE_PREFIX} --expose-metrics ${EXPOSE_METRICS} --enable-tracing=${ENABLE_TRACING}

########################################################################################################################

# extend previous stage to add the support to automatic MongoDB CSFLE feature,
# which can be leveraged by users adopting a MongoDB Atlas or MongoDB enterprise products
FROM crud-service-no-encryption AS crud-service-with-encryption

USER node

ENV CRYPT_SHARED_LIB_PATH=/cryptd/mongo_crypt_v1.so

COPY --from=base-with-encryption /cryptd/lib/mongo_crypt_v1.so /cryptd/mongo_crypt_v1.so