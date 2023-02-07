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
  dropCollectionAndInsertFixtures,
  fixtures,
  publicFixtures,
  getMongoDatabaseName,
  getMongoURL,
  BOOKS_COLLECTION_NAME,
} = require('./utils')

const context = {
  log: abstractLogger,
  userId: 'my-user-id',
  now: new Date('2018-02-08'),
}

tap.test('count', async t => {
  const databaseName = getMongoDatabaseName()
  const mongoURL = getMongoURL(databaseName)

  const client = await MongoClient.connect(mongoURL)
  const database = client.db(databaseName)
  const collection = database.collection(BOOKS_COLLECTION_NAME)

  t.teardown(async() => {
    await database.dropDatabase()
    await client.close()
  })

  await dropCollectionAndInsertFixtures(collection)

  const crudService = new CrudService(collection, STATES.PUBLIC)

  t.test('should return the number of the documents', async t => {
    t.plan(1)

    const count = await crudService.count(context)

    t.equal(count, publicFixtures.length)
  })

  t.test('should return the number of the documents that matched the given query', async t => {
    t.plan(1)

    const count = await crudService.count(context, { price: { $gt: 20 } })

    t.equal(count, publicFixtures.filter(d => d.price > 20).length)
  })

  t.test('should return the number of the documents that is in draft', async t => {
    t.plan(1)

    const count = await crudService.count(context, {}, [STATES.DRAFT])

    t.equal(count, fixtures.filter(d => d[__STATE__] === STATES.DRAFT).length)
  })

  t.test('should return the number of the documents that is in trash or in draft', async t => {
    t.plan(1)

    const count = await crudService.count(context, {}, [STATES.DRAFT, STATES.TRASH])

    t.equal(count, fixtures.filter(d => {
      return (
        d[__STATE__] === STATES.DRAFT
        || d[__STATE__] === STATES.TRASH
      )
    }).length)
  })

  t.test('should return the number of the documents that match the query and the state ', async t => {
    t.plan(1)

    const count = await crudService.count(context, { price: { $gt: 50 } }, [STATES.DRAFT, STATES.TRASH])

    t.equal(count, fixtures.filter(d => {
      return (
        d[__STATE__] === STATES.DRAFT
        || d[__STATE__] === STATES.TRASH
      ) && d.price > 50
    }).length)
  })

  t.end()
})
