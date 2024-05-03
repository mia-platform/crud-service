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
const { MongoClient, ObjectId } = require('mongodb')

const { STATES } = require('../lib/consts')
const CrudService = require('../lib/CrudService')

const {
  publicFixtures,
  draftFixture,
  clearCollectionAndInsertFixtures,
  getMongoDatabaseName,
  getMongoURL,
  BOOKS_COLLECTION_NAME,
} = require('./utils')

const [firstPublicFixture] = publicFixtures
const OBJECT_ID = firstPublicFixture._id
const DEFAULT_PROJECTION = { _id: 1 }

const context = {
  log: abstractLogger,
  userId: 'my-user-id',
  now: new Date('2018-02-08'),
}

tap.test('findById', async t => {
  const databaseName = getMongoDatabaseName()
  const mongoURL = getMongoURL(databaseName)

  const client = await MongoClient.connect(mongoURL)
  const database = client.db(databaseName)
  const collection = database.collection(BOOKS_COLLECTION_NAME)

  await clearCollectionAndInsertFixtures(collection)

  t.teardown(async() => {
    await database.dropDatabase()
    await client.close()
  })

  const crudService = new CrudService(collection, STATES.PUBLIC)

  t.test('without query', async t => {
    t.plan(1)

    const doc = await crudService.findById(context, OBJECT_ID, {}, DEFAULT_PROJECTION)

    t.test('should return the document', t => {
      t.plan(1)
      t.strictSame(doc, { _id: OBJECT_ID })
    })
  })

  t.test('with unexistent id', async t => {
    t.plan(1)

    const doc = await crudService.findById(context, 'foo bar', {}, DEFAULT_PROJECTION)

    t.test('should return null', t => {
      t.plan(1)
      t.strictSame(doc, null)
    })
  })

  t.test('with query', t => {
    t.test('with matching query ', async t => {
      t.plan(1)

      const doc = await crudService.findById(
        context,
        OBJECT_ID,
        { price: { $gt: 20 } },
        DEFAULT_PROJECTION
      )

      t.test('should return the document', t => {
        t.plan(1)
        t.strictSame(doc, { _id: OBJECT_ID })
      })
    })

    t.test('with non-matching query', async t => {
      t.plan(1)

      const doc = await crudService.findById(
        context,
        OBJECT_ID, { price: { $lt: 20 } }, DEFAULT_PROJECTION)

      t.test('should return null', t => {
        t.plan(1)
        t.strictSame(doc, null)
      })
    })

    t.test('with a different _id in the query', async t => {
      t.plan(1)

      const doc = await crudService.findById(
        context,
        OBJECT_ID,
        { _id: ObjectId.createFromHexString('bbbbbbbbbbbbbbbbbbbbbbbb') },
        DEFAULT_PROJECTION
      )

      t.test('should return null', t => {
        t.plan(1)
        t.strictSame(doc, null)
      })
    })

    t.end()
  })

  t.test('projection', t => {
    t.test('with a projection', async t => {
      t.plan(1)

      const doc = await crudService.findById(
        context,
        OBJECT_ID, {}, { name: 1, isbn: 1 })

      t.test('should return the correct fields', t => {
        t.plan(1)
        t.strictSame(doc, {
          _id: OBJECT_ID,
          name: 'Ulysses',
          isbn: 'fake isbn 1',
        })
      })
    })

    t.end()
  })

  t.test('__STATE__', t => {
    t.test('with a document in draft', async t => {
      t.plan(1)

      const doc = await crudService.findById(
        context, draftFixture._id, {}, DEFAULT_PROJECTION
      )

      t.test('should return null', t => {
        t.plan(1)
        t.strictSame(doc, null)
      })
    })

    t.test('with a document in draft and requesting only draft', async t => {
      t.plan(1)

      const doc = await crudService.findById(
        context,
        draftFixture._id,
        {},
        DEFAULT_PROJECTION,
        [STATES.DRAFT]
      )

      t.test('should return the document', t => {
        t.plan(1)
        t.strictSame(doc, { _id: draftFixture._id })
      })
    })

    t.test('with a document in draft and requesting only draft and matching query', async t => {
      t.plan(1)
      const matchingQuery = { price: { $gt: 0 } }

      const doc = await crudService.findById(
        context,
        draftFixture._id,
        matchingQuery,
        DEFAULT_PROJECTION,
        [STATES.DRAFT]
      )

      t.test('should return the document', t => {
        t.plan(1)
        t.strictSame(doc, { _id: draftFixture._id })
      })
    })

    t.test('with a document in draft and requesting only draft and non-matching query', async t => {
      t.plan(1)
      const nonMatchingQuery = { price: { $lt: 0 } }

      const doc = await crudService.findById(
        context,
        draftFixture._id,
        nonMatchingQuery,
        DEFAULT_PROJECTION,
        [STATES.DRAFT]
      )

      t.test('should return null', t => {
        t.plan(1)
        t.strictSame(doc, null)
      })
    })

    t.end()
  })

  t.end()
})
