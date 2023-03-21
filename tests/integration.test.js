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
const lc39 = require('@mia-platform/lc39')

const { MongoClient } = require('mongodb')

const {
  getMongoDatabaseName,
  getMongoURL,
  BOOKS_COLLECTION_NAME,
  clearCollectionAndInsertFixtures,
} = require('./utils')

const animalsFixtures = require('./fixtures/animals')

const COLLECTION_DEFINITION_FOLDER = path.join(__dirname, 'collectionDefinitions')
const VIEWS_DEFINITION_FOLDER = path.join(__dirname, 'viewsDefinitions')

tap.test('integration', async t => {
  const databaseName = getMongoDatabaseName()
  const mongoURL = getMongoURL(databaseName)

  const client = await MongoClient.connect(mongoURL)
  const database = client.db(databaseName)
  const collection = database.collection(BOOKS_COLLECTION_NAME)
  await clearCollectionAndInsertFixtures(collection)

  const fastify = await lc39('./index.js', {
    envVariables: {
      MONGODB_URL: mongoURL,
      COLLECTION_DEFINITION_FOLDER,
      USER_ID_HEADER_KEY: 'userid',
      VIEWS_DEFINITION_FOLDER,
    },
    logLevel: 'silent',
  })

  t.teardown(async() => {
    await database.dropDatabase()
    await client.close()
    await fastify.close()
  })

  t.test('book is up', async t => {
    t.plan(1)

    const response = await fastify.inject({
      method: 'GET',
      url: '/books-endpoint/',
    })

    t.strictSame(response.statusCode, 200)
  })

  t.test('book second internal endpoint is up', async t => {
    t.plan(1)

    const response = await fastify.inject({
      method: 'GET',
      url: '/internal/books-endpoint/',
    })

    t.strictSame(response.statusCode, 200)
  })

  t.test('car is up', async t => {
    t.plan(1)

    const response = await fastify.inject({
      method: 'GET',
      url: '/cars-endpoint/',
    })

    t.strictSame(response.statusCode, 200)
  })

  t.end()
})

tap.test('service without collections configured not throw', async t => {
  t.plan(1)

  const databaseName = getMongoDatabaseName()
  const mongoURL = getMongoURL(databaseName)
  const client = await MongoClient.connect(mongoURL)

  const fastify = await lc39('./index.js', {
    envVariables: {
      MONGODB_URL: mongoURL,
      COLLECTION_DEFINITION_FOLDER: path.join(__dirname, 'emptyCollectionDefinitions'),
      VIEWS_DEFINITION_FOLDER: path.join(__dirname, 'emptyViewsDefinitions'),
      USER_ID_HEADER_KEY: 'userid',
    },
    logLevel: 'silent',
  })

  t.teardown(async() => {
    await client.close()
    await fastify.close()
  })

  t.ok(true)
})

