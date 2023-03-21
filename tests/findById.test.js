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
  RAW_PROJECTION_PLAIN_INCLUSIVE,
  RAW_PROJECTION_PLAIN_EXCLUSIVE,
} = require('./utils')

const [firstPublicFixture] = publicFixtures
const OBJECT_ID = firstPublicFixture._id
const { attachments, price, isbn, ...docWithExcludedFields } = firstPublicFixture

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

    const doc = await crudService.findById(context, OBJECT_ID)

    t.test('should return the document', t => {
      t.plan(1)
      t.strictSame(doc, { _id: OBJECT_ID })
    })
  })

  t.test('with unexistent id', async t => {
    t.plan(1)

    const doc = await crudService.findById(context, 'foo bar')

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
        { price: { $gt: 20 } }
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
        OBJECT_ID, { price: { $lt: 20 } })

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
        { _id: ObjectId.createFromHexString('bbbbbbbbbbbbbbbbbbbbbbbb') }
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
        OBJECT_ID, {}, ['name', 'isbn'])

      t.test('should return the correct fields', t => {
        t.plan(1)
        t.strictSame(doc, {
          _id: OBJECT_ID,
          name: 'Ulysses',
          isbn: 'fake isbn 1',
        })
      })
    })

    t.test('with an empty projection', async t => {
      t.plan(1)

      const doc = await crudService.findById(
        context,
        OBJECT_ID,
        {},
        []
      )

      t.test('only _id should be returned', t => {
        t.plan(1)
        t.strictSame(doc, { _id: OBJECT_ID })
      })
    })

    t.end()
  })

  t.test('__STATE__', t => {
    t.test('with a document in draft', async t => {
      t.plan(1)

      const doc = await crudService.findById(
        context,
        draftFixture._id)

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
        [],
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
        [],
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
        [],
        [STATES.DRAFT]
      )

      t.test('should return null', t => {
        t.plan(1)
        t.strictSame(doc, null)
      })
    })

    t.end()
  })

  t.test('with raw projection', t => {
    t.test('should merge with existing _p projection', async t => {
      t.plan(1)

      const doc = await crudService.findById(
        context,
        OBJECT_ID, {}, ['name', 'isbn', RAW_PROJECTION_PLAIN_INCLUSIVE])

      t.test('should return the correct fields', t => {
        t.plan(1)
        t.strictSame(doc, {
          _id: OBJECT_ID,
          name: 'Ulysses',
          price,
          isbn,
          attachments,
        })
      })
    })

    t.test('with an empty projection', async t => {
      t.plan(1)

      const doc = await crudService.findById(
        context,
        OBJECT_ID,
        {},
        [RAW_PROJECTION_PLAIN_INCLUSIVE]
      )

      t.test('should return included fields', t => {
        t.plan(1)
        t.strictSame(doc, {
          _id: OBJECT_ID,
          price,
          isbn,
          attachments,
        })
      })
    })

    t.test('should override existing fields in _p parameter', async t => {
      t.plan(1)

      const doc = await crudService.findById(
        context,
        OBJECT_ID, {}, ['attachments', 'price', RAW_PROJECTION_PLAIN_INCLUSIVE])

      t.test('should return included fields plus _p overridden fields', t => {
        t.plan(1)
        t.strictSame(doc, {
          _id: OBJECT_ID,
          price,
          isbn,
          attachments,
        })
      })
    })

    t.test('should exclude fields specified in _rawp', async t => {
      t.plan(1)

      const doc = await crudService.findById(
        context,
        OBJECT_ID,
        {},
        ['attachments', 'price', RAW_PROJECTION_PLAIN_EXCLUSIVE]
      )

      t.test('should return all fields less _p excluded overridden fields', t => {
        t.plan(1)
        t.strictSame(doc, {
          ...docWithExcludedFields,
        })
      })
    })

    t.end()
  })

  t.end()
})
