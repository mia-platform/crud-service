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

const {
  clearCollectionAndInsertFixtures,
  getMongoDatabaseName,
  getMongoURL,
  BOOKS_COLLECTION_NAME,
} = require('./utils')

const {
  UPDATERID,
  UPDATEDAT,
  CREATORID,
  CREATEDAT,
} = require('../lib/consts')

const DOCS = [
  {
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
  },
  {
    name: 'The Odyssey',
    author: 'Homer',
    isbn: 'fake isbn 2',
    price: 21.12,
    isPromoted: false,
  },
  {
    name: 'Ulysses',
    author: 'James Joyce',
    isbn: 'fake isbn 1',
    price: 33.33,
    isPromoted: true,
  },
]

const context = {
  log: abstractLogger,
  userId: 'my-user-id',
  now: new Date('2018-02-08'),
}

tap.test('insertMany', async t => {
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


  const crudService = new CrudService(collection, STATES.DRAFT)

  t.test('with a doc', async t => {
    t.plan(4)

    try {
      await collection.drop()
    } catch (error) { /* ignore errors raised while removing records from collection */ }

    const docs = await crudService.insertMany(context, [{ ...DOCS[0] }])
    const docIds = docs.map(doc => doc._id)
    t.strictSame(docIds.length, 1)
    t.ok(docIds[0])

    t.test('should return the document', async t => {
      t.plan(1)

      t.strictSame(docs[0], {
        ...DOCS[0],
        _id: docIds[0],
        [UPDATEDAT]: context.now,
        [CREATEDAT]: context.now,
        [UPDATERID]: context.userId,
        [CREATORID]: context.userId,
        [__STATE__]: STATES.DRAFT,
      })
    })

    t.test('insert the document', async t => {
      t.plan(1)

      const savedDoc = await collection.findOne({ _id: docIds[0] })

      t.strictSame(docs[0], savedDoc)
    })
  })

  t.test('with many docs', async t => {
    t.plan(3)

    try {
      await collection.drop()
    } catch (error) { /* ignore errors raised while removing records from collection */ }

    const docs = await crudService.insertMany(context, DOCS.map(d => ({ ...d })))
    const docIds = docs.map(d => d._id)
    t.strictSame(docIds.length, DOCS.length)

    t.test('should return the document', async t => {
      t.plan(1)

      t.strictSame(docs, DOCS.map((D, i) => ({
        ...D,
        _id: docIds[i],
        [UPDATEDAT]: context.now,
        [CREATEDAT]: context.now,
        [UPDATERID]: context.userId,
        [CREATORID]: context.userId,
        [__STATE__]: STATES.DRAFT,
      })))
    })

    t.test('insert the document', async t => {
      t.plan(1)

      const savedDocs = await collection.find({ _id: { $in: docIds } }).toArray()

      t.strictSame(savedDocs, docs)
    })
  })

  t.test('with many docs with a specified state', async t => {
    t.plan(3)

    try {
      await collection.drop()
    } catch (error) { /* ignore errors raised while removing records from collection */ }

    const docs = await crudService.insertMany(context, DOCS.map(d => ({ ...d, __STATE__: STATES.PUBLIC })))
    const docIds = docs.map(d => d._id)
    t.strictSame(docIds.length, DOCS.length)

    t.test('should return the documents with the specified state', async t => {
      t.plan(1)

      t.strictSame(docs, DOCS.map((D, i) => ({
        ...D,
        _id: docIds[i],
        [UPDATEDAT]: context.now,
        [CREATEDAT]: context.now,
        [UPDATERID]: context.userId,
        [CREATORID]: context.userId,
        [__STATE__]: STATES.PUBLIC,
      })))
    })

    t.test('insert the document', async t => {
      t.plan(1)

      const savedDocs = await collection.find({ _id: { $in: docIds } }).toArray()

      t.strictSame(savedDocs, docs)
    })
  })

  t.test('with no docs', async t => {
    t.plan(1)

    try {
      await collection.drop()
    } catch (error) { /* ignore errors raised while removing records from collection */ }

    t.rejects(crudService.insertMany(context, []), 'should throw an AssertionError')
  })

  CrudService.STANDARD_FIELDS.forEach((standardField) => {
    t.test(`with the ${standardField} field should throw`, async t => {
      t.plan(1)

      try {
        await crudService.insertMany(context, [{ ...DOCS[0], [standardField]: 'some truly value' }])
        t.fail()
      } catch (error) {
        t.equal(error.message, `${standardField} cannot be specified`)
      }
    })
  })
})
