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

const { STATES, __STATE__ } = require('../lib/consts')
const CrudService = require('../lib/CrudService')
const { pkFactories } = require('../lib/pkFactories')

const {
  dropCollectionAndInsertFixtures,
  getMongoDatabaseName,
  getMongoURL,
  BOOKS_COLLECTION_NAME,
  STATIONS_COLLECTION_NAME,
} = require('./utils')

const {
  UPDATERID,
  UPDATEDAT,
  CREATORID,
  CREATEDAT,
} = require('../lib/consts')

const DOC = {
  name: 'War and Peace',
  author: 'Leo Tolstoy',
  isbn: 'fake isbn 3',
  price: 25.52,
  isPromoted: false,
  additionalInfo: {
    footnotePages: [2, 3, 5, 23, 3],
    notes: {
      mynote: 'good',
    },
  },
}

const context = {
  log: abstractLogger,
  userId: 'my-user-id',
  now: new Date('2018-02-08'),
}

tap.test('insertOne', async t => {
  const databaseName = getMongoDatabaseName()
  const mongoURL = getMongoURL(databaseName)

  const client = await MongoClient.connect(mongoURL)
  const database = client.db(databaseName)
  const collection = database.collection(BOOKS_COLLECTION_NAME)

  await dropCollectionAndInsertFixtures(collection)

  t.teardown(async() => {
    await database.dropDatabase()
    await client.close()
  })

  const crudService = new CrudService(collection, STATES.PUBLIC)

  t.test('with a doc', async t => {
    t.plan(3)

    const doc = await crudService.insertOne(context, { ...DOC })
    const docId = doc._id
    t.ok(docId)

    t.test('should return the document', async t => {
      t.plan(1)

      t.strictSame(doc, {
        ...DOC,
        _id: docId,
        [UPDATEDAT]: context.now,
        [CREATEDAT]: context.now,
        [UPDATERID]: context.userId,
        [CREATORID]: context.userId,
        [__STATE__]: STATES.PUBLIC,
      })
    })

    t.test('insert the document', async t => {
      t.plan(1)

      const savedDoc = await collection.findOne({ _id: docId })

      t.strictSame(doc, savedDoc)
    })
  })

  t.test('with a doc with a specified state', async t => {
    t.plan(3)

    const doc = await crudService.insertOne(context, { ...DOC, __STATE__: STATES.DRAFT })
    const docId = doc._id
    t.ok(docId)

    t.test('should return the document with the specified state', async t => {
      t.plan(1)

      t.strictSame(doc, {
        ...DOC,
        _id: docId,
        [UPDATEDAT]: context.now,
        [CREATEDAT]: context.now,
        [UPDATERID]: context.userId,
        [CREATORID]: context.userId,
        [__STATE__]: STATES.DRAFT,
      })
    })

    t.test('insert the document', async t => {
      t.plan(1)

      const savedDoc = await collection.findOne({ _id: docId })

      t.strictSame(doc, savedDoc)
    })
  })

  CrudService.STANDARD_FIELDS.forEach((standardField) => {
    t.test(`with the ${standardField} field should throw`, async t => {
      t.plan(1)

      try {
        await crudService.insertOne(context, { ...DOC, [standardField]: 'some truly value' })
        t.fail()
      } catch (error) {
        t.equal(error.message, `${standardField} cannot be specified`)
      }
    })
  })
})

tap.test('insertOne with string id', async t => {
  const databaseName = getMongoDatabaseName()
  const mongoURL = getMongoURL(databaseName)
  const client = await MongoClient.connect(mongoURL, { pkFactory: pkFactories.string })
  t.teardown(async() => client.close())

  const database = client.db(databaseName)
  const collection = database.collection(STATIONS_COLLECTION_NAME)

  await dropCollectionAndInsertFixtures(collection)

  const crudService = new CrudService(collection, STATES.PUBLIC)

  t.test('with a doc', async t => {
    t.plan(3)

    const doc = await crudService.insertOne(context, { ...DOC })
    const docId = doc._id
    t.ok(docId)

    t.test('should return the document', async t => {
      t.plan(1)

      t.strictSame(doc, {
        ...DOC,
        _id: docId,
        [UPDATEDAT]: context.now,
        [CREATEDAT]: context.now,
        [UPDATERID]: context.userId,
        [CREATORID]: context.userId,
        [__STATE__]: STATES.PUBLIC,
      })
    })

    t.test('insert the document', async t => {
      t.plan(1)

      const savedDoc = await collection.findOne({ _id: docId })

      t.strictSame(doc, savedDoc)
    })
  })

  t.test('with a doc with a specified state', async t => {
    t.plan(3)

    const doc = await crudService.insertOne(context, { ...DOC, __STATE__: STATES.DRAFT })
    const docId = doc._id
    t.ok(docId)

    t.test('should return the document with the specified state', async t => {
      t.plan(1)

      t.strictSame(doc, {
        ...DOC,
        _id: docId,
        [UPDATEDAT]: context.now,
        [CREATEDAT]: context.now,
        [UPDATERID]: context.userId,
        [CREATORID]: context.userId,
        [__STATE__]: STATES.DRAFT,
      })
    })

    t.test('insert the document', async t => {
      t.plan(1)

      const savedDoc = await collection.findOne({ _id: docId })

      t.strictSame(doc, savedDoc)
    })
  })

  CrudService.STANDARD_FIELDS.forEach((standardField) => {
    t.test(`with the ${standardField} field should throw`, async t => {
      t.plan(1)

      try {
        await crudService.insertOne(context, { ...DOC, [standardField]: 'some truly value' })
        t.fail()
      } catch (error) {
        t.equal(error.message, `${standardField} cannot be specified`)
      }
    })
  })
})
