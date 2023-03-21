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
const abstractLogger = require('abstract-logging')
const { MongoClient } = require('mongodb')

const { STATES } = require('../lib/consts')
const CrudService = require('../lib/CrudService')

const {
  fixtures,
  publicFixtures,
  draftFixture,
  clearCollectionAndInsertFixtures,
  checkDocumentsInDatabase,
  getMongoDatabaseName,
  getMongoURL,
  BOOKS_COLLECTION_NAME,
} = require('./utils')

const context = {
  log: abstractLogger,
  userId: 'my-user-id',
  now: new Date('2018-02-08'),
}

tap.test('deleteById', async t => {
  const databaseName = getMongoDatabaseName()
  const mongoURL = getMongoURL(databaseName)

  const client = await MongoClient.connect(mongoURL)
  const database = client.db(databaseName)
  const collection = database.collection(BOOKS_COLLECTION_NAME)

  t.teardown(async() => {
    await database.dropDatabase()
    await client.close()
  })

  const crudService = new CrudService(collection, STATES.PUBLIC)

  const chosenDocId = publicFixtures[1]._id

  t.test('with only doc', async t => {
    t.plan(3)
    await clearCollectionAndInsertFixtures(collection)

    const ret = await crudService.deleteById(context, chosenDocId)

    t.test('should return the document', t => {
      t.plan(1)
      t.strictSame(ret, publicFixtures[1])
    })

    t.test('should remove the doc from the database', async t => {
      t.plan(1)
      const doc = await collection.findOne(context, { _id: chosenDocId })
      t.strictSame(doc, null)
    })

    checkDocumentsInDatabase(t, collection, [], fixtures.filter(d => d._id !== chosenDocId))
  })

  t.test('with doc and a matching query', async t => {
    t.plan(3)
    await clearCollectionAndInsertFixtures(collection)

    const matchingQuery = { price: { $gt: publicFixtures[1].price - 1 } }
    const ret = await crudService.deleteById(context, chosenDocId, matchingQuery)

    t.test('should return the document', t => {
      t.plan(1)
      t.strictSame(ret, publicFixtures[1])
    })

    t.test('should remove the doc from the database', async t => {
      t.plan(1)
      const doc = await collection.findOne({ _id: chosenDocId })
      t.strictSame(doc, null)
    })

    checkDocumentsInDatabase(t, collection, [], fixtures.filter(d => d._id !== chosenDocId))
  })

  t.test('with doc and a non-matching query', async t => {
    t.plan(2)
    await clearCollectionAndInsertFixtures(collection)

    const matchedQuery = { price: { $lt: publicFixtures[1].price - 1 } }
    const d = await crudService.deleteById(context, chosenDocId, matchedQuery)

    t.test('should return null', async t => {
      t.plan(1)
      t.strictSame(d, null)
    })

    checkDocumentsInDatabase(t, collection, [], fixtures)
  })

  t.test('in draft', async t => {
    t.plan(2)
    await clearCollectionAndInsertFixtures(collection)

    const d = await crudService.deleteById(context, draftFixture._id, {}, [STATES.DRAFT])

    t.test('should return the document', async t => {
      t.plan(1)
      t.strictSame(d, draftFixture)
    })

    checkDocumentsInDatabase(t, collection, [], fixtures.filter(d => d._id !== fixtures[4]._id))
  })

  t.test('in draft with matching query', async t => {
    t.plan(2)
    await clearCollectionAndInsertFixtures(collection)

    const matchingQuery = { price: { $gt: draftFixture.price - 1 } }
    const d = await crudService.deleteById(context, draftFixture._id, matchingQuery, [STATES.DRAFT])

    t.test('should return the document', async t => {
      t.plan(1)
      t.strictSame(d, draftFixture)
    })

    checkDocumentsInDatabase(t, collection, [], fixtures.filter(d => d._id !== draftFixture._id))
  })

  t.test('in draft with non-matching query', async t => {
    t.plan(2)
    await clearCollectionAndInsertFixtures(collection)

    const nonMatchingQuery = { price: { $lt: draftFixture.price - 1 } }
    const d = await crudService.deleteById(context, draftFixture._id, nonMatchingQuery, [STATES.DRAFT])

    t.test('should return null', async t => {
      t.plan(1)
      t.strictSame(d, null)
    })

    checkDocumentsInDatabase(t, collection, [], fixtures)
  })

  t.test('in draft or in trash with matching query', async t => {
    t.plan(2)
    await clearCollectionAndInsertFixtures(collection)

    const matchingQuery = { price: { $gt: draftFixture.price - 1 } }
    const d = await crudService.deleteById(context, draftFixture._id, matchingQuery, [STATES.DRAFT, STATES.TRASH])

    t.test('should return the document', async t => {
      t.plan(1)
      t.strictSame(d, draftFixture)
    })

    checkDocumentsInDatabase(t, collection, [], fixtures.filter(d => d._id !== draftFixture._id))
  })

  t.test('not in draft or in trash with matching query', async t => {
    t.plan(2)
    await clearCollectionAndInsertFixtures(collection)

    const matchingQuery = { price: { $gt: publicFixtures[1].price - 1 } }
    const d = await crudService.deleteById(context, chosenDocId, matchingQuery, [STATES.DRAFT, STATES.TRASH])

    t.test('should return null', async t => {
      t.plan(1)
      t.strictSame(d, null)
    })

    checkDocumentsInDatabase(t, collection, [], fixtures)
  })
})
