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

const { test } = require('node:test')
const path = require('path')
const abstractLogger = require('abstract-logging')
const mongodb = require('mongodb')
const mock = require('mock-require')

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

test('Data keygen tests', async t => {
  const mongoClient = await mongodb.MongoClient.connect(mongoURL)

  t.beforeEach(async() => {
    try {
      await mongoClient.db('default').dropDatabase()
    } catch (error) { /* NOOP */ }
  })

  t.after(async() => mongoClient.close())

  t.test('Key correctly created', async t => {
    const collectionName = 'testCollection'
    const { dataKeysId: generatedKeyId } = await dataKeygen(buildFastifyInstance(), [{
      name: collectionName,
      encryption: { enabled: true },
    }])

    const retrievedKey = await mongoClient.db('default').collection('ns')
      .findOne({ keyAltNames: { $all: [collectionName] } })

    t.assert.strictEqual(generatedKeyId[collectionName].toString(), retrievedKey._id.toString())
  })

  t.test('Key correctly retrieved', async t => {
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

    t.assert.strictEqual(retrievedKey[collectionName], keyToRetrieve)
  })

  t.test('Throws if error happen', async t => {
    const collectionName = 'testCollection'
    mock('mongodb', {
      ...mongodb,
      ClientEncryption: clientEncryptionMock,
    })
    t.after(() => mock.stopAll())
    const dataKeygenMock = mock.reRequire('../../../lib/mongo/mongo-data-keygen')

    const errorMessage = { message: 'Unable to retrieve required data key for testCollection' }

    await t.assert.rejects(dataKeygenMock(
      buildFastifyInstance(),
      [
        { name: collectionName, encryption: { enabled: true } },
      ]
    ), errorMessage)
  })

  t.test('Empty map for missing configuration', async t => {
    const fastifyInstance = { config: { MONGODB_URL: mongoURL } }
    const { dataKeysId: retrievedKey } = await dataKeygen(
      fastifyInstance,
      [{ name: 'test', encryption: { enabled: true } }]
    )

    t.assert.strictEqual(Object.keys(retrievedKey).length, 0)
  })

  t.test('Key correctly created and retrieved', async t => {
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

    t.assert.strictEqual(generatedKeyId[retrievedCollection].toString(), retrievedKey._id.toString())
    t.assert.strictEqual(generatedKeyId[createdCollection], '123')
  })

  t.test('Key not generated for disabled collection', async t => {
    const collectionName = 'testCollection'
    const { dataKeysId: generatedKeyId } = await dataKeygen(
      buildFastifyInstance(),
      [
        { name: collectionName, encryption: { enabled: false } },
      ]
    )

    t.assert.ok(!(generatedKeyId[collectionName]))
  })
})
