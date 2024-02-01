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
const { omit: lomit } = require('lodash')

const { STATES } = require('../lib/consts')
const CrudService = require('../lib/CrudService')
const { sortByPrice, sortByName, sortByDate, sortByAttachmentsName } = require('./utils')
const {
  fixtures,
  publicFixtures,
  draftFixture,
  RAW_PROJECTION_PLAIN_INCLUSIVE,
  RAW_PROJECTION_PLAIN_EXCLUSIVE,
} = require('./utils')
const { setUpTest } = require('./httpInterface.utils')

const EMPTY_QUERY = {}
const ONLY_ID_PROJECTION = []
const ALL_FIELDS = Object.keys(publicFixtures[0])

const context = {
  log: abstractLogger,
  userId: 'my-user-id',
  now: new Date('2018-02-08'),
}

tap.test('aggregate', async t => {
  const { collection } = await setUpTest(t)
  const crudService = new CrudService(collection, STATES.PUBLIC)

  await t.test('should return all the documents if no query are specified', async t => {
    const data = await crudService.aggregate(context, EMPTY_QUERY, ALL_FIELDS).toArray()

    t.strictSame(data, publicFixtures)
  })

  await t.test('query', async t => {
    await t.test('should return only the matched documents', async t => {
      const PRICE_LIMIT = 20

      const data = await crudService.aggregate(context, { price: { $gt: PRICE_LIMIT } }, ALL_FIELDS).toArray()

      t.strictSame(data, publicFixtures.filter(d => d.price > PRICE_LIMIT))
    })

    await t.test('could return an empty array', async t => {
      const data = await crudService.aggregate(context, { foo: 'bar' }, ONLY_ID_PROJECTION).toArray()

      t.strictSame(data, [])
    })
  })

  await t.test('query regex', async t => {
    await t.test('should return only the matched documents', async t => {
      const data = await crudService.aggregate(context, {
        name: {
          $regex: 'ulysses',
          $options: 'si',
        },
      }, ALL_FIELDS).toArray()

      t.strictSame(data, publicFixtures.filter(d => /ulysses/i.test(d.name)))
    })

    await t.test('could return an empty array', async t => {
      const data = await crudService.aggregate(context, { foo: 'bar' }, ONLY_ID_PROJECTION).toArray()

      t.strictSame(data, [])
    })
  })

  await t.test('projection', async t => {
    await t.test('should return only the specified fields', async t => {
      const data = await crudService.aggregate(context, EMPTY_QUERY, ['name', 'price', 'isPromoted']).toArray()

      t.strictSame(data, publicFixtures.map(d => {
        return {
          _id: d._id,
          name: d.name,
          price: d.price,
          isPromoted: d.isPromoted,
        }
      }))
    })

    await t.test('should manage custom projection', async t => {
      const customProjection = [
        { _id: 0 },
        {
          value: {
            $toObjectId: '$_id',
          },
        },
        {
          label: {
            $toString: {
              $concat: ['$name', ' ', '$author', ' (', '$isbn', ')'],
            },
          },
        },
      ]

      const data = await crudService.aggregate(context, EMPTY_QUERY, customProjection).toArray()

      t.strictSame(data, publicFixtures.map(d => {
        return {
          value: d._id,
          label: `${d.name} ${d.author} (${d.isbn})`,
        }
      }))
    })

    await t.test('should return only _id if no projection is specified', async t => {
      const data = await crudService.aggregate(context, EMPTY_QUERY, ONLY_ID_PROJECTION).toArray()

      t.strictSame(data.map(mapOnlyId), publicFixtures.map(mapOnlyId))
    })

    await t.test('should return only _id without projection', async t => {
      const data = await crudService.aggregate(context, EMPTY_QUERY).toArray()

      t.strictSame(data.map(mapOnlyId), publicFixtures.map(mapOnlyId))
    })
  })

  await t.test('order', async t => {
    await t.test('should return with the correct order ascendant', async t => {
      const data = (await crudService.aggregate(context, EMPTY_QUERY, ['price'], { price: 1 }).toArray())
        .map(mapOnlyId)

      const expectedSortedIds = publicFixtures
        .sort((a, b) => sortByPrice(a, b, 1))
        .map(mapOnlyId)

      t.strictSame(data, expectedSortedIds)
    })

    await t.test('should return with the correct order descendent', async t => {
      const data = (await crudService.aggregate(context, EMPTY_QUERY, ['price'], { price: -1 }).toArray())
        .map(mapOnlyId)

      const expectedSortedIds = publicFixtures
        .sort((a, b) => sortByPrice(a, b, -1))
        .map(mapOnlyId)

      t.strictSame(data, expectedSortedIds)
    })

    await t.test('should return with the correct order ascendant for multiple fields', async t => {
      const data = (await crudService.aggregate(context, EMPTY_QUERY, ['price', 'name'], { price: 1, name: 1 }).toArray())
        .map(mapOnlyId)

      const expectedSortedIds = publicFixtures
        .sort((a, b) => sortByName(a, b, 1))
        .sort((a, b) => sortByPrice(a, b, 1))
        .map(mapOnlyId)

      t.strictSame(data, expectedSortedIds)
    })

    await t.test('should return with the correct order descendent for multiple fields', async t => {
      const data = (await crudService.aggregate(
        context,
        EMPTY_QUERY,
        ['price', 'name'],
        { price: -1, name: -1 }
      ).toArray()).map(mapOnlyId)

      const expectedSortedIds = publicFixtures
        .sort((a, b) => sortByName(a, b, -1))
        .sort((a, b) => sortByPrice(a, b, -1))
        .map(mapOnlyId)

      t.strictSame(data, expectedSortedIds)
    })

    await t.test('should return with the correct order: ascendant for the first field, descendent for the second', async t => {
      const data = (await crudService.aggregate(context, EMPTY_QUERY, ['price', 'name'], { price: 1, name: -1 }).toArray())
        .map(mapOnlyId)

      const expectedSortedIds = publicFixtures
        .sort((a, b) => sortByName(a, b, -1))
        .sort((a, b) => sortByPrice(a, b, 1))
        .map(mapOnlyId)

      t.strictSame(data, expectedSortedIds)
    })

    await t.test('should return with the correct order: descendent for the first field, ascendant for the second', async t => {
      const data = (await crudService.aggregate(context, EMPTY_QUERY, ['price', 'name'], { price: -1, name: 1 }).toArray())
        .map(mapOnlyId)

      const expectedSortedIds = publicFixtures
        .sort((a, b) => sortByName(a, b, 1))
        .sort((a, b) => sortByPrice(a, b, -1))
        .map(mapOnlyId)

      t.strictSame(data, expectedSortedIds)
    })

    await t.test('should return with the correct order: descendent for the first field, ascendant for the second and the third', async t => {
      const data = (await crudService.aggregate(
        context,
        EMPTY_QUERY,
        ['price', 'name', 'publishDate'],
        { price: -1, name: 1, publishDate: 1 }
      ).toArray()).map(mapOnlyId)

      const expectedSortedIds = publicFixtures
        .sort((a, b) => sortByDate(a, b, 1))
        .sort((a, b) => sortByName(a, b, 1))
        .sort((a, b) => sortByPrice(a, b, -1))
        .map(mapOnlyId)

      t.strictSame(data, expectedSortedIds)
    })

    await t.test('should return with the correct order: descendent for the first field, ascendant for the second (array) and for the third', async t => {
      const data = (await crudService.aggregate(
        context,
        EMPTY_QUERY,
        ['price', 'name', 'publishDate'],
        { price: -1, 'attachments.name': 1, publishDate: 1 }
      ).toArray()).map(mapOnlyId)

      const expectedSortedIds = publicFixtures
        .sort((a, b) => sortByDate(a, b, 1))
        .sort((a, b) => sortByAttachmentsName(a, b, 1))
        .sort((a, b) => sortByPrice(a, b, -1))
        .map(mapOnlyId)

      t.strictSame(data, expectedSortedIds)
    })
  })

  await t.test('skip', async t => {
    await t.test('should return with the correct order ascendant', async t => {
      const SKIP_COUNT = 2

      const data = (await crudService.aggregate(
        context,
        EMPTY_QUERY,
        ['price'],
        { price: 1 },
        SKIP_COUNT
      ).toArray()).map(mapOnlyId)

      const expectedSortedIds = publicFixtures
        .sort((a, b) => sortByPrice(a, b, 1))
        .slice(SKIP_COUNT)
        .map(mapOnlyId)

      t.strictSame(data, expectedSortedIds)
    })
  })

  await t.test('limit', async t => {
    await t.test('should limit the returned documents', async t => {
      const LIMIT = 3

      const data = (await crudService.aggregate(
        context,
        EMPTY_QUERY,
        ['price'],
        { price: 1 },
        0,
        LIMIT
      ).toArray()).map(mapOnlyId)

      const expectedSortedIds = publicFixtures
        .sort((a, b) => sortByPrice(a, b, 1))
        .slice(0, LIMIT)
        .map(mapOnlyId)

      t.equal(data.length, LIMIT)
      t.strictSame(data, expectedSortedIds)
    })
  })

  await t.test('in draft', async t => {
    await t.test('should return only the documents in draft', async t => {
      const data = await crudService.aggregate(
        context,
        EMPTY_QUERY,
        ['price'],
        { price: 1 },
        0,
        500,
        [STATES.DRAFT]
      ).toArray()

      t.strictSame(data.map(mapOnlyId), [mapOnlyId(draftFixture)])
    })
  })

  await t.test('rawProjection', async t => {
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
      return lomit(docCopy, ['attachments', 'isbn', 'price'])
    })

    await t.test('should return only the right fields', async t => {
      const data = await crudService.aggregate(
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

    await t.test('should override fields in _p parameter', async t => {
      const data = await crudService.aggregate(
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

    await t.test('should exclude specified fields', async t => {
      const data = await crudService.aggregate(
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

    await t.test('should exclude specified fields overriding existing _p specification', async t => {
      const data = await crudService.aggregate(
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

    await t.test('should exclude specified fields overriding existing _p specification', async t => {
      const data = await crudService.aggregate(
        context,
        {
          $and: [
            {
              $text: {
                $search: 'Ulyss',
              },
            },
          ],
        },
        undefined,
        undefined,
        undefined,
        undefined,
        [STATES.DRAFT, STATES.PUBLIC, STATES.TRASH, STATES.DELETED],
        true
      ).toArray()

      t.strictSame(data, [{ _id: expectedDocs[0]._id, score: 1 }])
    })
  })
}).then()

function mapOnlyId(d) {
  return { _id: d._id.toString() }
}
