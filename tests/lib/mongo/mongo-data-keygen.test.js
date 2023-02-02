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

const tap = require('tap')
const path = require('path')
const abstractLogger = require('abstract-logging')
const { MongoClient } = require('mongodb')

const dataKeygen = require('../../../lib/mongo/mongo-data-keygen')

const mongoURL = process.env.MONGO_HOST ? `mongodb://${process.env.MONGO_HOST}/` : 'mongodb://localhost:27017/'

const buildFastifyInstance = (config) => ({
  config: {
    KEY_VAULT_NAMESPACE: 'default.ns',
    KMS_PROVIDER: 'local',
    MONGODB_URL: mongoURL,
    LOCAL_MASTER_KEY_PATH: path.join(__dirname, './test-master-key.txt'),
    ...config,
  },
  log: abstractLogger,
})

const clientEncryptionMock = class ClientEncryption {
  createDataKey() {
    throw new Error('Mocked error')
  }
}

tap.test('Data keygen tests', async t => {
  const mongoClient = await MongoClient.connect(mongoURL)

  t.beforeEach(async() => {
    try {
      await mongoClient.db('default').dropDatabase()
    } catch (error) { /* NOOP */ }
  })

  t.teardown(async() => mongoClient.close())

  t.test('Key correctly created', async assert => {
    const collectionName = 'testCollection'
    const { dataKeysId: generatedKeyId } = await dataKeygen(buildFastifyInstance(), [{
      name: collectionName,
      encryption: { enabled: true },
    }])

    const retrievedKey = await mongoClient.db('default').collection('ns')
      .findOne({ keyAltNames: { $all: [collectionName] } })

    assert.equal(generatedKeyId[collectionName].toString(), retrievedKey._id.toString())
    assert.end()
  })

  t.test('Key correctly retrieved', async assert => {
    const collectionName = 'testCollection'
    const keyToRetrieve = '123'

    await mongoClient.db('default').collection('ns')
      .insertOne({
        _id: keyToRetrieve,
        keyAltNames: ['crud-service', collectionName],
      })

    const { dataKeysId: retrievedKey } = await dataKeygen(
      buildFastifyInstance(),
      [
        { name: collectionName, encryption: { enabled: true } },
      ]
    )

    assert.equal(retrievedKey[collectionName], keyToRetrieve)
    assert.end()
  })

  t.test('Throws if error happen', async assert => {
    const collectionName = 'testCollection'
    const dataKeygenMock = assert.mock('../../../lib/mongo/mongo-data-keygen', {
      'mongodb-client-encryption': {
        ClientEncryption: clientEncryptionMock,
      },
    })

    const errorMessage = { message: 'Unable to retrieve required data key for testCollection' }

    assert.rejects(dataKeygenMock(
      buildFastifyInstance(),
      [
        { name: collectionName, encryption: { enabled: true } },
      ]
    ), errorMessage)
    assert.end()
  })

  t.test('Empty map for missing configuration', async assert => {
    const fastifyInstance = { config: { MONGODB_URL: mongoURL } }
    const { dataKeysId: retrievedKey } = await dataKeygen(
      fastifyInstance,
      [{ name: 'test', encryption: { enabled: true } }]
    )

    assert.equal(Object.keys(retrievedKey).length, 0)
    assert.end()
  })

  t.test('Key correctly created and retrieved', async assert => {
    const createdCollection = 'testCollection'
    const retrievedCollection = 'testCollection1'
    const keyToRetrieve = '123'

    await mongoClient.db('default').collection('ns')
      .insertOne({
        _id: keyToRetrieve,
        keyAltNames: ['crud-service', createdCollection],
      })

    const { dataKeysId: generatedKeyId } = await dataKeygen(
      buildFastifyInstance(),
      [
        { name: createdCollection, encryption: { enabled: true } },
        { name: retrievedCollection, encryption: { enabled: true } },
      ]
    )

    const retrievedKey = await mongoClient.db('default').collection('ns')
      .findOne({ keyAltNames: { $all: ['crud-service', retrievedCollection] } })

    assert.equal(generatedKeyId[retrievedCollection].toString(), retrievedKey._id.toString())
    assert.equal(generatedKeyId[createdCollection], '123')
    assert.end()
  })

  t.test('Key not generated for disabled collection', async assert => {
    const collectionName = 'testCollection'
    const { dataKeysId: generatedKeyId } = await dataKeygen(
      buildFastifyInstance(),
      [
        { name: collectionName, encryption: { enabled: false } },
      ]
    )

    assert.notOk(generatedKeyId[collectionName])
    assert.end()
  })

  t.end()
})
