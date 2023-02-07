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
  dropCollectionAndInsertFixtures,
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

tap.test('changeStateMany', async t => {
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
      filterUpdateCommands: [
        {
          query: { _id: publicFixtures[0]._id },
          stateTo: 'DRAFT',
        },
        {
          query: { _id: publicFixtures[1]._id },
          stateTo: 'DRAFT',
        },
      ],
      count: 2,
    },
    {
      name: 'PUBLIC -> DRAFT / partial',
      filterUpdateCommands: [
        {
          query: { _id: publicFixtures[0]._id },
          stateTo: 'DRAFT',
        },
        {
          query: { _id: publicFixtures[1]._id },
          stateTo: 'DELETED',
        },
      ],
      count: 1,
    },
  ]

  // TODO: Broken in parallel
  testConf.forEach(conf => {
    const { filterUpdateCommands } = conf
    t.test(conf.name, async t => {
      await dropCollectionAndInsertFixtures(collection)

      const ret = await crudService.changeStateMany(context, filterUpdateCommands)

      t.test('should return the document count', t => {
        t.strictSame(ret, conf.count)
        t.end()
      })

      checkDocumentsInDatabase(
        t,
        collection,
        filterUpdateCommands.map(f => f.query._id),
        fixtures.filter(d => !filterUpdateCommands.some(f => f.query._id === d._id))
      )
      t.end()
    })
  })
})
