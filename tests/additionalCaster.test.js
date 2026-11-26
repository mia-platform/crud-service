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

const { test } = require('node:test')
const { castItem, castCollectionId, getGeoPointPaths } = require('../lib/AdditionalCaster')
const { ObjectId } = require('mongodb')
const oldCollectionDefinition = require('./collectionDefinitions/books')
const newCollectionDefinition = require('./newCollectionDefinitions/books')

test('AdditionalCaster', test => {
  test.test('old configuration', async t => {
    const testCases = [
      {
        name: 'should return document as it is',
        document: {
          _id: new ObjectId('111111111111111111111111'),
          name: 'Cracking the code interview',
          author: 'Gayle Laakmann',
          price: 29.99,
          isPromoted: false,
          tags: ['Programming', 'Computer Science', 'New'],
          publishDate: new Date('2015-01-01T00:00:00.000Z'),
        },
        expectedResult: {
          _id: '111111111111111111111111',
          name: 'Cracking the code interview',
          author: 'Gayle Laakmann',
          price: 29.99,
          isPromoted: false,
          tags: ['Programming', 'Computer Science', 'New'],
          publishDate: '2015-01-01T00:00:00.000Z',
        },
      },
      {
        name: 'should cast GeoPoint fields',
        document: {
          _id: new ObjectId('111111111111111111111111'),
          name: 'Node cookbook',
          author: 'David Mark Clements, Mathias Buss, Matteo Collina, Peter Elger',
          position: {
            type: 'Point',
            coordinates: [45.46, 9.19],
          },
        },
        expectedResult: {
          _id: '111111111111111111111111',
          name: 'Node cookbook',
          author: 'David Mark Clements, Mathias Buss, Matteo Collina, Peter Elger',
          position: [45.46, 9.19],
        },
      },
      {
        name: 'should work on nested documents',
        document: {
          _id: new ObjectId('111111111111111111111111'),
          name: 'Cracking the code interview',
          author: 'Gayle Laakmann',
          price: 29.99,
          isPromoted: false,
          tags: ['Programming', 'Computer Science', 'New'],
          publishDate: new Date('2015-01-01T00:00:00.000Z'),
          positions: [
            {
              type: 'Point',
              coordinates: [45.46, 9.19],
            },
            {
              type: 'Point',
              coordinates: [45.00, 9.19],
            },
          ],
          library: {
            name: 'TheBookLibrary',
            coordinates: {
              type: 'Point',
              coordinates: [35.46, 9.19],
            },
            openingDate: new Date('1997-01-01T00:00:00.000Z'),
          },
        },
        expectedResult: {
          _id: '111111111111111111111111',
          name: 'Cracking the code interview',
          author: 'Gayle Laakmann',
          price: 29.99,
          isPromoted: false,
          tags: ['Programming', 'Computer Science', 'New'],
          publishDate: '2015-01-01T00:00:00.000Z',
          positions: [
            [45.46, 9.19],
            [45.00, 9.19],
          ],
          library: {
            name: 'TheBookLibrary',
            coordinates: [35.46, 9.19],
            openingDate: '1997-01-01T00:00:00.000Z',
          },
        },
      },
    ]

    for (const { name, document, expectedResult } of testCases) {
      t.test(name, async test => {
        const result = castItem(document)
        test.assert.deepStrictEqual(result, expectedResult)
      })
    }
  })

  test.test('new configuration', async t => {
    const testCases = [
      {
        name: 'should return document as it is',
        document: {
          _id: new ObjectId('111111111111111111111111'),
          name: 'Cracking the code interview',
          author: 'Gayle Laakmann',
          price: 29.99,
          isPromoted: false,
          tags: ['Programming', 'Computer Science', 'New'],
          publishDate: new Date('2015-01-01T00:00:00.000Z'),
        },
        expectedResult: {
          _id: '111111111111111111111111',
          name: 'Cracking the code interview',
          author: 'Gayle Laakmann',
          price: 29.99,
          isPromoted: false,
          tags: ['Programming', 'Computer Science', 'New'],
          publishDate: '2015-01-01T00:00:00.000Z',
        },
      },
      {
        name: 'should cast GeoPoint fields',
        document: {
          _id: new ObjectId('111111111111111111111111'),
          name: 'Node cookbook',
          author: 'David Mark Clements, Mathias Buss, Matteo Collina, Peter Elger',
          position: {
            type: 'Point',
            coordinates: [45.46, 9.19],
          },
        },
        expectedResult: {
          _id: '111111111111111111111111',
          name: 'Node cookbook',
          author: 'David Mark Clements, Mathias Buss, Matteo Collina, Peter Elger',
          position: [45.46, 9.19],
        },
      },
    ]

    for (const { name, document, expectedResult } of testCases) {
      t.test(name, test => {
        const result = castItem(document)
        test.assert.deepStrictEqual(result, expectedResult)
      })
    }
  })
})

