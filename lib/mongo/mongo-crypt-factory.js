/*
 * Copyright 2023 Mia s.r.l.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict'

const { readFileSync } = require('fs')

const { readAndStripPrivateKeyContent } = require('../gcpKeyStripper')

const encryptConfigMap = {
  gcp: ({ config }) => {
    const { KMS_GCP_EMAIL, KMS_GCP_PRIVATE_KEY_PATH } = config
    return {
      gcp: {
        email: KMS_GCP_EMAIL,
        privateKey: readAndStripPrivateKeyContent(KMS_GCP_PRIVATE_KEY_PATH),
      },
    }
  },
  local: ({ config }) => {
    const { LOCAL_MASTER_KEY_PATH } = config
    return {
      local: {
        key: readFileSync(LOCAL_MASTER_KEY_PATH),
      },
    }
  },
}

const enrichConfiguration = ({ config }, kmsProviders, schemaMap) => {
  const { KEY_VAULT_NAMESPACE } = config
  const encryptionConfig = {
    keyVaultNamespace: KEY_VAULT_NAMESPACE,
    kmsProviders,
    extraOptions: {
      mongocryptdSpawnArgs: ['--logpath=/tmp/mongocryptd.log', '--pidfilepath=/tmp/mongocryptd.pid'],
    },
  }
  if (schemaMap) { encryptionConfig.schemaMap = schemaMap }
  return encryptionConfig
}

function generateEncryptionConfig(fastify, schemaMap) {
  const { KMS_PROVIDER } = fastify.config
  const factory = encryptConfigMap[KMS_PROVIDER]
  if (factory) {
    const kmsProvider = factory(fastify)
    return enrichConfiguration(fastify, kmsProvider, schemaMap)
  }
}

module.exports = generateEncryptionConfig
