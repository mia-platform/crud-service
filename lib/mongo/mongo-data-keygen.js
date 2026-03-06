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

const { MongoClient, ClientEncryption } = require('mongodb')
const { JSONPath } = require('jsonpath-plus')

const { generateEncryptionConfig, generateEncryptionConfigForScope, resolveKeyVaultNamespace } = require('./mongo-crypt-factory')
const retrieveKeyRing = require('./mongo-keyring-factory')

const createPlainMongoClient = ({ config }) => {
  const { MONGODB_URL } = config
  return MongoClient.connect(MONGODB_URL)
}

// TODO: remove crud-service tag from alt names, since these should be unique + add unique index on keyAltNames
const retrieveKeyAltName = (collectionName) => ['crud-service', collectionName]

/**
 * Retrieve an existing data key from the key vault.
 *
 * @param {object} options - { config, log }
 * @param {object} mongoClient - connected MongoClient
 * @param {string} collectionName - target collection name
 * @param {string} [keyVaultNamespaceOverride] - if set, overrides config.KEY_VAULT_NAMESPACE
 * @returns {Promise<object|null>} existing data key document or null
 */
const retrieveExistingDataKey = async({ config, log }, mongoClient, collectionName, keyVaultNamespaceOverride) => {
  const namespace = keyVaultNamespaceOverride || config.KEY_VAULT_NAMESPACE
  const [keyVaultDatabase, keyVaultCollection] = namespace.split('.')
  const keyAltNames = retrieveKeyAltName(collectionName)
  log.trace(keyAltNames, 'Trying to retrieve existing data key with these alt names')
  return mongoClient.db(keyVaultDatabase).collection(keyVaultCollection)
    .findOne({ keyAltNames: { $all: keyAltNames } })
}

const generateNewDataKey = async(
  { config, log }, encryptionClient, mongoClient, collectionName, keyVaultNsOverride
) => {
  const { KMS_PROVIDER } = config
  await encryptionClient.createDataKey(KMS_PROVIDER, {
    keyAltNames: retrieveKeyAltName(collectionName),
    ...retrieveKeyRing({ config }),
  })
  log.trace('Data key created correctly')
  return retrieveExistingDataKey(
    { config, log }, mongoClient, collectionName, keyVaultNsOverride
  )
}

const manageDataKeyRetrieve = async(
  { config, log }, encryptionClient, mongoClient, collectionName, keyVaultNsOverride
) => {
  let dataKeyId
  try {
    const existingDataKey = await retrieveExistingDataKey(
      { config, log }, mongoClient, collectionName, keyVaultNsOverride
    )
    log.trace(existingDataKey, 'Retrieved existing data key')
    const dataKey = existingDataKey
      || await generateNewDataKey(
        { config, log }, encryptionClient, mongoClient, collectionName, keyVaultNsOverride
      )
    dataKeyId = dataKey._id

    log.trace(`I'll use this data key id: ${dataKeyId}`)
  } catch (error) {
    log.error({ error }, 'Unable to retrieve data key')
    throw new Error(`Unable to retrieve required data key for ${collectionName}`)
  }
  return dataKeyId
}

const hasEncryptionEnabled = encryption => encryption && encryption.enabled

const hasCollectionEncryptionEnabled = (collection) =>
  JSONPath({ path: '$..encryption', json: collection })
    .find(hasEncryptionEnabled) !== undefined

const retrieveDataKeyId = async(fastify, collections) => {
  const encryptionConfig = generateEncryptionConfig(fastify)
  const encryptedCollections = collections.filter(hasCollectionEncryptionEnabled)

  if (!encryptionConfig || encryptedCollections.length === 0) {
    return { dataKeysId: {} }
  }

  // Resolve KEY_VAULT_NAMESPACE for the standard path: in multi-db mode
  // it may contain {{scope}} which must be replaced with DEFAULT_SCOPE.
  const { KEY_VAULT_NAMESPACE, DEFAULT_SCOPE } = fastify.config
  const resolvedNamespace = resolveKeyVaultNamespace(KEY_VAULT_NAMESPACE, DEFAULT_SCOPE)

  const mongoClient = await createPlainMongoClient(fastify)
  const retrievedDataKeysId = {}
  let databaseName

  try {
    ({ databaseName } = mongoClient.db())
    const encryptionClient = new ClientEncryption(mongoClient, encryptionConfig)

    for (const collection of encryptedCollections) {
      const collectionName = collection.name
      // eslint-disable-next-line no-await-in-loop
      retrievedDataKeysId[collectionName] = await manageDataKeyRetrieve(
        fastify,
        encryptionClient,
        mongoClient,
        collectionName,
        resolvedNamespace
      )
    }
  } catch (error) {
    fastify.log.error({ cause: error }, 'failed to retrieve data key id')
    throw error
  } finally {
    await mongoClient.close()
  }
  return { databaseName, dataKeysId: retrievedDataKeysId }
}

/**
 * Retrieve data key IDs for a specific multi-db scope.
 *
 * Connects to the scope's MongoDB using the provided URL, resolves
 * KEY_VAULT_NAMESPACE with the scope placeholder, and retrieves/creates
 * data keys for each encrypted collection.
 *
 * @param {object} fastify - Fastify instance (for config, log)
 * @param {object[]} collections - collection definitions
 * @param {string} scope - multi-db scope name
 * @param {string} scopeMongoUrl - MongoDB connection URL for this scope
 * @returns {Promise<{ databaseName: string, dataKeysId: object }>}
 */
const retrieveDataKeyIdForScope = async(fastify, collections, scope, scopeMongoUrl) => {
  const encryptionConfig = generateEncryptionConfigForScope(fastify, scope)
  const encryptedCollections = collections.filter(hasCollectionEncryptionEnabled)

  if (!encryptionConfig || encryptedCollections.length === 0) {
    return { dataKeysId: {} }
  }

  const { KEY_VAULT_NAMESPACE } = fastify.config
  const resolvedNamespace = resolveKeyVaultNamespace(KEY_VAULT_NAMESPACE, scope)

  const mongoClient = await MongoClient.connect(scopeMongoUrl)
  const retrievedDataKeysId = {}
  let databaseName

  try {
    ({ databaseName } = mongoClient.db())
    const encryptionClient = new ClientEncryption(mongoClient, encryptionConfig)

    for (const collection of encryptedCollections) {
      const collectionName = collection.name
      // eslint-disable-next-line no-await-in-loop
      retrievedDataKeysId[collectionName] = await manageDataKeyRetrieve(
        fastify,
        encryptionClient,
        mongoClient,
        collectionName,
        resolvedNamespace
      )
    }
  } catch (error) {
    fastify.log.error({ cause: error, scope }, 'failed to retrieve data key id for scope')
    throw error
  } finally {
    await mongoClient.close()
  }
  return { databaseName, dataKeysId: retrievedDataKeysId }
}

module.exports = retrieveDataKeyId
module.exports.retrieveDataKeyId = retrieveDataKeyId
module.exports.retrieveDataKeyIdForScope = retrieveDataKeyIdForScope
module.exports.hasCollectionEncryptionEnabled = hasCollectionEncryptionEnabled