test('castItem with declared GeoPoint paths', async t => {
  const point = (lon, lat) => ({ type: 'Point', coordinates: [lon, lat] })
  const geoPointPaths = new Set(['position', 'library.position', 'positions.__items', 'branches.position'])

  const result = castItem({
    _id: new ObjectId('111111111111111111111111'),
    publishDate: new Date('2015-01-01T00:00:00.000Z'),
    position: point(1, 2),
    positions: [point(3, 4), point(5, 6)],
    library: { position: point(7, 8), rawLocation: point(9, 10) },
    branches: [{ position: point(11, 12), rawLocation: point(13, 14) }],
    rawLocation: point(15, 16),
    rawLocations: [point(17, 18)],
  }, geoPointPaths)

  t.assert.deepStrictEqual(result, {
    _id: '111111111111111111111111',
    publishDate: '2015-01-01T00:00:00.000Z',
    position: [1, 2],
    positions: [[3, 4], [5, 6]],
    library: { position: [7, 8], rawLocation: point(9, 10) },
    branches: [{ position: [11, 12], rawLocation: point(13, 14) }],
    rawLocation: point(15, 16),
    rawLocations: [point(17, 18)],
  })

  t.assert.deepStrictEqual(castItem([{ position: point(1, 2), rawLocation: point(3, 4) }], geoPointPaths), [
    { position: [1, 2], rawLocation: point(3, 4) },
  ], 'works on a list of documents')

  t.assert.deepStrictEqual(castItem({ rawLocation: point(1, 2) }), { rawLocation: [1, 2] }, 'without paths every Point is cast')
})

test('getGeoPointPaths', async t => {
  const geoPointSchema = { type: 'object', __mia_configuration: { type: 'GeoPoint' } }
  const geoPointArraySchema = { type: 'array', items: geoPointSchema }

  t.assert.deepStrictEqual(getGeoPointPaths(oldCollectionDefinition), new Set(['position']), 'fields definition')
  t.assert.deepStrictEqual(getGeoPointPaths(newCollectionDefinition), new Set(['position']), 'schema definition')

  t.assert.deepStrictEqual(getGeoPointPaths({
    fields: [
      { name: 'position', type: 'GeoPoint', required: false },
      { name: 'library', type: 'RawObject', required: false, schema: { properties: { positions: geoPointArraySchema } } },
      { name: 'branches', type: 'Array', required: false, items: { type: 'RawObject', schema: { properties: { positions: geoPointArraySchema } } } },
    ],
  }), new Set(['position', 'library.positions.__items', 'branches.positions.__items']), 'fields definition with arrays of GeoPoint')

  t.assert.deepStrictEqual(getGeoPointPaths({
    schema: {
      type: 'object',
      properties: {
        position: geoPointSchema,
        positions: geoPointArraySchema,
        library: { type: 'object', properties: { position: geoPointSchema, positions: geoPointArraySchema } },
        branches: { type: 'array', items: { type: 'object', properties: { position: geoPointSchema, positions: geoPointArraySchema } } },
      },
    },
  }), new Set(['position', 'positions.__items', 'library.position', 'library.positions.__items', 'branches.position', 'branches.positions.__items']), 'schema definition with arrays of GeoPoint')
})

test('castCollectionId', async t => {
  const objectId = '111111111111111111111111'
  const stringId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

  t.test('works for both types of input', t => {
    const castedObjectId = castCollectionId(objectId)
    const castedStringId = castCollectionId(stringId)

    t.assert.ok(castedObjectId)
    t.assert.strictEqual(typeof castedObjectId, 'object')

    t.assert.ok(castedStringId)
    t.assert.strictEqual(typeof castedStringId, 'string')
  })
})
