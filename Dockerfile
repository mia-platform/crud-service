# syntax=docker/dockerfile:1
FROM docker.io/curlimages/curl:8.11.1@sha256:c1fe1679c34d9784c1b0d1e5f62ac0a79fca01fb6377cdd33e90473c6f9f9a69 AS crypt-lib

ARG TARGETARCH

WORKDIR /cryptd

ARG CRYPTD_VERSION=7.0.15
ARG CRYPTD_OS=debian12

# debian doesn't suppport arm architecture for now, if we switch to ubuntu we can uncomment the arm bit
RUN case "${TARGETARCH}" in \
    'amd64') \
      cryptd_arch="x86_64"; \
    ;; \
    # 'arm64') \
    #   cryptd_arch="aarch64"; \
    # ;; \
    *) echo >&2 "error: unsupported architecture ($TARGETARCH)"; exit 1; ;; \
    esac; \
    curl -fsSL "https://downloads.mongodb.com/linux/mongo_crypt_shared_v1-linux-${cryptd_arch}-enterprise-${CRYPTD_OS}-${CRYPTD_VERSION}.tgz" -o "/tmp/mongo_crypt_shared.tgz" \
    && tar -xvf "/tmp/mongo_crypt_shared.tgz" --no-same-permissions --no-same-owner -C "/cryptd"

########################################################################################################################

FROM docker.io/library/node:23.5.0-bookworm-slim@sha256:682fa023644199a084456630af5a29cd76e42d26b3355f1d9cd65ae00e49951e AS build

ENV NODE_ENV=production

WORKDIR /build-dir

COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY . .

########################################################################################################################

# create a CRUD Service image that does not support automatic CSFLE
# and therefore it can be employed by everybody in any MongoDB product
FROM docker.io/library/node:23.5.0-bookworm-slim@sha256:682fa023644199a084456630af5a29cd76e42d26b3355f1d9cd65ae00e49951e AS crud-service-no-encryption

ARG COMMIT_SHA
ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install --assume-yes --no-install-recommends \
    tini \
    && apt-get autoremove --assume-yes \
    && rm -rf /var/lib/apt/lists/*

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

CMD ./node_modules/.bin/lc39 ./index.js --port=${HTTP_PORT} --log-level=${LOG_LEVEL} --prefix=${SERVICE_PREFIX} --expose-metrics=${EXPOSE_METRICS} --enable-tracing=${ENABLE_TRACING}

########################################################################################################################

# extend previous stage to add the support to automatic MongoDB CSFLE feature,
# which can be leveraged by users adopting a MongoDB Atlas or MongoDB enterprise products
FROM crud-service-no-encryption AS crud-service-with-encryption

ENV CRYPT_SHARED_LIB_PATH=/cryptd/mongo_crypt_v1.so

COPY --from=crypt-lib /cryptd/lib/mongo_crypt_v1.so /cryptd/mongo_crypt_v1.so
