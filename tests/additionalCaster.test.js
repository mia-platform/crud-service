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
const { castItem, castCollectionId } = require('../lib/AdditionalCaster')
const { ObjectId } = require('mongodb')

tap.test('AdditionalCaster', test => {
  test.test('old configuration', async assert => {
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
      assert.test(name, async test => {
        const result = castItem(document)
        test.strictSame(result, expectedResult)
        test.end()
      })
    }
    assert.end()
  })

  test.test('new configuration', async assert => {
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
      assert.test(name, test => {
        const result = castItem(document)
        test.strictSame(result, expectedResult)
        test.end()
      })
    }
    assert.end()
  })

  test.end()
})

tap.test('castCollectionId', async t => {
  const objectId = '111111111111111111111111'
  const stringId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

  t.test('works for both types of input', assert => {
    const castedObjectId = castCollectionId(objectId)
    const castedStringId = castCollectionId(stringId)

    assert.ok(castedObjectId)
    assert.equal(typeof castedObjectId, 'object')

    assert.ok(castedStringId)
    assert.equal(typeof castedStringId, 'string')

    assert.end()
  })
})
