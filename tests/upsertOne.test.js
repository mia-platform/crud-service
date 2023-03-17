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
const { omit } = require('ramda')

const { STATES } = require('../lib/consts')
const CrudService = require('../lib/CrudService')

const {
  fixtures,
  clearCollectionAndInsertFixtures,
  checkDocumentsInDatabase,
  newUpdaterId,
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

const context = {
  log: abstractLogger,
  userId: newUpdaterId,
  now: new Date('2018-02-08'),
}

tap.test('upsertOne', async t => {
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

  // eslint-disable-next-line prefer-destructuring
  const chosenDoc = fixtures[1]
  const chosenDocId = chosenDoc._id
  const updateCommand = () => ({ $set: { price: 44.0 } })
  const updatedDoc = {
    ...fixtures[1],
    price: 44.0,
    [UPDATEDAT]: context.now,
    [UPDATERID]: context.userId,
  }

  const updatedDocProjection = Object.keys(updatedDoc)
  t.test('one matching doc', async t => {
    t.plan(3)

    await clearCollectionAndInsertFixtures(collection)

    const ret = await crudService.upsertOne(context, updateCommand(), { name: 'The Odyssey' }, updatedDocProjection)

    t.test('should return the updated object', t => {
      t.plan(1)
      t.strictSame(ret, updatedDoc)
    })

    t.test('should update the doc from the database', async t => {
      t.plan(1)
      const doc = await collection.findOne({ _id: ret._id })
      t.strictSame(doc, updatedDoc)
    })

    checkDocumentsInDatabase(t, collection, [ret._id], fixtures.filter(d => d.name !== 'The Odyssey'))
  })

  t.test('not found doc', async t => {
    t.plan(2)

    await clearCollectionAndInsertFixtures(collection)

    const ret = await crudService.upsertOne(context, updateCommand(), { name: 'Strange Book' }, ['name', 'price'])
    t.test('should return the new object', t => {
      t.plan(2)
      t.equal(ret.name, 'Strange Book')
      t.equal(ret.price, 44)
    })

    t.test('should insert the doc in the database', async t => {
      t.plan(1)
      const doc = await collection.findOne({ _id: ret._id })
      const docWithoutId = omit(['_id'], doc)

      t.strictSame(docWithoutId, {
        name: 'Strange Book',
        price: 44,
        [UPDATERID]: context.userId,
        [UPDATEDAT]: context.now,
        [CREATORID]: context.userId,
        [CREATEDAT]: context.now,
        __STATE__: 'PUBLIC',
      })
    })
  })

  t.test('setOnInsert on new document', async t => {
    t.plan(2)

    await clearCollectionAndInsertFixtures(collection)

    const ret = await crudService.upsertOne(context, {
      $setOnInsert: {
        price: 50,
      },
    }, { name: 'Strange Book' }, ['name', 'price'])

    t.test('should return the new object', t => {
      t.plan(2)
      t.equal(ret.name, 'Strange Book')
      t.equal(ret.price, 50)
    })

    t.test('should insert the doc in the database', async t => {
      t.plan(1)
      const doc = await collection.findOne({ _id: ret._id })
      const docWithoutId = omit(['_id'], doc)

      t.strictSame(docWithoutId, {
        name: 'Strange Book',
        price: 50,
        [UPDATERID]: context.userId,
        [UPDATEDAT]: context.now,
        [CREATORID]: context.userId,
        [CREATEDAT]: context.now,
        __STATE__: 'PUBLIC',
      })
    })
  })

  t.test('setOnInsert on matching doc (ignored)', async t => {
    t.plan(3)

    await clearCollectionAndInsertFixtures(collection)

    const ret = await crudService.upsertOne(
      context, {
        ...updateCommand(),
        $setOnInsert: { stuff: 500 },
      },
      { name: 'The Odyssey' },
      updatedDocProjection
    )

    t.test('should return the updated object', t => {
      t.plan(1)
      t.strictSame(ret, updatedDoc)
    })

    t.test('should update the doc from the database', async t => {
      t.plan(1)
      const doc = await collection.findOne({ _id: ret._id })
      t.strictSame(doc, updatedDoc)
    })

    checkDocumentsInDatabase(t, collection, [ret._id], fixtures.filter(d => d.name !== 'The Odyssey'))
  })

  const testConf = [
    {
      name: 'mul',
      cmd: { $mul: { price: 2 } },
      updatedFields: { price: chosenDoc.price * 2, updatedAt: context.now, updaterId: newUpdaterId },
    },
    {
      name: 'inc',
      cmd: { $inc: { price: 3 } },
      updatedFields: { price: chosenDoc.price + 3, updatedAt: context.now, updaterId: newUpdaterId },
    },
  ]
  t.test('all commands', t => {
    t.plan(testConf.length)

    testConf.forEach(conf => {
      t.test(conf.name, async t => {
        t.plan(3)

        await clearCollectionAndInsertFixtures(collection)

        const ret = await crudService.upsertOne(context, conf.cmd, { name: 'The Odyssey' }, updatedDocProjection)

        t.test('should return the updated object', t => {
          t.plan(1)
          t.strictSame(ret, { ...chosenDoc, ...conf.updatedFields })
        })
        t.test('should update the doc from the database', async t => {
          t.plan(1)
          const doc = await collection.findOne({ _id: chosenDocId })
          t.strictSame(doc, { ...chosenDoc, ...conf.updatedFields })
        })
        checkDocumentsInDatabase(t, collection, [chosenDocId], fixtures.filter(d => d._id !== chosenDocId))
      })
    })
  })

  const veryBadCommands = []
    .concat(CrudService.STANDARD_FIELDS.map(f => ({
      regex: /cannot be specified$/,
      cmd: { $set: { [f]: 'some truly value' } },
    })))
    .concat(CrudService.STANDARD_FIELDS.map(f => ({ regex: /cannot be specified$/, cmd: { $unset: { [f]: true } } })))
    .concat(CrudService.STANDARD_FIELDS.map(f => ({
      regex: /cannot be specified$/,
      cmd: { $currentDate: { [f]: true } },
    })))
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
          await crudService.upsertOne(context, testConf.cmd, { name: 'The Odyssey' })
          t.fail()
        } catch (error) {
          t.ok(testConf.regex.test(error.message), error.message)
        }
      })
    })
  })
})
