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
  BOOKS_COLLECTION_NAME,
  getMongoDatabaseName,
  getMongoURL,
} = require('./utils')

const context = {
  log: abstractLogger,
  userId: 'my-user-id',
  now: new Date('2018-02-08'),
}

tap.test('deleteAll', async t => {
  const databaseName = getMongoDatabaseName()
  const mongoURL = getMongoURL(databaseName)

  const client = await MongoClient.connect(mongoURL)
  const database = client.db(databaseName)
  const collection = database.collection(BOOKS_COLLECTION_NAME)

  const crudService = new CrudService(collection, STATES.PUBLIC)

  t.teardown(async() => {
    await database.dropDatabase()
    await client.close()
  })

  t.test('with only doc', async t => {
    t.plan(3)
    await clearCollectionAndInsertFixtures(collection)

    const ret = await crudService.deleteAll(context)

    t.test('should return the deleted document count', t => {
      // TODO: Broken in parallel
      t.plan(1)
      t.strictSame(ret, publicFixtures.length)
    })

    t.test('should remove the doc from the database', async t => {
      t.plan(1)
      const number = await collection.countDocuments(context)
      t.strictSame(number, 0)
    })

    checkDocumentsInDatabase(t, collection, [], fixtures.filter(d => d.__STATE__ !== 'PUBLIC'))
  })

  t.test('with doc and a matching query', async t => {
    t.plan(3)
    await clearCollectionAndInsertFixtures(collection)

    const matchingQuery = { price: { $gt: publicFixtures[1].price - 1 } }
    const ret = await crudService.deleteAll(context, matchingQuery)

    t.test('should return the deleted document count', t => {
      t.plan(1)
      t.strictSame(ret, publicFixtures.filter(pf => pf.price > publicFixtures[1].price - 1).length)
    })

    t.test('should remove the docs from the database', async t => {
      t.plan(1)
      const number = await collection.countDocuments({ ...matchingQuery, __STATE__: 'PUBLIC' })
      t.strictSame(number, 0)
    })

    checkDocumentsInDatabase(t, collection, [], fixtures.filter(pf => !(pf.price > publicFixtures[1].price - 1 && pf.__STATE__ === 'PUBLIC')))
  })

  t.test('in draft', async t => {
    t.plan(2)
    await clearCollectionAndInsertFixtures(collection)

    const ret = await crudService.deleteAll(context, {}, [STATES.DRAFT])

    t.test('should return the deleted document count', async t => {
      t.plan(1)
      t.strictSame(ret, 1)
    })

    checkDocumentsInDatabase(t, collection, [], fixtures.filter(d => d._id !== draftFixture._id))
  })

  t.test('in draft or in trash with matching query', async t => {
    t.plan(2)
    await clearCollectionAndInsertFixtures(collection)

    const matchingQuery = { price: { $gt: draftFixture.price - 1 } }
    const ret = await crudService.deleteAll(context, matchingQuery, [STATES.DRAFT, STATES.TRASH])

    t.test('should return the deleted document count', async t => {
      t.plan(1)
      t.strictSame(
        ret,
        fixtures.filter(
          d => (d.__STATE__ === STATES.DRAFT || d.__STATE__ !== STATES.TRASH) && d.price > (draftFixture.price - 1)
        ).length
      )
    })

    checkDocumentsInDatabase(
      t,
      collection,
      [],
      fixtures.filter(
        d => !((d.__STATE__ === STATES.DRAFT || d.__STATE__ !== STATES.TRASH) && d.price > (draftFixture.price - 1))
      )
    )
  })
})
