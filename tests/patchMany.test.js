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
  clearCollectionAndInsertFixtures,
  checkDocumentsInDatabase,
  getMongoDatabaseName,
  getMongoURL,
  BOOKS_COLLECTION_NAME,
} = require('./utils')

const {
  UPDATERID,
  UPDATEDAT,
} = require('../lib/consts')

const context = {
  log: abstractLogger,
  userId: 'my-user-id',
  now: new Date('2018-02-08'),
}

tap.test('patchMany', async t => {
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


  const firstDocIndex = 1
  const secondDocIndex = 2

  const updateCommand = () => ({ $set: { price: 44.0 } })
  const nonMatchingQuery = () => ({ price: { $lt: 0 } })
  const newDoc = {
    ...fixtures[1],
    price: 44.0,
    [UPDATEDAT]: context.now,
    [UPDATERID]: context.userId,
  }

  t.test('with only doc', async t => {
    t.plan(3)

    await clearCollectionAndInsertFixtures(collection)
    const ret = await crudService.patchMany(
      context,
      updateCommand(),
      { _id: fixtures[firstDocIndex]._id },
      [STATES.PUBLIC]
    )

    t.test('should return ok and one modification', t => {
      t.plan(1)
      t.equal(ret, 1)
    })

    t.test('should update the doc from the database', async t => {
      t.plan(1)
      const doc = await collection.findOne({ _id: fixtures[firstDocIndex]._id })
      t.strictSame(doc, newDoc)
    })

    checkDocumentsInDatabase(
      t,
      collection,
      [fixtures[firstDocIndex]._id],
      fixtures.filter(d => d._id !== fixtures[firstDocIndex]._id)
    )
  })

  t.test('with two docs', async t => {
    t.plan(3)

    await clearCollectionAndInsertFixtures(collection)

    const newDoc2 = {
      ...fixtures[secondDocIndex],
      price: 44.0,
      [UPDATEDAT]: context.now,
      [UPDATERID]: context.userId,
    }

    const indexes = [fixtures[firstDocIndex]._id, fixtures[secondDocIndex]._id]
    const ret = await crudService.patchMany(
      context,
      updateCommand(),
      { _id: { $in: indexes } },
      [STATES.PUBLIC]
    )

    t.test('should return ok and two modifications', t => {
      t.plan(1)
      t.equal(ret, 2)
    })

    t.test('should update the docs from the database', async t => {
      t.plan(2)
      const doc = await collection.findOne({ _id: fixtures[firstDocIndex]._id })
      t.strictSame(doc, newDoc)
      const doc2 = await collection.findOne({ _id: fixtures[secondDocIndex]._id })
      t.strictSame(doc2, newDoc2)
    })

    checkDocumentsInDatabase(
      t,
      collection,
      [fixtures[firstDocIndex]._id, fixtures[secondDocIndex]._id],
      fixtures.filter(
        d => d._id !== fixtures[firstDocIndex]._id && d._id !== fixtures[secondDocIndex]._id
      )
    )
  })

  t.test('matching query but modification doesn\'t change the documents -> returns 0', async t => {
    t.plan(2)

    await clearCollectionAndInsertFixtures(collection)

    const name = 'Ulysses'
    const matchingQuery = { name }
    const curFixture = fixtures.find(doc => doc.name === name)
    const context = {
      log: abstractLogger,
      userId: curFixture[UPDATERID],
      now: curFixture[UPDATEDAT],
    }
    const updateCommand = {
      $set: {
        author: curFixture.author,
      },
    }
    const ret = await crudService.patchMany(
      context,
      updateCommand,
      matchingQuery,
      [STATES.PUBLIC]
    )

    t.test('should return ok and zero modification', t => {
      t.plan(1)
      t.equal(ret, 0)
    })

    checkDocumentsInDatabase(t, collection, [], fixtures)
  })

  t.test('non-matching query', async t => {
    t.plan(2)

    await clearCollectionAndInsertFixtures(collection)

    const ret = await crudService.patchMany(
      context,
      updateCommand(),
      nonMatchingQuery()
      , [STATES.PUBLIC]
    )

    t.test('should return ok and no modifications', t => {
      t.plan(1)
      t.equal(ret, 0)
    })

    checkDocumentsInDatabase(t, collection, [], fixtures)
  })

  t.test('matching query but no states', async t => {
    t.plan(2)

    await clearCollectionAndInsertFixtures(collection)

    const ret = await crudService.patchMany(
      context,
      updateCommand(),
      {},
      []
    )

    t.test('should return ok and no modifications', t => {
      t.plan(1)
      t.equal(ret, 0)
    })

    checkDocumentsInDatabase(t, collection, [], fixtures)
  })

  const veryBadCommands = []
    .concat(CrudService.STANDARD_FIELDS.map(f => ({ regex: /cannot be specified$/, cmd: { $set: { [f]: 'some truly value' } } })))
    .concat(CrudService.STANDARD_FIELDS.map(f => ({ regex: /cannot be specified$/, cmd: { $unset: { [f]: true } } })))
    .concat(CrudService.STANDARD_FIELDS.map(f => ({ regex: /cannot be specified$/, cmd: { $currentDate: { [f]: true } } })))
    .concat(CrudService.STANDARD_FIELDS.map(f => ({ regex: /cannot be specified$/, cmd: { $inc: { [f]: 1 } } })))
    .concat(CrudService.STANDARD_FIELDS.map(f => ({ regex: /cannot be specified$/, cmd: { $mul: { [f]: 1 } } })))
    .concat([
      { cmd: { $unknownOp: { foo: 2 } }, regex: /^Unknown operator: / },
    ])

  t.test('Cannot change the standardFields', async t => {
    t.plan(veryBadCommands.length)

    await clearCollectionAndInsertFixtures(collection)

    veryBadCommands.forEach((testConf) => {
      t.test(JSON.stringify(testConf.cmd), async t => {
        try {
          await crudService.patchMany(
            context,
            testConf.cmd,
            {},
            [STATES.PUBLIC]
          )
          t.fail()
        } catch (error) {
          t.ok(testConf.regex.test(error.message), error.message)
        }
      })
    })
  })

  const updateArrayNestedObject = () => ({ $set: { 'attachments.$.name': 'renamed' } })
  const arrayQuery = { 'attachments.name': 'note' }
  const updatedDoc = {
    ...fixtures[0],
    attachments: [
      {
        ...fixtures[0].attachments[0],
        name: 'renamed',
      },
      {
        name: 'another-note',
        other: 'stuff',
      }],
    [UPDATEDAT]: context.now,
    [UPDATERID]: context.userId,
  }

  t.test('update nested object in array', async t => {
    t.plan(3)

    await clearCollectionAndInsertFixtures(collection)
    const ret = await crudService.patchMany(context, updateArrayNestedObject(), arrayQuery, [STATES.PUBLIC])

    t.test('should return ok and one modification', t => {
      t.plan(1)
      t.equal(ret, 1)
    })

    t.test('should update the doc from the database', async t => {
      t.plan(1)
      const doc = await collection.findOne({ _id: fixtures[0]._id })
      t.strictSame(doc, updatedDoc)
    })

    checkDocumentsInDatabase(
      t,
      collection,
      [fixtures[0]._id],
      fixtures.filter(d => d._id !== fixtures[0]._id)
    )
  })

  const arrayOrQuery = { 'attachments.name': { $in: ['note', 'my-name'] } }
  const secondUpdatedDoc = {
    ...fixtures[7],
    attachments: [
      {
        name: 'renamed',
        neastedArr: [1, 2, 66],
      }],
    [UPDATEDAT]: context.now,
    [UPDATERID]: context.userId,
  }

  t.test('update many objects nested fields in array', async t => {
    t.plan(4)

    await clearCollectionAndInsertFixtures(collection)
    const ret = await crudService.patchMany(context, updateArrayNestedObject(), arrayOrQuery, [STATES.PUBLIC])

    t.test('should return ok and one modification', t => {
      t.plan(1)
      t.equal(ret, 2)
    })

    t.test('should update first doc from the database', async t => {
      t.plan(1)
      const doc = await collection.findOne({ _id: fixtures[0]._id })
      t.strictSame(doc, updatedDoc)
    })

    t.test('should update second doc from the database', async t => {
      t.plan(1)
      const doc = await collection.findOne({ _id: fixtures[7]._id })
      t.strictSame(doc, secondUpdatedDoc)
    })

    checkDocumentsInDatabase(
      t,
      collection,
      [fixtures[0]._id, fixtures[7]._id],
      fixtures.filter(d => d._id !== fixtures[0]._id && d._id !== fixtures[7]._id)
    )
  })
})