tap.test('views integration', async t => {
  const databaseName = getMongoDatabaseName()
  const mongoURL = getMongoURL(databaseName)
  const client = await MongoClient.connect(mongoURL)

  const database = client.db(databaseName)

  const animalsCollection = database.collection('animals')
  const felinesCollection = database.collection('felines')
  try {
    await animalsCollection.drop()
    await felinesCollection.drop()
  } catch (error) { /* ignore errors raised while removing records from collection */ }

  await animalsCollection.insertMany(animalsFixtures)

  const fastify = await lc39('./index.js', {
    envVariables: {
      MONGODB_URL: mongoURL,
      COLLECTION_DEFINITION_FOLDER,
      VIEWS_DEFINITION_FOLDER,
      USER_ID_HEADER_KEY: 'userid',
    },
    logLevel: 'silent',
  })

  t.teardown(async() => {
    await felinesCollection.drop()
    await client.close()
    await fastify.close()
  })

  t.test('animal is up', async t => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/animals-endpoint/',
    })

    t.strictSame(response.statusCode, 200)

    const [firstAnimal] = JSON.parse(response.payload)
    t.strictSame(firstAnimal.name, 'fufi')
    t.strictSame(firstAnimal.family, 'canines')
    t.strictSame(firstAnimal.specie, 'dog')
    t.strictSame(firstAnimal.weight, 14)
  })

  t.test('felines view is up', async t => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/felines-endpoint/',
    })

    t.strictSame(response.statusCode, 200)
    const [firstFeline] = JSON.parse(response.payload)
    t.strictSame(firstFeline.name, 'oliver')
    t.strictSame(firstFeline.weight, 6)
  })

  t.test('felines view does not expose DELETE route', async t => {
    const response = await fastify.inject({
      method: 'DELETE',
      url: '/felines-endpoint/',
    })

    t.strictSame(response.statusCode, 404)
    t.strictSame(JSON.parse(response.payload), { error: 'not found' })
  })

  t.test('felines view does not expose POST route', async t => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/felines-endpoint/',
      payload: {
        name: 'luna',
        weight: 5,
      },
    })

    t.strictSame(response.statusCode, 404)
    t.strictSame(JSON.parse(response.payload), { error: 'not found' })
  })

  t.test('felines view does not expose PATCH route', async t => {
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/felines-endpoint/',
      payload: {
        $set: {
          name: 'oliver',
          weight: 7,
        },
      },
    })

    t.strictSame(response.statusCode, 404)
    t.strictSame(JSON.parse(response.payload), { error: 'not found' })
  })

  t.test('canines view integrated in collection definition is up', async t => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/canines-endpoint/',
    })

    t.strictSame(response.statusCode, 200)
    const [firstFeline] = JSON.parse(response.payload)
    t.strictSame(firstFeline.name, 'fufi')
    t.strictSame(firstFeline.weight, 14)
  })

  t.test('canines view integrated in collection definition does not expose DELETE route', async t => {
    const response = await fastify.inject({
      method: 'DELETE',
      url: '/canines-endpoint/',
    })

    t.strictSame(response.statusCode, 404)
    t.strictSame(JSON.parse(response.payload), { error: 'not found' })
  })

  t.test('canines view integrated in collection definition does not expose POST route', async t => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/canines-endpoint/',
      payload: {
        name: 'lucky',
        weight: 16,
      },
    })

    t.strictSame(response.statusCode, 404)
    t.strictSame(JSON.parse(response.payload), { error: 'not found' })
  })

  t.test('canines view integrated in collection definition does not expose PATCH route', async t => {
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/canines-endpoint/',
      payload: {
        $set: {
          name: 'fufi',
          weight: 15,
        },
      },
    })

    t.strictSame(response.statusCode, 404)
    t.strictSame(JSON.parse(response.payload), { error: 'not found' })
  })

  t.end()
})

tap.test('encryption integration', async t => {
  const databaseName = getMongoDatabaseName()
  const mongoURL = getMongoURL(databaseName)

  const client = await MongoClient.connect(mongoURL)
  const database = client.db(databaseName)

  const isEncryptionSupported = process.env.MONGO_VERSION >= '4.2'

  if (!isEncryptionSupported) {
    t.comment('For this mongo version encryption is not supported, I will skip this test')
    await client.close()
    t.end()
    return
  }

  const collection = database.collection('books-encrypted')
  try {
    await collection.drop()
  } catch (error) { /* ignore errors raised while removing records from collection */ }

  const fastify = await lc39('./index.js', {
    envVariables: {
      MONGODB_URL: mongoURL,
      COLLECTION_DEFINITION_FOLDER,
      USER_ID_HEADER_KEY: 'userid',
      KMS_PROVIDER: 'local',
      LOCAL_MASTER_KEY_PATH: path.join(__dirname, '/lib/mongo/test-master-key.txt'),
      KEY_VAULT_NAMESPACE: 'encryption.ns',
    },
    logLevel: 'silent',
  })

  t.teardown(async() => {
    await client.close()
    await fastify.close()
  })

  t.test('book is up', async t => {
    t.plan(1)

    const response = await fastify.inject({
      method: 'GET',
      url: '/books-endpoint/',
    })

    t.strictSame(response.statusCode, 200)
  })

  t.test('book encrypted is up', async t => {
    t.plan(1)

    const response = await fastify.inject({
      method: 'GET',
      url: '/books-encrypted-endpoint/',
    })

    t.strictSame(response.statusCode, 200)
  })

  t.test('car is up', async t => {
    t.plan(1)

    const response = await fastify.inject({
      method: 'GET',
      url: '/cars-endpoint/',
    })

    t.strictSame(response.statusCode, 200)
  })

  t.test('books-encrypted is really encrypted', async t => {
    const postResponse = await fastify.inject({
      method: 'POST',
      url: '/books-encrypted-endpoint/',
      payload: {
        name: 'Crypted name',
        isbn: 'Crypted isbn',
        author: 'Uncrypted author',
        metadata: {
          somethingString: 'String something',
          somethingNumber: 3,
          somethingObject: {
            childNumber: 3,
          },
        },
      },
    })

    t.strictSame(postResponse.statusCode, 200)

    const book = await collection.findOne()

    t.not(book.name, 'Crypted name')
    t.not(book.isbn, 'Crypted isbn')
    t.equal(book.author, 'Uncrypted author')
    t.not(book.metadata.somethingString, 'String something')
    t.not(book.metadata.somethingObject.childNumber, 3)
    t.equal(book.metadata.somethingNumber, 3)

    const getResponse = await fastify.inject({
      method: 'GET',
      url: '/books-encrypted-endpoint/',
    })

    const [responsePayload] = JSON.parse(getResponse.payload)

    t.strictSame(getResponse.statusCode, 200)
    t.equal(responsePayload.name, 'Crypted name')
    t.equal(responsePayload.isbn, 'Crypted isbn')
    t.equal(responsePayload.author, 'Uncrypted author')
    t.equal(responsePayload.metadata.somethingString, 'String something')
    t.equal(responsePayload.metadata.somethingObject.childNumber, 3)
    t.equal(responsePayload.metadata.somethingNumber, 3)

    t.end()
  })
})

