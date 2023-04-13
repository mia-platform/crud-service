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
  newUpdaterId,
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
  userId: newUpdaterId,
  now: new Date('2018-02-08'),
}

tap.test('patchById', async t => {
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
  const chosenDocProjection = Object.keys(chosenDoc)
  const updateCommand = () => ({ $set: { price: 44.0 } })
  const updatedDoc = {
    ...fixtures[1],
    price: 44.0,
    [UPDATEDAT]: context.now,
    [UPDATERID]: context.userId,
  }

  t.test('with only doc', async t => {
    t.plan(3)

    await clearCollectionAndInsertFixtures(collection)

    const ret = await crudService.patchById(context, chosenDocId, updateCommand(), {}, chosenDocProjection)

    t.test('should return the updated object', t => {
      t.plan(1)
      t.strictSame(ret, updatedDoc)
    })

    t.test('should update the doc from the database', async t => {
      t.plan(1)
      const doc = await collection.findOne({ _id: chosenDocId })
      t.strictSame(doc, updatedDoc)
    })

    checkDocumentsInDatabase(t, collection, [chosenDoc._id], fixtures.filter(d => d._id !== chosenDoc._id))
  })

  t.test('with only doc and a matching query', async t => {
    t.plan(3)

    await clearCollectionAndInsertFixtures(collection)

    const matchingQuery = { price: { $gt: 0 } }
    const ret = await crudService.patchById(context, chosenDocId, updateCommand(), matchingQuery, chosenDocProjection)

    t.test('should return the updated object', t => {
      t.plan(1)
      t.strictSame(ret, updatedDoc)
    })

    t.test('should update the doc from the database', async t => {
      t.plan(1)
      const doc = await collection.findOne({ _id: chosenDocId })
      t.strictSame(doc, updatedDoc)
    })

    checkDocumentsInDatabase(t, collection, [chosenDoc._id], fixtures.filter(d => d._id !== chosenDoc._id))
  })

  t.test('with only doc and a non-matching query', async t => {
    t.plan(2)

    await clearCollectionAndInsertFixtures(collection)

    const matchingQuery = { price: { $lt: 0 } }

    const r = await crudService.patchById(context, chosenDocId, updateCommand(), matchingQuery, chosenDocProjection)

    t.test('should return null', t => {
      t.plan(1)
      t.strictSame(r, null)
    })

    checkDocumentsInDatabase(t, collection, [chosenDoc._id], fixtures.filter(d => d._id !== chosenDoc._id))
  })

  t.test('with a document in draft', async t => {
    t.plan(2)

    await clearCollectionAndInsertFixtures(collection)

    const matchingQuery = { price: { $lt: 0 } }

    const r = await crudService.patchById(context, fixtures[4]._id, updateCommand(), matchingQuery)

    t.test('should return null', t => {
      t.plan(1)
      t.strictSame(r, null)
    })

    checkDocumentsInDatabase(t, collection, [fixtures[4]._id], fixtures.filter(d => d._id !== fixtures[4]._id))
  })

  t.test('with a document in draft and declaring the __STATE__ draft', async t => {
    t.plan(2)

    await clearCollectionAndInsertFixtures(collection)

    const matchingQuery = { price: { $gt: 0 } }

    const r = await crudService.patchById(
      context,
      fixtures[4]._id,
      updateCommand(),
      matchingQuery,
      {},
      [STATES.DRAFT]
    )

    t.test('should return the document', t => {
      t.plan(1)
      t.strictNotSame(r, null)
    })

    checkDocumentsInDatabase(t, collection, [fixtures[4]._id], fixtures.filter(d => d._id !== fixtures[4]._id))
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
    {
      name: 'push',
      cmd: { $push: { tags: 'new-tag' } },
      updatedFields: { tags: chosenDoc.tags.concat(['new-tag']), updatedAt: context.now, updaterId: newUpdaterId },
    },
    {
      name: 'addToSet',
      cmd: { $addToSet: { tags: 'new-tag' } },
      updatedFields: { tags: chosenDoc.tags.concat(['new-tag']), updatedAt: context.now, updaterId: newUpdaterId },
    },
    {
      name: 'pull',
      cmd: { $pull: { tags: 'tag3' } },
      updatedFields: { tags: ['tag4'], updatedAt: context.now, updaterId: newUpdaterId },
    },
    {
      name: 'addToSet no duplicates',
      cmd: { $addToSet: { tags: chosenDoc.tags[0] } },
      updatedFields: { tags: chosenDoc.tags, updatedAt: context.now, updaterId: newUpdaterId },
    },
  ]
  t.test('all commands', t => {
    t.plan(testConf.length)

    testConf.forEach(conf => {
      t.test(conf.name, async t => {
        t.plan(3)

        await clearCollectionAndInsertFixtures(collection)

        const ret = await crudService.patchById(context, chosenDocId, conf.cmd, {}, chosenDocProjection)

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
          await crudService.patchById(context, chosenDocId, testConf.cmd)
          t.fail()
        } catch (error) {
          t.ok(testConf.regex.test(error.message), error.message)
        }
      })
    })
  })

  const updateArrayNestedObject = () => ({ $set: { 'attachments.$.name': 'renamed' } })
  const updateNumberArrayObject = () => ({ $set: { 'tagIds.$': 2 } })
  const updatedObjectWithArray = {
    ...fixtures[0],
    attachments: [
      {
        ...fixtures[0].attachments[0],
        name: 'renamed',
      },
      {
        name: 'another-note',
        other: 'stuff',
      },
    ],
    [UPDATEDAT]: context.now,
    [UPDATERID]: context.userId,
  }
  const updatedObjectWithNumberArray = {
    ...fixtures[0],
    tagIds: [2, 5],
    [UPDATEDAT]: context.now,
    [UPDATERID]: context.userId,
  }

  const arrayQuery = { 'attachments.name': 'note' }
  const [doc] = fixtures
  const docId = doc._id
  const docProjection = Object.keys(doc)

  t.test('update nested object in array', async t => {
    t.plan(2)

    await clearCollectionAndInsertFixtures(collection)

    const ret = await crudService.patchById(context, docId, updateArrayNestedObject(), arrayQuery, docProjection)
    t.test('should return the updated object', t => {
      t.plan(1)
      t.strictSame(ret, updatedObjectWithArray)
    })

    t.test('should update the doc from the database', async t => {
      t.plan(1)
      const doc = await collection.findOne({ _id: docId })
      t.strictSame(doc, updatedObjectWithArray)
    })
  })

  t.test('update number array element', async t => {
    t.plan(2)

    await clearCollectionAndInsertFixtures(collection)

    const ret = await crudService.patchById(context, docId, updateNumberArrayObject(), { tagIds: 1 }, docProjection)
    t.test('should return the updated object', t => {
      t.plan(1)
      t.strictSame(ret, updatedObjectWithNumberArray)
    })

    t.test('should update the doc from the database', async t => {
      t.plan(1)
      const doc = await collection.findOne({ _id: docId })
      t.strictSame(doc, updatedObjectWithNumberArray)
    })
  })

  const updateNumberArrayToStringObject = () => ({ $set: { 'tagIds.$': '2' } })

  const updatedObjectWithStringNumberArray = {
    ...fixtures[0],
    tagIds: ['2', 5],
    [UPDATEDAT]: context.now,
    [UPDATERID]: context.userId,
  }

  t.test('update array of numbers element to number string', async t => {
    t.plan(2)

    await clearCollectionAndInsertFixtures(collection)

    const ret = await crudService.patchById(
      context,
      docId,
      updateNumberArrayToStringObject(),
      { tagIds: 1 },
      docProjection
    )

    t.test('should return the updated object', t => {
      t.plan(1)
      t.strictSame(ret, updatedObjectWithStringNumberArray)
    })

    t.test('should update the doc from the database', async t => {
      t.plan(1)
      const doc = await collection.findOne({ _id: docId })
      t.strictSame(doc, updatedObjectWithStringNumberArray)
    })
  })
})
