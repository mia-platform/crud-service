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
const { sortByPrice, sortByName, sortByDate, sortByAttachmentsName } = require('./utils')
const {
  fixtures,
  publicFixtures,
  draftFixture,
  clearCollectionAndInsertFixtures,
  getMongoDatabaseName,
  getMongoURL,
  BOOKS_COLLECTION_NAME,
  RAW_PROJECTION_PLAIN_INCLUSIVE,
  RAW_PROJECTION_PLAIN_EXCLUSIVE,
} = require('./utils')

const EMPTY_QUERY = {}
const ONLY_ID_PROJECTION = []
const ALL_FIELDS = Object.keys(publicFixtures[0])

const context = {
  log: abstractLogger,
  userId: 'my-user-id',
  now: new Date('2018-02-08'),
}

tap.test('findAll', async t => {
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

  const crudService = new CrudService(collection, STATES.PUBLIC)

  t.test('should return all the documents if no query are specified', async t => {
    t.plan(1)

    const data = await crudService.findAll(context, EMPTY_QUERY, ALL_FIELDS).toArray()

    t.strictSame(data, publicFixtures)
  })

  t.test('query', t => {
    t.plan(2)

    t.test('should return only the matched documents', async t => {
      t.plan(1)

      const PRICE_LIMIT = 20

      const data = await crudService.findAll(context, { price: { $gt: PRICE_LIMIT } }, ALL_FIELDS).toArray()

      t.strictSame(data, publicFixtures.filter(d => d.price > PRICE_LIMIT))
    })

    t.test('could return an empty array', async t => {
      t.plan(1)

      const data = await crudService.findAll(context, { foo: 'bar' }, ONLY_ID_PROJECTION).toArray()

      t.strictSame(data, [])
    })
  })

  t.test('query regex', t => {
    t.plan(2)

    t.test('should return only the matched documents', async t => {
      t.plan(1)

      const data = await crudService.findAll(context, { name: { $regex: 'ulysses', $options: 'si' } }, ALL_FIELDS).toArray()

      t.strictSame(data, publicFixtures.filter(d => /ulysses/i.test(d.name)))
    })

    t.test('could return an empty array', async t => {
      t.plan(1)

      const data = await crudService.findAll(context, { foo: 'bar' }, ONLY_ID_PROJECTION).toArray()

      t.strictSame(data, [])
    })
  })

  t.test('projection', t => {
    t.plan(3)

    t.test('should return only the specified fields', async t => {
      t.plan(1)

      const data = await crudService.findAll(context, EMPTY_QUERY, ['name', 'price', 'isPromoted']).toArray()

      t.strictSame(data, publicFixtures.map(d => {
        return {
          _id: d._id,
          name: d.name,
          price: d.price,
          isPromoted: d.isPromoted,
        }
      }))
    })

    t.test('should return only _id if no projection is specified', async t => {
      t.plan(1)

      const data = await crudService.findAll(context, EMPTY_QUERY, ONLY_ID_PROJECTION).toArray()

      t.strictSame(data, publicFixtures.map(mapOnlyId))
    })

    t.test('should return only _id without projection', async t => {
      t.plan(1)

      const data = await crudService.findAll(context, EMPTY_QUERY).toArray()

      t.strictSame(data, publicFixtures.map(mapOnlyId))
    })
  })

  t.test('order', t => {
    t.plan(8)

    t.test('should return with the correct order ascendant', async t => {
      t.plan(1)

      const data = await crudService.findAll(context, EMPTY_QUERY, ONLY_ID_PROJECTION, { price: 1 }).toArray()
      t.strictSame(data, publicFixtures
        .sort((a, b) => sortByPrice(a, b, 1))
        .map(mapOnlyId)
      )
    })

    t.test('should return with the correct order descendent', async t => {
      t.plan(1)

      const data = await crudService.findAll(context, EMPTY_QUERY, ONLY_ID_PROJECTION, { price: -1 }).toArray()

      t.strictSame(data, publicFixtures
        .sort((a, b) => sortByPrice(a, b, -1))
        .map(mapOnlyId)
      )
    })

    t.test('should return with the correct order ascendant for multiple fields', async t => {
      t.plan(1)

      const data = await crudService.findAll(context, EMPTY_QUERY, ONLY_ID_PROJECTION, { price: 1, name: 1 }).toArray()
      t.strictSame(data, publicFixtures
        .sort((a, b) => sortByName(a, b, 1))
        .sort((a, b) => sortByPrice(a, b, 1))
        .map(mapOnlyId)
      )
    })

    t.test('should return with the correct order descendent for multiple fields', async t => {
      t.plan(1)

      const data = await crudService.findAll(
        context,
        EMPTY_QUERY,
        ONLY_ID_PROJECTION,
        { price: -1, name: -1 }
      ).toArray()
      t.strictSame(data, publicFixtures
        .sort((a, b) => sortByName(a, b, -1))
        .sort((a, b) => sortByPrice(a, b, -1))
        .map(mapOnlyId)
      )
    })

    t.test('should return with the correct order: ascendant for the first field, descendent for the second', async t => {
      t.plan(1)

      const data = await crudService.findAll(context, EMPTY_QUERY, ONLY_ID_PROJECTION, { price: 1, name: -1 }).toArray()
      t.strictSame(data, publicFixtures
        .sort((a, b) => sortByName(a, b, -1))
        .sort((a, b) => sortByPrice(a, b, 1))
        .map(mapOnlyId)
      )
    })

    t.test('should return with the correct order: descendent for the first field, ascendant for the second', async t => {
      t.plan(1)

      const data = await crudService.findAll(context, EMPTY_QUERY, ONLY_ID_PROJECTION, { price: -1, name: 1 }).toArray()
      t.strictSame(data, publicFixtures
        .sort((a, b) => sortByName(a, b, 1))
        .sort((a, b) => sortByPrice(a, b, -1))
        .map(mapOnlyId)
      )
    })

    t.test('should return with the correct order: descendent for the first field, ascendant for the second and the third', async t => {
      t.plan(1)

      const data = await crudService.findAll(
        context,
        EMPTY_QUERY,
        ONLY_ID_PROJECTION,
        { price: -1, name: 1, publishDate: 1 }
      ).toArray()
      t.strictSame(data, publicFixtures
        .sort((a, b) => sortByDate(a, b, 1))
        .sort((a, b) => sortByName(a, b, 1))
        .sort((a, b) => sortByPrice(a, b, -1))
        .map(mapOnlyId)
      )
    })

    t.test('should return with the correct order: descendent for the first field, ascendant for the second (array) and for the third', async t => {
      t.plan(1)

      const data = await crudService.findAll(
        context,
        EMPTY_QUERY,
        ONLY_ID_PROJECTION,
        { price: -1, 'attachments.name': 1, publishDate: 1 }
      ).toArray()
      t.strictSame(data, publicFixtures
        .sort((a, b) => sortByDate(a, b, 1))
        .sort((a, b) => sortByAttachmentsName(a, b, 1))
        .sort((a, b) => sortByPrice(a, b, -1))
        .map(mapOnlyId)
      )
    })
  })

  t.test('skip', t => {
    t.plan(1)

    t.test('should return with the correct order ascendent', async t => {
      t.plan(1)

      const SKIP_COUNT = 2

      const data = await crudService.findAll(
        context,
        EMPTY_QUERY,
        ONLY_ID_PROJECTION,
        { price: 1 },
        SKIP_COUNT
      ).toArray()

      t.strictSame(data, publicFixtures
        .sort((a, b) => sortByPrice(a, b, 1))
        .map(mapOnlyId)
        .slice(SKIP_COUNT)
      )
    })
  })

  t.test('limit', t => {
    t.plan(1)

    t.test('should limit the returned documents', async t => {
      t.plan(2)

      const LIMIT = 3

      const data = await crudService.findAll(
        context,
        EMPTY_QUERY,
        ONLY_ID_PROJECTION,
        { price: 1 },
        0,
        LIMIT
      ).toArray()

      t.equal(data.length, LIMIT)
      t.strictSame(data, publicFixtures
        .sort((a, b) => sortByPrice(a, b, 1))
        .map(mapOnlyId)
        .slice(0, LIMIT)
      )
    })
  })

  t.test('in draft', t => {
    t.plan(1)

    t.test('should return only the documents in draft', async t => {
      t.plan(1)

      const data = await crudService.findAll(
        context,
        EMPTY_QUERY,
        ONLY_ID_PROJECTION,
        { price: 1 },
        0,
        500,
        [STATES.DRAFT]
      ).toArray()

      t.strictSame(data, [mapOnlyId(draftFixture)])
    })
  })

  t.test('$elemMatch', t => {
    t.plan(1)

    t.test('should return only the right documents', async t => {
      t.plan(1)

      const data = await crudService.findAll(context,
        {
          attachments: {
            $elemMatch: {
              neastedArr: { $in: [3] },
            },
          },
        },
        ONLY_ID_PROJECTION,
        { price: 1 },
        0,
        500,
        [STATES.DRAFT, STATES.PUBLIC, STATES.TRASH]
      ).toArray()

      const mf = f => {
        return f.attachments
          && f.attachments.some(a => {
            return a.neastedArr && a.neastedArr.some(fp => fp === 3)
          })
      }
      t.strictSame(data, fixtures.filter(mf).map(mapOnlyId))
    })
  })

  t.test('rawProjection', t => {
    t.plan(4)

    const SORT = undefined
    const SKIP = 0
    const LIMIT = 20

    const expectedDocs = fixtures.map((doc) => {
      return doc.attachments
        ? {
          _id: doc._id,
          isbn: doc.isbn,
          price: doc.price,
          attachments: doc.attachments,
        }
        : {
          _id: doc._id,
          isbn: doc.isbn,
          price: doc.price,
        }
    })

    const expectedDocsWithExcludedFields = fixtures.map((doc) => {
      const docCopy = { ...doc }
      return omit(['attachments', 'isbn', 'price'], docCopy)
    })

    t.test('should return only the right fields', async t => {
      t.plan(1)

      const data = await crudService.findAll(
        context,
        EMPTY_QUERY,
        [...ONLY_ID_PROJECTION, RAW_PROJECTION_PLAIN_INCLUSIVE],
        SORT,
        SKIP,
        LIMIT,
        [STATES.DRAFT, STATES.PUBLIC, STATES.TRASH, STATES.DELETED]
      ).toArray()

      t.strictSame(data, expectedDocs)
    })

    t.test('should override fields in _p parameter', async t => {
      t.plan(1)

      const data = await crudService.findAll(
        context,
        EMPTY_QUERY,
        ['attachments', RAW_PROJECTION_PLAIN_INCLUSIVE],
        SORT,
        SKIP,
        LIMIT,
        [STATES.DRAFT, STATES.PUBLIC, STATES.TRASH, STATES.DELETED]
      ).toArray()

      t.strictSame(data, expectedDocs)
    })

    t.test('should exclude specified fields', async t => {
      t.plan(1)

      const data = await crudService.findAll(
        context,
        EMPTY_QUERY,
        [RAW_PROJECTION_PLAIN_EXCLUSIVE],
        SORT,
        SKIP,
        LIMIT,
        [STATES.DRAFT, STATES.PUBLIC, STATES.TRASH, STATES.DELETED]
      ).toArray()

      t.strictSame(data, expectedDocsWithExcludedFields)
    })

    t.test('should exclude specified fields overridding existing _p specification', async t => {
      t.plan(1)

      const data = await crudService.findAll(
        context,
        EMPTY_QUERY,
        ['attachments', RAW_PROJECTION_PLAIN_EXCLUSIVE],
        SORT,
        SKIP,
        LIMIT,
        [STATES.DRAFT, STATES.PUBLIC, STATES.TRASH, STATES.DELETED]
      ).toArray()

      t.strictSame(data, expectedDocsWithExcludedFields)
    })
  })
})

function mapOnlyId(d) {
  return { _id: d._id }
}
