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
  trashFixture,
  deletedFixture,
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

tap.test('changeState', async t => {
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

  const testConf = [
    // PUBLIC
    {
      name: 'PUBLIC -> DRAFT',
      chosenDoc: publicFixtures[0],
      stateTo: 'DRAFT',
      ok: true,
    },
    {
      name: 'PUBLIC -> TRASH',
      chosenDoc: publicFixtures[0],
      stateTo: 'TRASH',
      ok: true,
    },
    {
      name: 'PUBLIC -> PUBLIC',
      chosenDoc: publicFixtures[0],
      stateTo: 'PUBLIC',
      ok: false,
    },
    {
      name: 'PUBLIC -> DELETED',
      chosenDoc: publicFixtures[0],
      stateTo: 'DELETED',
      ok: false,
    },
    // DRAFT
    {
      name: 'DRAFT -> PUBLIC',
      chosenDoc: draftFixture,
      stateTo: 'PUBLIC',
      ok: true,
    },
    {
      name: 'DRAFT -> DRAFT',
      chosenDoc: draftFixture,
      stateTo: 'DRAFT',
      ok: false,
    },
    {
      name: 'DRAFT -> TRASH',
      chosenDoc: draftFixture,
      stateTo: 'TRASH',
      ok: true,
    },
    {
      name: 'DRAFT -> DELETED',
      chosenDoc: draftFixture,
      stateTo: 'DELETED',
      ok: false,
    },
    // TRASH
    {
      name: 'TRASH -> PUBLIC',
      chosenDoc: trashFixture,
      stateTo: 'PUBLIC',
      ok: false,
    },
    {
      name: 'TRASH -> DRAFT',
      chosenDoc: trashFixture,
      stateTo: 'DRAFT',
      ok: true,
    },
    {
      name: 'TRASH -> TRASH',
      chosenDoc: trashFixture,
      stateTo: 'TRASH',
      ok: false,
    },
    {
      name: 'TRASH -> DELETED',
      chosenDoc: trashFixture,
      stateTo: 'DELETED',
      ok: true,
    },
    // DELETED
    {
      name: 'DELETED -> PUBLIC',
      chosenDoc: deletedFixture,
      stateTo: 'PUBLIC',
      ok: false,
    },
    {
      name: 'DELETED -> DRAFT',
      chosenDoc: deletedFixture,
      stateTo: 'DRAFT',
      ok: false,
    },
    {
      name: 'DELETED -> TRASH',
      chosenDoc: deletedFixture,
      stateTo: 'TRASH',
      ok: true,
    },
    {
      name: 'DELETED -> DELETED',
      chosenDoc: deletedFixture,
      stateTo: 'DELETED',
      ok: false,
    },
  ]

  testConf.forEach(conf => {
    const { chosenDoc, ok } = conf
    t.test(conf.name, async t => {
      if (ok) {
        t.plan(3)
        await clearCollectionAndInsertFixtures(collection)

        const ret = await crudService.changeStateById(context, chosenDoc._id, conf.stateTo)

        t.test('should return the document', t => {
          t.plan(4)
          t.strictSame(ret._id, chosenDoc._id)
          t.strictSame(ret.__STATE__, conf.stateTo)
          t.strictSame(ret.updaterId, context.userId)
          t.strictSame(ret.updatedAt, context.now)
        })

        t.test('should update the doc from the database', async t => {
          t.plan(4)
          const doc = await collection.findOne({ _id: chosenDoc._id })
          t.strictSame(doc._id, chosenDoc._id)
          t.strictSame(doc.__STATE__, conf.stateTo)
          t.strictSame(doc.updaterId, context.userId)
          t.strictSame(ret.updatedAt, context.now)
        })

        checkDocumentsInDatabase(t, collection, [chosenDoc._id], fixtures.filter(d => d._id !== chosenDoc._id))
      } else {
        t.plan(2)
        await clearCollectionAndInsertFixtures(collection)

        const ret = await crudService.changeStateById(context, chosenDoc._id, conf.stateTo)

        t.test('should not be possible', t => {
          t.plan(1)
          t.strictSame(ret, null)
        })

        checkDocumentsInDatabase(t, collection, [''], fixtures)
      }
    })
  })
})
