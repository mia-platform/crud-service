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
  publicFixtures,
  clearCollectionAndInsertFixtures,
  getMongoDatabaseName,
  getMongoURL,
  BOOKS_COLLECTION_NAME,
} = require('./utils')

const ALL_FIELDS = Object.keys(publicFixtures[0])

const [firstPublicFixture] = publicFixtures
const OBJECT_ID = firstPublicFixture._id

const context = {
  log: abstractLogger,
  userId: 'my-user-id',
  now: new Date('2018-02-08'),
}

tap.test('allowDiskUse', async t => {
  const databaseName = getMongoDatabaseName()
  const mongoURL = getMongoURL(databaseName)

  const client = await MongoClient.connect(mongoURL, { monitorCommands: true })
  const database = client.db(databaseName)
  const collection = database.collection(BOOKS_COLLECTION_NAME)

  await clearCollectionAndInsertFixtures(collection)

  t.teardown(async() => {
    await database.dropDatabase()
    await client.close()
  })

  // instrumentation
  const commandStartedEvents = []
  const commandFailedEvents = []
  client.on('commandStarted', event => commandStartedEvents.push(event))
  client.on('commandFailed', event => commandFailedEvents.push(event))

  t.beforeEach(() => {
    commandFailedEvents.splice(0, commandFailedEvents.length)
    commandStartedEvents.splice(0, commandStartedEvents.length)
  })

  t.test('If option allowDiskUse is set to true, CrudService should set allowDiskUse=true (mongo >= 4.4 only)', async t => {
    if (process.env.MONGO_VERSION < '4.4') {
      t.skip()
      return
    }

    const crudService = new CrudService(collection, STATES.PUBLIC, { allowDiskUse: true })

    t.test('in findAll', async t => {
      await crudService.findAll(context, { price: { $gt: 20 } }).toArray()
      t.strictSame(commandFailedEvents, [])
      t.match(commandStartedEvents, [{ commandName: 'find', command: { allowDiskUse: true } }])
    })

    t.test('in findById', async t => {
      await crudService.findById(context, OBJECT_ID)
      t.strictSame(commandFailedEvents, [])
      t.match(commandStartedEvents, [{ commandName: 'find', command: { allowDiskUse: true } }])
    })

    t.test('in count', async t => {
      await crudService.count(context)
      t.strictSame(commandFailedEvents, [])
      t.match(commandStartedEvents, [{ commandName: 'aggregate', command: { allowDiskUse: true } }])
    })
  })

  t.test('If option allowDiskUse is set to false, allowDiskUse be set to false (mongo >= 4.4 only)', async t => {
    if (process.env.MONGO_VERSION < '4.4') {
      t.skip()
      return
    }

    const crudService = new CrudService(collection, STATES.PUBLIC, { allowDiskUse: false })

    t.test('in findAll', async t => {
      await crudService.findAll(context, { price: { $gt: 20 } }, ALL_FIELDS).toArray()
      t.strictSame(commandFailedEvents, [])
      t.strictSame(commandStartedEvents[0].command.allowDiskUse, false)
    })

    t.test('in findById', async t => {
      await crudService.findAll(context, { price: { $gt: 20 } }, ALL_FIELDS).toArray()
      t.strictSame(commandFailedEvents, [])
      t.strictSame(commandStartedEvents[0].command.allowDiskUse, false)
    })

    t.test('in count', async t => {
      await crudService.count(context)
      t.strictSame(commandFailedEvents, [])
      t.strictSame(commandStartedEvents[0].command.allowDiskUse, false)
    })
  })

  t.test('If option allowDiskUse is not set, allowDiskUse should not be set', async t => {
    const crudService = new CrudService(collection, STATES.PUBLIC)

    t.test('in findAll', async t => {
      await crudService.findAll(context, { price: { $gt: 20 } }, ALL_FIELDS).toArray()
      t.strictSame(commandFailedEvents, [])
      t.strictSame(commandStartedEvents[0].command.allowDiskUse, undefined)
    })

    t.test('in findById', async t => {
      await crudService.findAll(context, { price: { $gt: 20 } }, ALL_FIELDS).toArray()
      t.strictSame(commandFailedEvents, [])
      t.strictSame(commandStartedEvents[0].command.allowDiskUse, undefined)
    })

    t.test('in count', async t => {
      await crudService.count(context)
      t.strictSame(commandFailedEvents, [])
      t.strictSame(commandStartedEvents[0].command.allowDiskUse, undefined)
    })
  })
})
