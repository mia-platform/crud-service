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

const booksNewCollectionDefinition = require('./newCollectionDefinitions/books')
const booksCollectionDefinition = require('./collectionDefinitions/books')
const booksEncryptedNewCollectionDefinition = require('./newCollectionDefinitions/books_encrypted')
const booksEncryptedCollectionDefinition = require('./collectionDefinitions/books_encrypted')

const projectsCollectionDefinition = require('./collectionDefinitions/projects')

const {
  UPDATERID,
  UPDATEDAT,
  CREATORID,
  CREATEDAT,
  __STATE__,
} = require('../lib/consts')
const { getFieldDefinition, getFieldDefinitionNameFromQuery } = require('../lib/QueryParser.utils')

tap.test('queryParser utils', t => {
  t.test('getFieldDefinition', t => {
    t.test('books collection', t => {
      const EXPECTED_BOOKS_FIELD_DEFINITION = {
        _id: 'ObjectId',
        name: 'string',
        isbn: 'string',
        price: 'number',
        author: 'string',
        authorAddressId: 'ObjectId',
        isPromoted: 'boolean',
        publishDate: 'Date',
        position: 'GeoPoint',
        tags: 'Array',
        'tags.__items': 'string',
        tagIds: 'Array',
        'tagIds.__items': 'number',
        'tagObjectIds': 'Array',
        'tagObjectIds.__items': 'ObjectId',
        additionalInfo: 'RawObject',
        signature: 'RawObject',
        metadata: 'RawObject',
        attachments: 'Array',
        editionsDates: 'Array',
        'signature.name': 'string',
        'metadata.somethingString': 'string',
        'metadata.somethingNumber': 'number',
        'metadata.somethingArrayObject': 'Array',
        'metadata.somethingArrayObject.arrayItemObjectChildNumber': 'number',
        'metadata.somethingArrayObject.anotherNumber': 'number',
        'metadata.somethingArrayObject.integerNum': 'integer',
        'metadata.somethingArrayObject.anotherObject': 'RawObject',
        'metadata.somethingObject': 'RawObject',
        'metadata.somethingObject.childNumber': 'number',
        'metadata.somethingArrayOfNumbers': 'Array',
        'metadata.somethingArrayOfNumbers.__items': 'number',
        'metadata.exampleArrayOfArray': 'Array',
        'attachments.name': 'string',
        'attachments.detail': 'RawObject',
        'attachments.detail.size': 'number',
        'attachments.nestedArr': 'Array',
        'attachments.nestedArr.__items': 'number',
        'attachments.additionalInfo': 'RawObject',
        'attachments.other': 'string',
        'attachments.size': 'number',
        'attachments.stuff': 'number',
        'attachments.more': 'Array',
        'attachments.more.__items': 'string',
        'editionsDates.edition': 'number',
        'editionsDates.date': 'Date',
        [UPDATERID]: 'string',
        [UPDATEDAT]: 'Date',
        [CREATORID]: 'string',
        [CREATEDAT]: 'Date',
        [__STATE__]: 'string',
      }

      t.test('with legacy definition', t => {
        const result = getFieldDefinition(booksCollectionDefinition)
        t.strictSame(result, EXPECTED_BOOKS_FIELD_DEFINITION)

        t.end()
      })

      t.test('with JSON Schema', t => {
        const result = getFieldDefinition(booksNewCollectionDefinition)
        t.strictSame(result, EXPECTED_BOOKS_FIELD_DEFINITION)

        t.end()
      })

      t.end()
    })

    t.test('books_encrypted collection', t => {
      const EXPECTED_BOOKS_ENCRYPTED_FIELD_DEFINITION = {
        _id: 'ObjectId',
        name: 'string',
        isbn: 'string',
        price: 'number',
        author: 'string',
        authorAddressId: 'ObjectId',
        isPromoted: 'boolean',
        publishDate: 'Date',
        position: 'GeoPoint',
        tags: 'Array',
        'tags.__items': 'string',
        tagIds: 'Array',
        'tagIds.__items': 'number',
        additionalInfo: 'RawObject',
        metadata: 'RawObject',
        attachments: 'Array',
        editionsDates: 'Array',
        'metadata.somethingString': 'string',
        'metadata.somethingNumber': 'number',
        'metadata.somethingArrayObject': 'Array',
        'metadata.somethingArrayObject.arrayItemObjectChildNumber': 'number',
        'metadata.somethingArrayObject.anotherNumber': 'number',
        'metadata.somethingArrayObject.anotherObject': 'RawObject',
        'metadata.somethingObject': 'RawObject',
        'metadata.somethingObject.childNumber': 'number',
        'metadata.somethingArrayOfNumbers': 'Array',
        'metadata.somethingArrayOfNumbers.__items': 'number',
        'metadata.exampleArrayOfArray': 'Array',
        'attachments.name': 'string',
        'attachments.detail': 'RawObject',
        'attachments.detail.size': 'number',
        'attachments.nestedArr': 'Array',
        'attachments.nestedArr.__items': 'number',
        'attachments.additionalInfo': 'RawObject',
        'attachments.other': 'string',
        'attachments.size': 'number',
        'attachments.stuff': 'number',
        'attachments.more': 'Array',
        'attachments.more.__items': 'string',
        [UPDATERID]: 'string',
        [UPDATEDAT]: 'Date',
        [CREATORID]: 'string',
        [CREATEDAT]: 'Date',
        [__STATE__]: 'string',
      }

      t.test('with legacy definition', t => {
        const result = getFieldDefinition(booksEncryptedCollectionDefinition)
        t.strictSame(result, EXPECTED_BOOKS_ENCRYPTED_FIELD_DEFINITION)

        t.end()
      })

      t.test('with JSON Schema', t => {
        const result = getFieldDefinition(booksEncryptedNewCollectionDefinition)
        t.strictSame(result, EXPECTED_BOOKS_ENCRYPTED_FIELD_DEFINITION)

        t.end()
      })

      t.end()
    })

    t.test('projects collection definition', t => {
      const result = getFieldDefinition(projectsCollectionDefinition)
      t.strictSame(result, {
        '_id': 'ObjectId',
        [CREATORID]: 'string',
        [CREATEDAT]: 'Date',
        [UPDATERID]: 'string',
        [UPDATEDAT]: 'Date',
        [__STATE__]: 'string',
        'name': 'string',
        'environments': 'Array',
        'environments.label': 'string',
        'environments.value': 'string',
        'environments.envId': 'string',
        'environments.dashboards': 'Array',
        'environments.dashboards.url': 'string',
        'environments.dashboards.label': 'string',
        'environments.dashboards.id': 'string',
      })

      t.end()
    })

    t.end()
  })

  t.end()
})


tap.test('getFieldDefinitionNameFromQuery', async t => {
  const testCases = [
    {
      description: 'parse root level field',
      input: 'ciaone',
      output: 'ciaone',
    },
    {
      description: 'parse root level field with digit inside',
      input: 'up2you',
      output: 'up2you',
    },
    {
      description: 'parse root level field with digit at the end',
      input: 'level1',
      output: 'level1',
    },
    {
      description: 'parse nested level field',
      input: 'configuration.consumer',
      output: 'configuration.consumer',
    },
    {
      description: 'parse multiple nested level field',
      input: 'configuration.consumer.broker.id',
      output: 'configuration.consumer.broker.id',
    },
    {
      description: 'parse nested level where array index is removed',
      input: 'orders.1.productId',
      output: 'orders.productId',
    },
    {
      description: 'parse nested level where array index is removed | digit in name is untouched',
      input: 'orders2.1.productId',
      output: 'orders2.productId',
    },
  ]

  testCases.forEach(testCase => {
    t.test(testCase.description, async assert => {
      assert.strictSame(getFieldDefinitionNameFromQuery(testCase.input), testCase.output)
    })
  })
})
