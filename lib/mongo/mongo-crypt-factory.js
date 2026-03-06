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

/**
 * Resolve the KEY_VAULT_NAMESPACE template for a given scope.
 * In multi-db mode, KEY_VAULT_NAMESPACE may contain a {{scope}} placeholder
 * (e.g. "myapp-{{scope}}.keyVaultCollection"). This function replaces
 * the placeholder with the actual scope name.
 *
 * @param {string} keyVaultNamespace - the KEY_VAULT_NAMESPACE value (may contain {{scope}})
 * @param {string} [scope] - the scope to substitute; if omitted, returns as-is
 * @returns {string} resolved namespace
 */
const resolveKeyVaultNamespace = (keyVaultNamespace, scope) => {
  if (!scope) { return keyVaultNamespace }
  return keyVaultNamespace.replace(/\{\{scope\}\}/g, scope)
}

const enrichConfiguration = ({ config }, kmsProviders, schemaMap, keyVaultNamespaceOverride) => {
  const { KEY_VAULT_NAMESPACE, CRYPT_SHARED_LIB_PATH } = config
  const encryptionConfig = {
    keyVaultNamespace: keyVaultNamespaceOverride || KEY_VAULT_NAMESPACE,
    kmsProviders,
    extraOptions: {
      cryptSharedLibPath: CRYPT_SHARED_LIB_PATH,
    },
  }
  if (schemaMap) { encryptionConfig.schemaMap = schemaMap }
  return encryptionConfig
}

/**
 * Resolve the KMS providers object from fastify config.
 * Returns undefined if KMS_PROVIDER is not configured.
 *
 * @param {object} fastify - Fastify instance
 * @returns {object|undefined} kmsProviders
 */
function resolveKmsProviders(fastify) {
  const { KMS_PROVIDER } = fastify.config
  const factory = encryptConfigMap[KMS_PROVIDER]
  return factory ? factory(fastify) : undefined
}

function generateEncryptionConfig(fastify, schemaMap) {
  const kmsProviders = resolveKmsProviders(fastify)
  if (kmsProviders) {
    // In multi-db mode, KEY_VAULT_NAMESPACE may contain a {{scope}} placeholder.
    // The standard (non-multidb) path still registers a MongoClient against
    // DEFAULT_SCOPE, so resolve the placeholder here to avoid creating a
    // literal "crud-{{scope}}" database.
    const { KEY_VAULT_NAMESPACE, DEFAULT_SCOPE } = fastify.config
    const resolvedNamespace = resolveKeyVaultNamespace(KEY_VAULT_NAMESPACE, DEFAULT_SCOPE)
    return enrichConfiguration(fastify, kmsProviders, schemaMap, resolvedNamespace)
  }
}

/**
 * Generate encryption config for a specific multi-db scope.
 *
 * @param {object} fastify - Fastify instance
 * @param {string} scope - the scope name
 * @param {object} [schemaMap] - optional schema map for autoEncryption
 * @returns {object|undefined} autoEncryption config, or undefined if encryption is not enabled
 */
function generateEncryptionConfigForScope(fastify, scope, schemaMap) {
  const kmsProviders = resolveKmsProviders(fastify)
  if (!kmsProviders) { return undefined }

  const { KEY_VAULT_NAMESPACE } = fastify.config
  const resolvedNamespace = resolveKeyVaultNamespace(KEY_VAULT_NAMESPACE, scope)
  return enrichConfiguration(fastify, kmsProviders, schemaMap, resolvedNamespace)
}

module.exports = generateEncryptionConfig
module.exports.generateEncryptionConfig = generateEncryptionConfig
module.exports.generateEncryptionConfigForScope = generateEncryptionConfigForScope
module.exports.resolveKmsProviders = resolveKmsProviders
module.exports.resolveKeyVaultNamespace = resolveKeyVaultNamespace
