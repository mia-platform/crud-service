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
const { ObjectId } = require('mongodb')
const logger = require('pino')({ level: 'silent' })

const QueryParser = require('../lib/QueryParser')
const collectionDefinition = require('./newCollectionDefinitions/books')
const projectsCollectionDefinition = require('./collectionDefinitions/projects')
const generatePathFieldsForRawSchema = require('../lib/generatePathFieldsForRawSchema')

const {
  UPDATERID,
  UPDATEDAT,
  CREATORID,
  CREATEDAT,
  __STATE__,
} = require('../lib/consts')

tap.test('queryParser', t => {
  const nowDate = new Date()
  const nowString = nowDate.toISOString()
  const nowInteger = nowDate.getTime()

  const queryParser = new QueryParser(
    collectionDefinition,
    generatePathFieldsForRawSchema(logger, collectionDefinition)
  )

  t.test('has parsed the fields correctly', t => {
    t.plan(1)

    // eslint-disable-next-line no-underscore-dangle
    t.strictSame(queryParser._fieldDefinition, {
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
      tagIds: 'Array',
      additionalInfo: 'RawObject',
      signature: 'RawObject',
      metadata: 'RawObject',
      attachments: 'Array',
      editionsDates: 'Array',
      [UPDATERID]: 'string',
      [UPDATEDAT]: 'Date',
      [CREATORID]: 'string',
      [CREATEDAT]: 'Date',
      [__STATE__]: 'string',
    })
  })

  t.test('parseAndCast', t => {
    const tests = []
      .concat([
        {
          name: 'shoud keep the empty query as is',
          query: {},
          expected: {},
        },
      ])
      .concat(generateTestForValues('string', 'name'))
      .concat(generateTestForAllOperators('string', 'name', 'foo'))
      .concat(generateTestForAllOperators('string', 'name', null))
      .concat(generateTestForArrayOperators('string', 'name', ['foo', 'bar']))
      .concat(generateTestForArrayOperators('string', 'name', []))
      .concat(generateTestForValues('boolean', 'isPromoted'))
      .concat(generateTestForAllOperators('boolean', 'isPromoted', true))
      .concat(generateTestForAllOperators('boolean', 'isPromoted', false))
      .concat(generateTestForArrayOperators('boolean', 'isPromoted', [true, false]))
      .concat(generateTestForArrayOperators('boolean', 'isPromoted', []))
      .concat(generateTestForValues('number', 'price'))
      .concat(generateTestForAllOperators('number', 'price', 33.3))
      .concat(generateTestForAllOperators('number', 'price', '33.3'))
      .concat(generateTestForArrayOperators('number', 'price', [33.4, 55.5]))
      .concat(generateTestForArrayOperators('number', 'price', []))
      .concat([
        {
          name: 'should cast string to date',
          query: { publishDate: nowString },
          expected: { publishDate: nowDate },
        },
        {
          name: 'should cast integer to date',
          query: { publishDate: nowInteger },
          expected: { publishDate: nowDate },
        },
        {
          name: 'should cast integer to date in $in',
          query: { publishDate: { $in: [nowInteger, nowInteger] } },
          expected: { publishDate: { $in: [nowDate, nowDate] } },
        },
        {
          name: 'should cast integer to date in $in empty',
          query: { publishDate: { $in: [] } },
          expected: { publishDate: { $in: [] } },
        },
        {
          name: 'should cast integer to date in $nin',
          query: { publishDate: { $nin: [nowInteger, nowInteger] } },
          expected: { publishDate: { $nin: [nowDate, nowDate] } },
        },
        {
          name: 'should cast integer to date in $nin empty',
          query: { publishDate: { $nin: [] } },
          expected: { publishDate: { $nin: [] } },
        },
        {
          name: 'should not cast null to date',
          query: { publishDate: null },
          expected: { publishDate: null },
        },
        {
          name: 'should not cast invalid string to date',
          query: { publishDate: 'foo-bar' },
          throw: 'Invalid Date',
        },
      ])
      .concat([
        {
          name: 'should cast 24-lenght string to ObjectId',
          query: { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa' },
          expected: { _id: new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa') },
        },
        {
          name: 'should cast 12-lenght string to ObjectId',
          query: { _id: 'bbbbbbbbbbbb' },
          expected: { _id: new ObjectId('bbbbbbbbbbbb') },
        },
        {
          name: 'should not cast null to ObjectId',
          query: { _id: null },
          expected: { _id: null },
        },
        {
          name: 'should not cast invalid string to ObjectId',
          query: { _id: 'foo' },
          throw: 'Invalid objectId',
        },
        {
          name: 'should not cast number to ObjectId',
          query: { _id: 33.3 },
          throw: 'Invalid objectId',
        },
        {
          name: 'should cast 24-lenght string to ObjectId $in',
          query: { _id: { $in: ['aaaaaaaaaaaaaaaaaaaaaaaa', 'aaaaaaaaaaaaaaaaaaaaaaaa'] } },
          expected: { _id: { $in: [new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'), new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa')] } },
        },
        {
          name: 'should cast 24-lenght string to ObjectId $in empty',
          query: { _id: { $in: [] } },
          expected: { _id: { $in: [] } },
        },
        {
          name: 'should cast 24-lenght string to ObjectId $nin',
          query: { _id: { $nin: ['aaaaaaaaaaaaaaaaaaaaaaaa', 'aaaaaaaaaaaaaaaaaaaaaaaa'] } },
          expected: { _id: { $nin: [new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'), new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa')] } },
        },
        {
          name: 'should cast 24-lenght string to ObjectId $nin empty',
          query: { _id: { $nin: [] } },
          expected: { _id: { $nin: [] } },
        },
      ])
      .concat([
        {
          name: 'should cast array to GeoPoint',
          query: { position: [0, 0] },
          expected: { position: { type: 'Point', coordinates: [0, 0] } },
        },
        {
          name: 'should cast array with altitude to GeoPoint',
          query: { position: [0, 0, 0] },
          expected: { position: { type: 'Point', coordinates: [0, 0, 0] } },
        },
        {
          name: 'should throw on object for GeoPoint',
          query: { position: { lon: 0, lat: 0 } },
          throw: 'Unsupported operator: lon',
        },
        {
          name: 'should cast on $nearSphere',
          query: { position: { $nearSphere: { from: [0, 0] } } },
          expected: { position: { $nearSphere: { $geometry: { type: 'Point', coordinates: [0, 0] } } } },
        },
        {
          name: 'should cast on $nearSphere with minDistance',
          query: { position: { $nearSphere: { from: [0, 0], minDistance: 200 } } },
          expected: { position: { $nearSphere: { $geometry: { type: 'Point', coordinates: [0, 0] }, $minDistance: 200 } } },
        },
        {
          name: 'should cast on $nearSphere with maxDistance',
          query: { position: { $nearSphere: { from: [0, 0], maxDistance: 20000 } } },
          expected: { position: { $nearSphere: { $geometry: { type: 'Point', coordinates: [0, 0] }, $maxDistance: 20000 } } },
        },
        {
          name: 'should cast on $nearSphere with minDistance and maxDistance',
          query: { position: { $nearSphere: { from: [0, 0], minDistance: 200, maxDistance: 20000 } } },
          expected: { position: { $nearSphere: { $geometry: { type: 'Point', coordinates: [0, 0] }, $minDistance: 200, $maxDistance: 20000 } } },
        },
        {
          name: 'should cast on $nearSphere with altitude',
          query: { position: { $nearSphere: { from: [0, 0, 83.2] } } },
          expected: { position: { $nearSphere: { $geometry: { type: 'Point', coordinates: [0, 0, 83.2] } } } },
        },
        {
          name: 'should cast on $nearSphere with minDistance with altitude',
          query: { position: { $nearSphere: { from: [0, 0, -20], minDistance: 200 } } },
          expected: { position: { $nearSphere: { $geometry: { type: 'Point', coordinates: [0, 0, -20] }, $minDistance: 200 } } },
        },
        {
          name: 'should cast on $nearSphere with maxDistance',
          query: { position: { $nearSphere: { from: [0, 0, 4], maxDistance: 20000 } } },
          expected: { position: { $nearSphere: { $geometry: { type: 'Point', coordinates: [0, 0, 4] }, $maxDistance: 20000 } } },
        },
        {
          name: 'should cast on $nearSphere with minDistance and maxDistance',
          query: { position: { $nearSphere: { from: [0, 0, 5], minDistance: 200, maxDistance: 20000 } } },
          expected: { position: { $nearSphere: { $geometry: { type: 'Point', coordinates: [0, 0, 5] }, $minDistance: 200, $maxDistance: 20000 } } },
        },
      ])
      .concat([
        {
          name: 'array of string',
          query: { tags: 'tag1' },
          expected: { tags: 'tag1' },
        },
        {
          name: 'array of integer',
          query: { tagIds: '1' },
          expected: { tagIds: '1' },
        },
        {
          name: 'array of integer $all',
          query: { tagIds: { $all: ['1'] } },
          expected: { tagIds: { $all: ['1'] } },
        },
      ])
      .concat([
        {
          name: '$exists - string',
          query: { name: { $exists: true } },
          expected: { name: { $exists: true } },
        },
        {
          name: '$exists - integer',
          query: { price: { $exists: true } },
          expected: { price: { $exists: true } },
        },
        {
          name: '$exists - boolean',
          query: { isPromoted: { $exists: true } },
          expected: { isPromoted: { $exists: true } },
        },
        {
          name: '$exists - Date',
          query: { publishDate: { $exists: true } },
          expected: { publishDate: { $exists: true } },
        },
        {
          name: '$exists - GeoPoint',
          query: { position: { $exists: true } },
          expected: { position: { $exists: true } },
        },
        {
          name: '$exists - Array string',
          query: { tags: { $exists: true } },
          expected: { tags: { $exists: true } },
        },
        {
          name: '$exists - Array number',
          query: { tagIds: { $exists: true } },
          expected: { tagIds: { $exists: true } },
        },
        {
          name: '$exists - RawObject',
          query: { additionalInfo: { $exists: true } },
          expected: { additionalInfo: { $exists: true } },
        },
        {
          name: '$exists - Array RawObject',
          query: { attachments: { $exists: true } },
          expected: { attachments: { $exists: true } },
        },
      ])
      .concat([
        {
          name: '$elemMatch - Object Array RawObject',
          query: { attachments: { $elemMatch: { innerField: { $in: ['0', '0', '666'] } } } },
          expected: { attachments: { $elemMatch: { innerField: { $in: ['0', '0', '666'] } } } },
        },
      ])
      .concat([
        {
          name: '$and - string should not casted as string',
          query: { $and: [{ name: 'foo' }] },
          expected: { $and: [{ name: 'foo' }] },
        },
        {
          name: '$and - complex query',
          query: { $and: [{ name: { $eq: 'foo' } }, { publishDate: { $gt: nowInteger } }, { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa' }] },
          expected: { $and: [{ name: { $eq: 'foo' } }, { publishDate: { $gt: nowDate } }, { _id: new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa') }] },
        },
        {
          name: '$and - should don\'t eat others constraints',
          query: { $and: [{ name: { $eq: 'foo' } }], publishDate: { $gt: nowInteger } },
          expected: { $and: [{ name: { $eq: 'foo' } }], publishDate: { $gt: nowDate } },
        },
        {
          name: '$or - complex query',
          query: { $or: [{ name: { $eq: 'foo' } }, { publishDate: { $gt: nowInteger } }, { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa' }] },
          expected: { $or: [{ name: { $eq: 'foo' } }, { publishDate: { $gt: nowDate } }, { _id: new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa') }] },
        },
        {
          name: '$or - should don\'t eat others constraints',
          query: { $or: [{ name: { $eq: 'foo' } }], publishDate: { $gt: nowInteger } },
          expected: { $or: [{ name: { $eq: 'foo' } }], publishDate: { $gt: nowDate } },
        },
        {
          name: 'Unknown $ operator / 1',
          query: { $foo: 'foo' },
          throw: 'Unknown operator: $foo',
        },
        {
          name: 'Unknown $ operator / 2',
          query: { name: { $unknown: 'foo' } },
          throw: 'Unsupported operator: $unknown',
        },
        {
          name: 'Unknown $ operator / 3',
          query: { publishDate: { $unknown: 'foo' } },
          throw: 'Unsupported operator: $unknown',
        },
        {
          name: 'Unknown fields should throw error',
          query: { unknownField: 'foo' },
          throw: 'Unknown field: unknownField',
        },
        {
          name: 'dot separated queries names should be allowed if type is RawObject',
          query: { 'additionalInfo.note': 'foo' },
          expected: { 'additionalInfo.note': 'foo' },
        },
        {
          name: 'dot separated queries names should not be allowed if type is not RawObject',
          query: { 'name.note': 'foo' },
          throw: 'Unknown field: name.note',
        },
        {
          name: 'allow nested queries for type RawObject',
          query: { additionalInfo: { note: 'good' } },
          expected: { additionalInfo: { note: 'good' } },
        },
        {
          name: 'allow deeply nested queries for type RawObject',
          query: { additionalInfo: { note: { note: { note: { note: { note: { note: { note: 'good' } } } } } } } },
          expected: { additionalInfo: { note: { note: { note: { note: { note: { note: { note: 'good' } } } } } } } },
        },
        {
          name: 'allow nested queries with commands for type RawObject',
          query: { 'additionalInfo.note': { $ne: 'foo' } },
          expected: { 'additionalInfo.note': { $ne: 'foo' } },
        },
        {
          name: 'don\'t allow nested queries for type !== RawObject',
          query: { name: { note: 'foo' } },
          throw: 'Unsupported operator: note',
        },
      ])

    t.plan(tests.length)

    tests.forEach((testDef) => {
      if (testDef.throw) {
        t.test(testDef.name, t => {
          t.plan(1)
          try {
            queryParser.parseAndCast(testDef.query)
            t.fail('This test should fail')
          } catch (error) {
            t.strictSame(error.message, testDef.throw)
          }
        })
      } else {
        t.test(testDef.name, t => {
          t.plan(1)
          queryParser.parseAndCast(testDef.query)
          t.strictSame(testDef.query, testDef.expected)
        })
      }
    })
  })

  t.test('parseAndCastTextSearchQuery', t => {
    const tests = []
      .concat([
        {
          name: '$or clauses including a a $text query and an indexed clause',
          query: { $or: [{ isbn: 'fake isbn 2' }, { $and: [{ $text: { $search: 'Ulyss' } }] }] },
          expected: { $or: [{ isbn: 'fake isbn 2' }, { $and: [{ $text: { $search: 'Ulyss' } }] }] },
        },
        {
          name: '$or clauses including at least one $text query must be indexed',
          query: { $or: [{ author: 'James Joyce' }, { $text: { $search: 'Ulyss' } }] },
          throw: 'To use a $text query in an $or expression, all clauses in the $or array must be indexed',
        },
      ])

    t.plan(tests.length)

    tests.forEach((testDef) => {
      if (testDef.throw) {
        t.test(testDef.name, t => {
          t.plan(1)
          try {
            queryParser.parseAndCastTextSearchQuery(testDef.query)
            t.fail('This test should fail')
          } catch (error) {
            t.strictSame(error.message, testDef.throw)
          }
        })
      } else {
        t.test(testDef.name, t => {
          t.plan(1)
          queryParser.parseAndCastTextSearchQuery(testDef.query)
          t.strictSame(testDef.query, testDef.expected)
        })
      }
    })
  })

  t.test('parseAndCastBody', t => {
    const tests = [
      {
        name: 'empty',
        body: { },
        expected: { },
      },
      {
        name: 'number should not be converted',
        body: { price: 33.33 },
        expected: { price: 33.33 },
      },
      {
        name: 'string should not be converted',
        body: { name: 'foo' },
        expected: { name: 'foo' },
      },
      {
        name: 'boolean should not be converted',
        body: { isPromoted: true },
        expected: { isPromoted: true },
      },
      {
        name: 'Date should be converted / string',
        body: { publishDate: nowString },
        expected: { publishDate: nowDate },
      },
      {
        name: 'Date should be converted / integer',
        body: { publishDate: nowInteger },
        expected: { publishDate: nowDate },
      },
      {
        name: 'ObjectId should be converted / 24-string',
        body: { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa' },
        expected: { _id: new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa') },
      },
      {
        name: 'Should throw on unknown field',
        body: { foobar: 'aaaaaaaaaaaaaaaaaaaaaaaa' },
        throw: 'Unknown field: foobar',
      },
      {
        name: 'Should not convert inside RawObject fields',
        body: { additionalInfo: { date: nowString, position: [5, 2] } },
        expected: { additionalInfo: { date: nowString, position: [5, 2] } },
      },
    ]

    t.plan(tests.length)

    tests.forEach((testDef) => {
      if (testDef.throw) {
        t.test(testDef.name, t => {
          t.plan(1)
          try {
            queryParser.parseAndCastBody(testDef.body)
            t.fail()
          } catch (error) {
            t.strictSame(error.message, testDef.throw)
          }
        })
      } else {
        t.test(testDef.name, t => {
          t.plan(1)
          queryParser.parseAndCastBody(testDef.body)
          t.strictSame(testDef.body, testDef.expected)
        })
      }
    })
  })

  t.test('parseAndCastCommands', t => {
    const ALL_FIELDS = Object.keys(collectionDefinition.schema.properties)
    const tests = [
      {
        name: 'empty',
        commands: { },
        expected: { },
        editableFields: ALL_FIELDS,
      },
      {
        name: '$set / string should not be converted',
        commands: { $set: { name: 'foo' } },
        expected: { $set: { name: 'foo' } },
        editableFields: ALL_FIELDS,
      },
      {
        name: '$set / number should not be converted',
        commands: { $set: { price: 33.3 } },
        expected: { $set: { price: 33.3 } },
        editableFields: ALL_FIELDS,
      },
      {
        name: '$set / boolean should not be converted',
        commands: { $set: { isPromoted: true } },
        expected: { $set: { isPromoted: true } },
        editableFields: ALL_FIELDS,
      },
      {
        name: '$set / date number should be converted to date',
        commands: { $set: { publishDate: nowInteger } },
        expected: { $set: { publishDate: nowDate } },
        editableFields: ALL_FIELDS,
      },
      {
        name: '$set / date string should be converted to date',
        commands: { $set: { publishDate: nowString } },
        expected: { $set: { publishDate: nowDate } },
        editableFields: ALL_FIELDS,
      },
      {
        name: '$set / objectId string should be converted to ObjectId',
        commands: { $set: { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa' } },
        expected: { $set: { _id: new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa') } },
        editableFields: ALL_FIELDS,
      },
      {
        name: '$set / unknown field',
        commands: { $set: { unknownField: 'foo' } },
        throw: 'Unknown fields',
        editableFields: ALL_FIELDS,
      },
      {
        name: '$set / no editable field',
        commands: { $set: { price: 33.3 } },
        throw: 'You cannot edit "price" field',
        editableFields: ['name'],
      },
      {
        name: '$unset / date number should not be converted',
        commands: { $unset: { publishDate: nowInteger } },
        expected: { $unset: { publishDate: nowInteger } },
        editableFields: ALL_FIELDS,
      },
      {
        name: '$unset / date string should not be converted',
        commands: { $unset: { publishDate: nowString } },
        expected: { $unset: { publishDate: nowString } },
        editableFields: ALL_FIELDS,
      },
      {
        name: '$unset / objectId string should not be converted',
        commands: { $unset: { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa' } },
        expected: { $unset: { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa' } },
        editableFields: ALL_FIELDS,
      },
      {
        name: '$currentDate / boolean should not be converted',
        commands: { $currentDate: { publishDate: true } },
        expected: { $currentDate: { publishDate: true } },
        editableFields: ALL_FIELDS,
      },
      {
        name: '$push - Array string',
        commands: { $push: { tags: 'new-tag' } },
        expected: { $push: { tags: 'new-tag' } },
        editableFields: ALL_FIELDS,
      },
      {
        name: '$push - Array integer',
        commands: { $push: { tagIds: 33 } },
        expected: { $push: { tagIds: 33 } },
        editableFields: ALL_FIELDS,
      },
      {
        name: '$pull - Array integer',
        commands: { $pull: { tagIds: 33 } },
        expected: { $pull: { tagIds: 33 } },
        editableFields: ALL_FIELDS,
      },
      {
        name: '$addToSet - Array string',
        commands: { $addToSet: { tags: 'new-tag' } },
        expected: { $addToSet: { tags: 'new-tag' } },
        editableFields: ALL_FIELDS,
      },
      {
        name: '$addToSet - Array integer',
        commands: { $addToSet: { tagIds: 33 } },
        expected: { $addToSet: { tagIds: 33 } },
        editableFields: ALL_FIELDS,
      },
    ]
      .concat([
        {
          name: '$set - Array of objects replace',
          commands: { $set: { 'attachments.$.replace': { name: 'rename' } } },
          expected: { $set: { 'attachments.$': { name: 'rename' } } },
          editableFields: ALL_FIELDS,
        },
        {
          name: '$set - Array of objects merge single field',
          commands: { $set: { 'attachments.$.merge': { name: 'rename' } } },
          expected: {
            $set:
            {
              'attachments.$.name': 'rename',
            },
          },
          editableFields: ALL_FIELDS,
        },
        {
          name: '$set - Array of objects merge multiple fields',
          commands: { $set: { 'attachments.$.merge': { name: 'rename', other: 'stuff', neastedArr: [1, 2] } } },
          expected: {
            $set:
            {
              'attachments.$.name': 'rename',
              'attachments.$.other': 'stuff',
              'attachments.$.neastedArr': [1, 2],
            },
          },
          editableFields: ALL_FIELDS,
        },
        {
          name: '$set - Array of number replace to string',
          commands: { $set: { 'tagIds.$.replace': 'string' } },
          expected: { $set: { 'tagIds.$': 'string' } },
        },
        {
          name: '$set - Array of number replace to number string',
          commands: { $set: { 'tagIds.$.replace': '3' } },
          expected: { $set: { 'tagIds.$': '3' } },
        },
        {
          name: '$set - Array of dates merge to stringified date / stringified date is not parsed to Date object',
          commands: { $set: { 'editionsDates.$.merge': { date: nowString } } },
          expected: { $set: { 'editionsDates.$.date': nowString } },
        },
      ])
      .concat([
        {
          name: '$set - Array of objects merge to null',
          commands: { $set: { 'attachments.$.merge': null } },
          throw: 'Invalid value for array operation',
        },
        {
          name: '$set - Array of objects replace to null',
          commands: { $set: { 'attachments.$.replace': null } },
          throw: 'Invalid value for array operation',
        },
      ])
      .concat([
        {
          name: '$set - nested elements in raw objects is allowed',
          commands: { $set: { 'additionalInfo.foo': 5 } },
          expected: { $set: { 'additionalInfo.foo': 5 } },
        },
        {
          name: '$inc - nested elements in raw objects is allowed',
          commands: { $inc: { 'additionalInfo.foo': 5 } },
          expected: { $inc: { 'additionalInfo.foo': 5 } },
        },
        {
          name: '$unset - nested elements in raw objects is allowed',
          commands: { $unset: { 'additionalInfo.foo': 5 } },
          expected: { $unset: { 'additionalInfo.foo': 5 } },
        },
      ])
      .concat([
        {
          name: '$push - raw schema - on nested fields is allowed',
          commands: { $push: { 'attachments.0.neastedArr': 55 } },
          expected: { $push: { 'attachments.0.neastedArr': 55 } },
        },
        {
          name: '$pull - raw schema - on nested fields is allowed',
          commands: { $pull: { 'attachments.0.neastedArr': 55 } },
          expected: { $pull: { 'attachments.0.neastedArr': 55 } },
        },
        {
          name: '$addToSet - raw schema - on nested fields is allowed',
          commands: { $addToSet: { 'attachments.0.neastedArr': 55 } },
          expected: { $addToSet: { 'attachments.0.neastedArr': 55 } },
        },
      ])
      .concat([
        {
          name: '$push - raw schema - on nested object',
          commands: { $push: { 'metadata.somethingArrayOfNumbers': 7777 } },
          expected: { $push: { 'metadata.somethingArrayOfNumbers': 7777 } },
        },
        {
          name: '$push - raw schema - array inside another array',
          commands: { $push: { 'attachments.0.neastedArr': 55 } },
          expected: { $push: { 'attachments.0.neastedArr': 55 } },
        },
        {
          name: '$pull - raw schema - array inside another array',
          commands: { $pull: { 'attachments.0.neastedArr': 55 } },
          expected: { $pull: { 'attachments.0.neastedArr': 55 } },
        },
        {
          name: '$addToSet - raw schema - on nested object',
          commands: { $addToSet: { 'metadata.somethingArrayOfNumbers': 7777 } },
          expected: { $addToSet: { 'metadata.somethingArrayOfNumbers': 7777 } },
        },
        {
          name: '$addToSet - raw schema - array inside another array',
          commands: { $addToSet: { 'attachments.0.neastedArr': 55 } },
          expected: { $addToSet: { 'attachments.0.neastedArr': 55 } },
        },
        {
          name: '$.replace simple array',
          commands: { $set: { 'metadata.somethingArrayOfNumbers.$.replace': 55 } },
          expected: { $set: { 'metadata.somethingArrayOfNumbers.$': 55 } },
        },
        {
          name: '$.replace array of objects',
          commands: { $set: { 'metadata.somethingArrayObject.$.replace': { arrayItemObjectChildNumber: 33 } } },
          expected: { $set: { 'metadata.somethingArrayObject.$': { arrayItemObjectChildNumber: 33 } } },
        },
        {
          name: '$.merge array of objects',
          commands: { $set: { 'metadata.somethingArrayObject.$.merge': { arrayItemObjectChildNumber: 33 } } },
          expected: { $set: { 'metadata.somethingArrayObject.$.arrayItemObjectChildNumber': 33 } },
        },
        {
          name: '$.merge multiple nested array of objects',
          commands: {
            $set: {
              'environments.0.dashboards.$.merge': {
                url: 'http://ciao',
                label: 'foobar',
              },
            },
          },
          expected: {
            $set: {
              'environments.0.dashboards.$.url': 'http://ciao',
              'environments.0.dashboards.$.label': 'foobar',
            },
          },
          queryParser: new QueryParser(
            projectsCollectionDefinition,
            generatePathFieldsForRawSchema(logger, projectsCollectionDefinition)
          ),
        },
      ])
    t.plan(tests.length)

    tests.forEach((testDef) => {
      const testQueryParser = testDef.queryParser || queryParser
      if (testDef.throw) {
        t.test(testDef.name, t => {
          t.plan(1)
          try {
            testQueryParser.parseAndCastCommands(testDef.commands, testDef.editableFields)
            t.fail()
          } catch (error) {
            t.strictSame(error.message, testDef.throw)
          }
        })
      } else {
        t.test(testDef.name, t => {
          t.plan(1)
          testQueryParser.parseAndCastCommands(testDef.commands, testDef.editableFields)
          t.strictSame(testDef.commands, testDef.expected)
        })
      }
    })
  })

  t.test('isTextSearchQuery', t => {
    const tests = [
      {
        name: 'empty',
        query: { },
        expected: false,
      },
      {
        name: 'null values are correctly handled',
        query: { price: 33.33, quantity: { $ne: null } },
        expected: false,
      },
      {
        name: 'filter with $text search',
        query: { $text: { $search: 'Ulyss', $caseSensitive: true } },
        expected: true,
      },
      {
        name: 'filter with $text search and null values',
        query: { filter1: null, filter2: { $text: { $search: 'Ulyss', $caseSensitive: true } } },
        expected: true,
      },
      {
        name: 'null',
        query: null,
        throw: 'Cannot convert undefined or null to object',
      },
      {
        name: 'undefined',
        query: undefined,
        throw: 'Cannot convert undefined or null to object',
      },
    ]

    t.plan(tests.length)

    tests.forEach((testDef) => {
      if (testDef.throw) {
        t.test(testDef.name, t => {
          t.plan(1)
          try {
            queryParser.isTextSearchQuery(testDef.query)
            t.fail()
          } catch (error) {
            t.strictSame(error.message, testDef.throw)
          }
        })
      } else {
        t.test(testDef.name, t => {
          t.plan(1)
          const result = queryParser.isTextSearchQuery(testDef.query)
          t.strictSame(result, testDef.expected)
        })
      }
    })
  })
  t.end()
})

tap.test('queryParser $in filter', t => {
  const queries = {
    objectId: {
      fieldObjectId: { $in: [null] },
    },
    objectIdWithValue: {
      fieldObjectId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    },
    date: {
      fieldDate: { $in: [null] },
    },
  }
  const queryParser = new QueryParser({
    name: 'books',
    endpointBasePath: '/books-endpoint',
    defaultState: 'DRAFT',
    fields: [
      {
        name: 'fieldObjectId',
        type: 'ObjectId',
      },
      {
        name: 'fieldDate',
        type: 'Date',
      },
    ],
    indexes: [
    ],
  })
  t.test('test different cases of a ObjectId', t => {
    t.plan(2)
    queryParser.parseAndCast(queries.objectId)
    t.strictSame({ fieldObjectId: { $in: [null] } }, queries.objectId)

    queryParser.parseAndCast(queries.objectIdWithValue)
    t.strictSame({ fieldObjectId: new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa') }, queries.objectIdWithValue)
  })
  t.test('test different cases of a Date', t => {
    t.plan(1)
    queryParser.parseAndCast(queries.date)
    t.strictSame({ fieldDate: { $in: [null] } }, queries.date)
  })
  t.end()
})

function generateTestForValues(type, key) {
  const values = [null, 'foo', 33.3]
  return values.map(v => {
    return {
      name: `should not cast ${type} / ${JSON.stringify(v)}`,
      query: { [key]: v },
      expected: { [key]: v },
    }
  })
}

function generateTestForAllOperators(type, key, value) {
  const operators = ['$gt', '$lt', '$gte', '$lte', '$eq', '$ne']
  return operators.map(op => {
    return {
      name: `should not cast ${type} / ${op}`,
      query: { [key]: { [op]: value } },
      expected: { [key]: { [op]: value } },
    }
  })
}

function generateTestForArrayOperators(type, key, value) {
  const operators = ['$in', '$nin']
  return operators.map(op => {
    return {
      name: `should not cast ${type} / ${op}`,
      query: { [key]: { [op]: value } },
      expected: { [key]: { [op]: value } },
    }
  })
}
