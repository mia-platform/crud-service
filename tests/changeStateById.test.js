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

// #region Test cases

const context = {
  log: abstractLogger,
  userId: 'my-user-id',
  now: new Date('2018-02-08'),
}

const allowedTransitionTests = [
  {
    name: 'PUBLIC -> DRAFT',
    chosenDoc: publicFixtures[0],
    stateTo: 'DRAFT',
  },
  {
    name: 'PUBLIC -> TRASH',
    chosenDoc: publicFixtures[0],
    stateTo: 'TRASH',
  },
  {
    name: 'PUBLIC -> PUBLIC',
    chosenDoc: publicFixtures[0],
    stateTo: 'PUBLIC',
  },
  {
    name: 'DRAFT -> PUBLIC',
    chosenDoc: draftFixture,
    stateTo: 'PUBLIC',
  },
  {
    name: 'DRAFT -> DRAFT',
    chosenDoc: draftFixture,
    stateTo: 'DRAFT',
  },
  {
    name: 'DRAFT -> TRASH',
    chosenDoc: draftFixture,
    stateTo: 'TRASH',
  },
  {
    name: 'TRASH -> DRAFT',
    chosenDoc: trashFixture,
    stateTo: 'DRAFT',
  },
  {
    name: 'TRASH -> TRASH',
    chosenDoc: trashFixture,
    stateTo: 'TRASH',
  },
  {
    name: 'TRASH -> DELETED',
    chosenDoc: trashFixture,
    stateTo: 'DELETED',
  },
  {
    name: 'DELETED -> TRASH',
    chosenDoc: deletedFixture,
    stateTo: 'TRASH',
  },
  {
    name: 'DELETED -> DELETED',
    chosenDoc: deletedFixture,
    stateTo: 'DELETED',
  },
]

const unallowedTransitionTests = [
  {
    name: 'PUBLIC -> DELETED',
    chosenDoc: publicFixtures[0],
    stateTo: 'DELETED',
  },
  {
    name: 'DRAFT -> DELETED',
    chosenDoc: draftFixture,
    stateTo: 'DELETED',
  },
  {
    name: 'TRASH -> PUBLIC',
    chosenDoc: trashFixture,
    stateTo: 'PUBLIC',
  },
  {
    name: 'DELETED -> PUBLIC',
    chosenDoc: deletedFixture,
    stateTo: 'PUBLIC',
  },
  {
    name: 'DELETED -> DRAFT',
    chosenDoc: deletedFixture,
    stateTo: 'DRAFT',
  },
]

// #endregion

tap.test('CrudService -> changeStateById ->', async t => {
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

  t.test('Allowed transition', async t => {
    allowedTransitionTests.forEach(conf => {
      const { chosenDoc, name, stateTo } = conf
      t.test(name, async t => {
        await clearCollectionAndInsertFixtures(collection)
        const ret = await crudService.changeStateById(context, chosenDoc._id, stateTo)

        t.test('should acknowledge the update', t => {
          t.strictSame(ret, 1)
          t.plan(1)
        })

        t.test('should update the doc from the database', async t => {
          const doc = await collection.findOne({ _id: chosenDoc._id })

          t.strictSame(doc.__STATE__, stateTo)
          t.strictSame(doc.updaterId, context.userId)
          // t.strictSame(ret.updatedAt, context.now)

          t.end()
        })

        checkDocumentsInDatabase(t, collection, [chosenDoc._id], fixtures.filter(d => d._id !== chosenDoc._id))
        t.end()
      })
    })

    t.end()
  })

  t.test('Unallowed transition', async t => {
    unallowedTransitionTests.forEach(conf => {
      const { chosenDoc, name, stateTo } = conf
      t.test(name, async t => {
        t.plan(2)
        await clearCollectionAndInsertFixtures(collection)

        t.test('should fail', async t => {
          t.plan(1)
          try {
            await crudService.changeStateById(context, chosenDoc._id, stateTo)
            t.fail('The changeStateById request should throw an exception')
          } catch {
            t.ok(true)
          }

          t.end()
        })

        checkDocumentsInDatabase(t, collection, [chosenDoc._id], fixtures.filter(d => d._id !== chosenDoc._id))
      })
    })
  })

  t.end()
})