tap.test('ALLOW_DISK_USE_IN_QUERIES integration', async t => {
  t.test('Should work correctly if set to true (mongo >= 4.4 only)', async t => {
    if (process.env.MONGO_VERSION < '4.4') {
      t.skip()
      return
    }

    const databaseName = getMongoDatabaseName()
    const mongoURL = getMongoURL(databaseName)
    const client = await MongoClient.connect(mongoURL)

    const database = client.db(databaseName)
    const collection = database.collection(BOOKS_COLLECTION_NAME)
    await clearCollectionAndInsertFixtures(collection)

    const fastify = await lc39('./index.js', {
      envVariables: {
        MONGODB_URL: mongoURL,
        COLLECTION_DEFINITION_FOLDER,
        USER_ID_HEADER_KEY: 'userid',
        VIEWS_DEFINITION_FOLDER,
        ALLOW_DISK_USE_IN_QUERIES: 'true',
      },
      logLevel: 'silent',
    })

    // The following test is based instead on the CrudService class implementation
    // Being bound to that, it's not safe, but it's better than a mock imho
    t.match(fastify.models['books-endpoint'].crudService, { _options: { allowDiskUse: true } })

    t.teardown(async() => {
      await client.close()
      await fastify.close()
    })

    t.test('GET is successful and crudService uses allowDiskUse: true', async t => {
      t.plan(2)

      // Instrumentation the service Mongo Client
      const commandStartedEvents = []
      fastify.mongo.client.on('commandStarted', event => commandStartedEvents.push(event))

      // TODO we should find a better way to do this. This is NOT safe, since it's based on library internal logics
      // Re-connecting service client enabling commands monitoring
      await fastify.mongo.client.close()
      fastify.mongo.client.monitorCommands = true // eslint-disable-line require-atomic-updates
      await fastify.mongo.client.connect()

      const response = await fastify.inject({
        method: 'GET',
        url: '/books-endpoint/',
      })

      t.strictSame(response.statusCode, 200)
      t.match(commandStartedEvents, [{ commandName: 'find', command: { allowDiskUse: true } }])
    })
  })

  t.test('Should not set anything if env var is not set', async t => {
    const databaseName = getMongoDatabaseName()
    const mongoURL = getMongoURL(databaseName)

    const client = await MongoClient.connect(mongoURL)
    const database = client.db(databaseName)
    const collection = database.collection(BOOKS_COLLECTION_NAME)

    await clearCollectionAndInsertFixtures(collection)
    await client.close()

    const fastify = await lc39('./index.js', {
      envVariables: {
        MONGODB_URL: mongoURL,
        COLLECTION_DEFINITION_FOLDER,
        USER_ID_HEADER_KEY: 'userid',
        VIEWS_DEFINITION_FOLDER,
      },
      logLevel: 'error',
    })

    // The following test is based instead on the CrudService class implementation
    // Being bound to that, it's not safe, but it's better than a mock imho
    // eslint-disable-next-line no-underscore-dangle
    t.equal(fastify.models['books-endpoint'].crudService._options.allowDiskUse, undefined)

    t.teardown(() => fastify.close())

    t.test('GET is successful', async t => {
      t.plan(1)

      const response = await fastify.inject({
        method: 'GET',
        url: '/books-endpoint/',
      })

      t.strictSame(response.statusCode, 200)
    })
  })
})
