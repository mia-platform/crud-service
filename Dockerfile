# syntax=docker/dockerfile:1
FROM docker.io/curlimages/curl:8.10.1@sha256:d9b4541e214bcd85196d6e92e2753ac6d0ea699f0af5741f8c6cccbfcf00ef4b AS crypt-lib

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

FROM docker.io/library/node:22.12.0-bookworm-slim@sha256:a4b757cd491c7f0b57f57951f35f4e85b7e1ad54dbffca4cf9af0725e1650cd8 AS build

ENV NODE_ENV=production

WORKDIR /build-dir

COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY . .

########################################################################################################################

# create a CRUD Service image that does not support automatic CSFLE
# and therefore it can be employed by everybody in any MongoDB product
FROM docker.io/library/node:22.12.0-bookworm-slim@sha256:a4b757cd491c7f0b57f57951f35f4e85b7e1ad54dbffca4cf9af0725e1650cd8 AS crud-service-no-encryption

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
