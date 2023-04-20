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
const collectionDefinition = require('./collectionDefinitions/books')
const newCollectionDefinition = require('./collectionDefinitions/books')
const ResultCaster = require('../lib/ResultCaster')

tap.test('ResultCaster', test => {
  test.test('old configuration', assert => {
    const resultCaster = new ResultCaster(collectionDefinition)

    const testCases = [
      {
        name: 'should return document as it is',
        document: {
          name: 'Cracking the code interview',
          author: 'Gayle Laakmann',
          price: 29.99,
          isPromoted: false,
          tags: ['Programming', 'Computer Science', 'New'],
          publishDate: new Date('2015-01-01T00:00:00.000Z'),
        },
        expectedResult: {
          name: 'Cracking the code interview',
          author: 'Gayle Laakmann',
          price: 29.99,
          isPromoted: false,
          tags: ['Programming', 'Computer Science', 'New'],
          publishDate: new Date('2015-01-01T00:00:00.000Z'),
        },
      },
      {
        name: 'should cast number field from string',
        document: {
          name: 'The you you are',
          author: 'Dr. Ricken Lazlo Hale, PhD',
          price: '22.99',
        },
        expectedResult: {
          name: 'The you you are',
          author: 'Dr. Ricken Lazlo Hale, PhD',
          price: 22.99,
        },
      },
      {
        name: 'should cast GeoPoint fields',
        document: {
          name: 'Node cookbook',
          author: 'David Mark Clements, Mathias Buss, Matteo Collina, Peter Elger',
          position: {
            coordinates: [45.46, 9.19],
          },
        },
        expectedResult: {
          name: 'Node cookbook',
          author: 'David Mark Clements, Mathias Buss, Matteo Collina, Peter Elger',
          position: [45.46, 9.19],
        },
      },
    ]

    for (const { name, document, expectedResult } of testCases) {
      assert.test(name, test => {
        test.plan(1)
        resultCaster.castItem(document)
        test.strictSame(document, expectedResult)
        test.end()
      })
    }
    assert.end()
  })

  test.test('new configuration', assert => {
    const resultCaster = new ResultCaster(newCollectionDefinition)

    const testCases = [
      {
        name: 'should return document as it is',
        document: {
          name: 'Cracking the code interview',
          author: 'Gayle Laakmann',
          price: 29.99,
          isPromoted: false,
          tags: ['Programming', 'Computer Science', 'New'],
          publishDate: new Date('2015-01-01T00:00:00.000Z'),
        },
        expectedResult: {
          name: 'Cracking the code interview',
          author: 'Gayle Laakmann',
          price: 29.99,
          isPromoted: false,
          tags: ['Programming', 'Computer Science', 'New'],
          publishDate: new Date('2015-01-01T00:00:00.000Z'),
        },
      },
      {
        name: 'should cast number field from string',
        document: {
          name: 'The you you are',
          author: 'Dr. Ricken Lazlo Hale, PhD',
          price: '22.99',
        },
        expectedResult: {
          name: 'The you you are',
          author: 'Dr. Ricken Lazlo Hale, PhD',
          price: 22.99,
        },
      },
      {
        name: 'should cast GeoPoint fields',
        document: {
          name: 'Node cookbook',
          author: 'David Mark Clements, Mathias Buss, Matteo Collina, Peter Elger',
          position: {
            coordinates: [45.46, 9.19],
          },
        },
        expectedResult: {
          name: 'Node cookbook',
          author: 'David Mark Clements, Mathias Buss, Matteo Collina, Peter Elger',
          position: [45.46, 9.19],
        },
      },
    ]

    for (const { name, document, expectedResult } of testCases) {
      assert.test(name, test => {
        test.plan(1)
        resultCaster.castItem(document)
        test.strictSame(document, expectedResult)
        test.end()
      })
    }
    assert.end()
  })

  test.end()
})
