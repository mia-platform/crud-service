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

const { MongoClient } = require('mongodb')
const { ClientEncryption } = require('mongodb-client-encryption')
const { JSONPath } = require('jsonpath-plus')

const generateEncryptionConfig = require('./mongo-crypt-factory')
const retrieveKeyRing = require('./mongo-keyring-factory')

const createPlainMongoClient = ({ config }) => {
  const { MONGODB_URL } = config
  return MongoClient.connect(MONGODB_URL)
}

const retrieveKeyAltName = (collectionName) => ['crud-service', collectionName]

const retrieveExistingDataKey = async({ config, log }, mongoClient, collectionName) => {
  const [keyVaultDatabase, keyVaultCollection] = config.KEY_VAULT_NAMESPACE.split('.')
  const keyAltNames = retrieveKeyAltName(collectionName)
  log.trace(keyAltNames, 'Trying to retrieve existing data key with these alt names')
  return mongoClient.db(keyVaultDatabase).collection(keyVaultCollection)
    .findOne({ keyAltNames: { $all: keyAltNames } })
}

const generateNewDataKey = async({ config, log }, encryptionClient, mongoClient, collectionName) => {
  const { KMS_PROVIDER } = config
  await encryptionClient.createDataKey(KMS_PROVIDER, {
    keyAltNames: retrieveKeyAltName(collectionName),
    ...retrieveKeyRing({ config }),
  })
  log.trace('Data key created correctly')
  return retrieveExistingDataKey({ config, log }, mongoClient, collectionName)
}

const manageDataKeyRetrieve = async({ config, log }, encryptionClient, mongoClient, collectionName) => {
  let dataKeyId
  try {
    const existingDataKey = await retrieveExistingDataKey({ config, log }, mongoClient, collectionName)
    log.trace(existingDataKey, 'Retrieved existing data key')
    const dataKey = existingDataKey
      || await generateNewDataKey({ config, log }, encryptionClient, mongoClient, collectionName)
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
        collectionName
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

module.exports = retrieveDataKeyId
