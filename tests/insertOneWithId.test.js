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

const t = require('tap')
const abstractLogger = require('abstract-logging')
const { MongoClient, ObjectId } = require('mongodb')

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

const DOC = {
  name: 'War and Peace',
  author: 'Leo Tolstoy',
  isbn: 'fake isbn 3',
  price: 25.52,
  isPromoted: false,
}

const context = {
  log: abstractLogger,
  userId: 'my-user-id',
  now: new Date('2018-02-08'),
}

t.test('insertOneWithId', async t => {
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

  const myChosenId = new ObjectId()

  const crudService = new CrudService(collection, STATES.PUBLIC)

  t.test('with a doc', async t => {
    t.plan(3)

    const doc = await crudService.insertOneWithId(context, myChosenId, { ...DOC })
    const docId = doc._id
    t.equal(docId, myChosenId)

    t.test('should return the document', async t => {
      t.plan(1)

      t.strictSame(doc, {
        ...DOC,
        _id: myChosenId,
        [UPDATEDAT]: context.now,
        [CREATEDAT]: context.now,
        [UPDATERID]: context.userId,
        [CREATORID]: context.userId,
        [__STATE__]: STATES.PUBLIC,
      })
    })

    t.test('insert the document', async t => {
      t.plan(1)

      const savedDoc = await collection.findOne({ _id: myChosenId })

      t.strictSame(doc, savedDoc)
    })
  })

  t.test('with a doc that has the _id should throw', async t => {
    t.plan(1)

    try {
      await crudService.insertOneWithId(context, myChosenId, { ...DOC, _id: myChosenId })
      t.fail()
    } catch (error) {
      t.equal(error.message, 'doc._id already exists')
    }
  })

  CrudService.STANDARD_FIELDS.forEach((standardField) => {
    t.test(`with the ${standardField} field should throw`, async t => {
      t.plan(1)

      try {
        await crudService.insertMany(context, [{ ...DOC, [standardField]: 'some truly value' }])
        t.fail()
      } catch (error) {
        t.equal(error.message, `${standardField} cannot be specified`)
      }
    })
  })
})
