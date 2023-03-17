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
const { MongoClient } = require('mongodb')

const createIndexes = require('../lib/createIndexes')
const {
  HASHED_FIELD,
  GEO_FIELD,
  TEXT_FIELD,
  NORMAL_INDEX,
  TEXT_INDEX,
  HASHED_INDEX,
  GEO_INDEX,
} = require('../lib/consts')

const {
  clearCollectionAndInsertFixtures,
  getMongoDatabaseName,
  getMongoURL,
  BOOKS_COLLECTION_NAME,
} = require('./utils')

tap.test('createIndexes', async t => {
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


  const nameIndex1 = `indexName1_${Math.random()}`
  const nameIndex2 = `indexName2_${Math.random()}`
  const nameIndex3 = `indexName3_${Math.random()}`
  const nameIndex4 = `indexName4_${Math.random()}`
  const nameIndex5 = `indexName5_${Math.random()}`
  const nameIndexToPreserve = `preserve_${Math.random()}`

  const testConfigs = [
    {
      name: 'ttl index',
      alreadyPresentIndexes: [],
      indexes: [
        {
          name: nameIndex5,
          type: NORMAL_INDEX,
          expireAfterSeconds: 100,
          unique: false,
          fields: [
            {
              name: 'createdAt',
              order: 1,
            },
          ],
        },
      ],
      expectedIndexes: [
        {
          v: 2,
          key: {
            createdAt: 1,
          },
          expireAfterSeconds: 100,
          name: nameIndex5,
          background: true,
        },
      ],
      expectedIndexCreatedCount: 1,
    },
    {
      name: 'geoPoint index',
      alreadyPresentIndexes: [],
      indexes: [
        {
          name: nameIndex1,
          type: GEO_INDEX,
          unique: false,
          field: 'position',
        },
      ],
      expectedIndexes: [
        {
          v: 2,
          key: {
            position: GEO_FIELD,
          },
          name: nameIndex1,
          background: true,
          '2dsphereIndexVersion': 3,
        },
      ],
      expectedIndexCreatedCount: 1,
    },
    {
      name: 'text index',
      alreadyPresentIndexes: [],
      indexes: [
        {
          name: nameIndex1,
          type: TEXT_INDEX,
          fields: [
            { name: 'name' },
            { name: 'author' },
          ],
        },
      ],
      expectedIndexes: [
        {
          v: 2,
          key: {
            _fts: TEXT_FIELD,
            _ftsx: 1,
          },
          weights: {
            name: 1,
            author: 1,
          },
          default_language: 'english',
          language_override: 'language',
          textIndexVersion: 3,
          name: nameIndex1,
          background: true,
        },
      ],
      expectedIndexCreatedCount: 1,
    },
    {
      name: 'text index with all options',
      alreadyPresentIndexes: [],
      indexes: [
        {
          name: nameIndex2,
          type: TEXT_INDEX,
          fields: [
            { name: 'name' },
            { name: 'author' },
          ],
          weights: {
            name: 2,
            author: 1,
          },
          defaultLanguage: 'es',
          languageOverride: 'isbn',
        },
      ],
      expectedIndexes: [
        {
          v: 2,
          key: {
            _fts: TEXT_FIELD,
            _ftsx: 1,
          },
          weights: {
            name: 2,
            author: 1,
          },
          default_language: 'es',
          language_override: 'isbn',
          textIndexVersion: 3,
          name: nameIndex2,
          background: true,
        },
      ],
      expectedIndexCreatedCount: 1,
    },
    {
      name: 'single index',
      alreadyPresentIndexes: [],
      indexes: [
        {
          name: nameIndex1,
          type: NORMAL_INDEX,
          unique: true,
          fields: [
            {
              name: 'name',
              order: 1,
            },
          ],
        },
      ],
      expectedIndexes: [
        {
          v: 2,
          unique: true,
          key: {
            name: 1,
          },
          name: nameIndex1,
          background: true,
        },
      ],
      expectedIndexCreatedCount: 1,
    },
    {
      name: 'multi index',
      alreadyPresentIndexes: [],
      indexes: [
        {
          name: nameIndex1,
          type: NORMAL_INDEX,
          unique: true,
          fields: [
            {
              name: 'length',
              order: 1,
            },
            {
              name: 'price',
              order: -1,
            },
          ],
        },
      ],
      expectedIndexes: [
        {
          v: 2,
          unique: true,
          key: {
            length: 1,
            price: -1,
          },
          name: nameIndex1,
          background: true,
        },
      ],
      expectedIndexCreatedCount: 1,
    },
    {
      name: 'hashed index',
      alreadyPresentIndexes: [],
      indexes: [
        {
          name: nameIndex1,
          type: HASHED_INDEX,
          unique: false,
          field: 'any',
        },
      ],
      expectedIndexes: [
        {
          v: 2,
          key: {
            any: HASHED_FIELD,
          },
          name: nameIndex1,
          background: true,
        },
      ],
      expectedIndexCreatedCount: 1,
    },
    {
      name: 'hashed index and another previous index',
      alreadyPresentIndexes: [{
        spec: {
          position: GEO_FIELD,
        },
        options: {
          name: nameIndex2,
          unique: true,
        },
      }],
      indexes: [
        {
          name: nameIndex1,
          type: HASHED_INDEX,
          unique: false,
          field: 'any',
        },
      ],
      expectedIndexes: [
        {
          v: 2,
          key: {
            any: HASHED_FIELD,
          },
          name: nameIndex1,
          background: true,
        },
      ],
      expectedIndexCreatedCount: 1,
    },
    {
      name: 'hashed index and another previous index to preserve',
      alreadyPresentIndexes: [{
        spec: {
          position: GEO_FIELD,
        },
        options: {
          name: nameIndex2,
          unique: true,
        },
      },
      {
        spec: {
          idx: HASHED_FIELD,
        },
        options: {
          name: nameIndexToPreserve,
          unique: false,
        },
      }],
      indexes: [
        {
          name: nameIndex1,
          type: HASHED_INDEX,
          unique: false,
          field: 'any',
        },
      ],
      expectedIndexes: [
        {
          v: 2,
          key: {
            idx: HASHED_FIELD,
          },
          name: nameIndexToPreserve,
        },
        {
          v: 2,
          key: {
            any: HASHED_FIELD,
          },
          name: nameIndex1,
          background: true,
        },
      ],
      expectedIndexCreatedCount: 1,
    },
    {
      name: 'previous indexes with the same names but changed, don\'t preserve',
      alreadyPresentIndexes: [{
        spec: {
          position: GEO_FIELD,
        },
        options: {
          name: nameIndex1,
          unique: false,
        },
      },
      {
        spec: {
          idx: HASHED_FIELD,
        },
        options: {
          name: nameIndex2,
          unique: false,
        },
      },
      {
        spec: {
          isbn: 1,
        },
        options: {
          name: nameIndex3,
          unique: true,
        },
      },
      {
        spec: {
          length: 1,
          price: -1,
        },
        options: {
          name: nameIndex4,
          unique: false,
        },
      }],
      indexes: [
        {
          name: nameIndex1,
          type: GEO_INDEX,
          unique: false,
          field: 'position1',
        },
        {
          name: nameIndex2,
          type: HASHED_INDEX,
          unique: false,
          field: 'idx1',
        },
        {
          name: nameIndex3,
          type: NORMAL_INDEX,
          unique: false,
          fields: [
            {
              name: 'isbn',
              order: 1,
            },
          ],
        },
        {
          name: nameIndex4,
          type: NORMAL_INDEX,
          unique: false,
          fields: [
            {
              name: 'length',
              order: 1,
            },
            {
              name: 'price',
              order: 1,
            },
          ],
        },
      ],
      expectedIndexes: [
        {
          '2dsphereIndexVersion': 3,
          v: 2,
          key: {
            position1: GEO_FIELD,
          },
          name: nameIndex1,
          background: true,
        },
        {
          v: 2,
          key: {
            idx1: HASHED_FIELD,
          },
          name: nameIndex2,
          background: true,
        },
        {
          v: 2,
          key: {
            isbn: 1,
          },
          name: nameIndex3,
          background: true,
        },
        {
          v: 2,
          key: {
            length: 1,
            price: 1,
          },
          name: nameIndex4,
          background: true,
        },
      ],
      expectedIndexCreatedCount: 4,
    },
    {
      name: 'multiple varied indexes',
      alreadyPresentIndexes: [],
      indexes: [
        {
          name: nameIndex1,
          type: HASHED_INDEX,
          unique: false,
          field: 'any',
        },
        {
          name: nameIndex2,
          type: NORMAL_INDEX,
          unique: true,
          fields: [
            {
              name: 'length',
              order: 1,
            },
            {
              name: 'price',
              order: -1,
            },
          ],
        },
        {
          name: nameIndex3,
          type: GEO_INDEX,
          unique: false,
          field: 'position',
        },
        {
          name: nameIndex5,
          type: NORMAL_INDEX,
          expireAfterSeconds: 100,
          unique: false,
          fields: [
            {
              name: 'createdAt',
              order: 1,
            },
          ],
        },
        {
          name: nameIndex4,
          type: TEXT_INDEX,
          unique: false,
          fields: [
            { name: 'name' },
            { name: 'author' },
          ],
        },
      ],
      expectedIndexes: [
        {
          v: 2,
          key: {
            any: HASHED_FIELD,
          },
          name: nameIndex1,
          background: true,
        },
        {
          v: 2,
          unique: true,
          key: {
            length: 1,
            price: -1,
          },
          name: nameIndex2,
          background: true,
        },
        {
          v: 2,
          key: {
            position: GEO_FIELD,
          },
          name: nameIndex3,
          background: true,
          '2dsphereIndexVersion': 3,
        },
        {
          v: 2,
          key: {
            createdAt: 1,
          },
          expireAfterSeconds: 100,
          name: nameIndex5,
          background: true,
        },
        {
          v: 2,
          key: {
            _fts: TEXT_FIELD,
            _ftsx: 1,
          },
          weights: {
            name: 1,
            author: 1,
          },
          default_language: 'english',
          language_override: 'language',
          textIndexVersion: 3,
          name: nameIndex4,
          background: true,
        },
      ],
      expectedIndexCreatedCount: 5,
    },
    {
      name: 'skip _id index, no other index creation',
      alreadyPresentIndexes: [],
      indexes: [
        {
          name: '_id',
          type: NORMAL_INDEX,
          unique: true,
          fields: [
            {
              name: '_id',
              order: 1,
            },
          ],
        },
      ],
      expectedIndexes: [],
      expectedIndexCreatedCount: 0,
    },
    {
      name: 'geo indexes already present in collection',
      alreadyPresentIndexes: [{
        spec: {
          position1: GEO_FIELD,
        },
        options: {
          name: nameIndex1,
          unique: false,
        },
      },
      {
        spec: {
          idx: HASHED_FIELD,
        },
        options: {
          name: nameIndex2,
          unique: false,
        },
      }],
      indexes: [
        {
          name: nameIndex1,
          type: GEO_INDEX,
          unique: false,
          field: 'position1',
        },
        {
          name: nameIndex2,
          type: HASHED_INDEX,
          unique: false,
          field: 'idx1',
        },
        {
          name: nameIndex3,
          type: HASHED_INDEX,
          unique: false,
          field: 'idx2',
        },
      ],
      expectedIndexes: [
        {
          '2dsphereIndexVersion': 3,
          v: 2,
          key: {
            position1: GEO_FIELD,
          },
          name: nameIndex1,
        },
        {
          v: 2,
          key: {
            idx1: HASHED_FIELD,
          },
          name: nameIndex2,
          background: true,
        },
        {
          v: 2,
          key: {
            idx2: HASHED_FIELD,
          },
          name: nameIndex3,
          background: true,
        },
      ],
      expectedIndexCreatedCount: 2,
    },
    {
      name: 'all indexes are same as before',
      alreadyPresentIndexes: [{
        spec: {
          position1: GEO_FIELD,
        },
        options: {
          name: nameIndex1,
          unique: false,
        },
      },
      {
        spec: {
          idx1: HASHED_FIELD,
        },
        options: {
          name: nameIndex2,
          unique: false,
        },
      },
      {
        spec: {
          createdAt: 1,
        },
        options: {
          name: nameIndex3,
          expireAfterSeconds: 100,
          unique: false,
        },
      }],
      indexes: [
        {
          name: nameIndex1,
          type: GEO_INDEX,
          unique: false,
          field: 'position1',
        },
        {
          name: nameIndex2,
          type: HASHED_INDEX,
          unique: false,
          field: 'idx1',
        },
        {
          name: nameIndex3,
          type: NORMAL_INDEX,
          expireAfterSeconds: 100,
          unique: false,
          fields: [
            {
              name: 'createdAt',
              order: 1,
            },
          ],
        },
      ],
      expectedIndexes: [
        {
          '2dsphereIndexVersion': 3,
          v: 2,
          key: {
            position1: GEO_FIELD,
          },
          name: nameIndex1,
        },
        {
          v: 2,
          key: {
            idx1: HASHED_FIELD,
          },
          name: nameIndex2,
        },
        {
          v: 2,
          key: {
            createdAt: 1,
          },
          expireAfterSeconds: 100,
          name: nameIndex3,
        },
      ],
      expectedIndexCreatedCount: 0,
    },
    {
      name: 'ttl index with different expireAfterSeconds',
      alreadyPresentIndexes: [
        {
          spec: {
            createdAt: 1,
          },
          options: {
            name: nameIndex5,
            unique: false,
            expireAfterSeconds: 1200,
            background: true,
          },
        },
      ],
      indexes: [
        {
          name: nameIndex5,
          type: NORMAL_INDEX,
          expireAfterSeconds: 86400,
          unique: false,
          fields: [
            {
              name: 'createdAt',
              order: 1,
            },
          ],
        },
      ],
      expectedIndexes: [
        {
          v: 2,
          key: {
            createdAt: 1,
          },
          expireAfterSeconds: 86400,
          name: nameIndex5,
          background: true,
        },
      ],
      expectedIndexCreatedCount: 1,
    },
    {
      name: 'index on nested fields',
      alreadyPresentIndexes: [],
      indexes: [
        {
          name: nameIndex1,
          type: NORMAL_INDEX,
          expireAfterSeconds: 100,
          unique: false,
          fields: [
            {
              name: 'attachments.detail.size',
              order: 1,
            },
          ],
        }, {
          name: nameIndex2,
          type: NORMAL_INDEX,
          expireAfterSeconds: 100,
          unique: true,
          fields: [
            {
              name: 'metadata.somethingNumber',
              order: 1,
            },
          ],
        },
      ],
      expectedIndexes: [
        {
          v: 2,
          key: {
            'attachments.detail.size': 1,
          },
          expireAfterSeconds: 100,
          name: nameIndex1,
          background: true,
        }, {
          v: 2,
          key: {
            'metadata.somethingNumber': 1,
          },
          expireAfterSeconds: 100,
          name: nameIndex2,
          background: true,
          unique: true,
        },
      ],
      expectedIndexCreatedCount: 2,
    },
    {
      name: 'index fields order updated correctly',
      alreadyPresentIndexes: [
        {
          spec: {
            aaa: 1,
            bbb: -1,
            ccc: 1,
          },
          options: {
            name: nameIndex1,
            unique: false,
            background: true,
          },
        },
      ],
      indexes: [
        {
          name: nameIndex1,
          type: NORMAL_INDEX,
          unique: false,
          fields: [
            {
              name: 'ccc',
              order: 1,
            },
            {
              name: 'bbb',
              order: -1,
            },
            {
              name: 'aaa',
              order: 1,
            },
          ],
        },
      ],
      expectedIndexes: [
        {
          v: 2,
          key: {
            ccc: 1,
            bbb: -1,
            aaa: 1,
          },
          name: nameIndex1,
          background: true,
        },
      ],
      expectedIndexCreatedCount: 1,
    },
    {
      name: 'index adding field',
      alreadyPresentIndexes: [
        {
          spec: {
            aaa: 1,
          },
          options: {
            name: nameIndex1,
            unique: false,
            background: true,
          },
        },
      ],
      indexes: [
        {
          name: nameIndex1,
          type: NORMAL_INDEX,
          unique: false,
          fields: [
            {
              name: 'aaa',
              order: 1,
            },
            {
              name: 'bbb',
              order: -1,
            },
          ],
        },
      ],
      expectedIndexes: [
        {
          v: 2,
          key: {
            aaa: 1,
            bbb: -1,
          },
          name: nameIndex1,
          background: true,
        },
      ],
      expectedIndexCreatedCount: 1,
    },
    {
      name: 'create one index with an already created one',
      alreadyPresentIndexes: [
        {
          spec: {
            aaa: 1,
          },
          options: {
            name: nameIndex1,
            unique: false,
            background: true,
          },
        },
      ],
      indexes: [
        {
          name: nameIndex2,
          type: NORMAL_INDEX,
          unique: true,
          fields: [
            {
              name: 'bbb',
              order: -1,
            },
          ],
        },
      ],
      expectedIndexes: [
        {
          v: 2,
          key: {
            bbb: -1,
          },
          name: nameIndex2,
          unique: true,
          background: true,
        },
      ],
      expectedIndexCreatedCount: 1,
    },
    {
      name: 'partial index',
      alreadyPresentIndexes: [],
      indexes: [
        {
          name: nameIndex1,
          type: TEXT_INDEX,
          fields: [
            { name: 'name' },
            { name: 'age' },
          ],
          usePartialFilter: true,
          partialFilterExpression: '{ "age": { "$gt": 30 } }',
        },
      ],
      expectedIndexes: [
        {
          v: 2,
          key: {
            _fts: TEXT_FIELD,
            _ftsx: 1,
          },
          weights: {
            name: 1,
            age: 1,
          },
          default_language: 'english',
          language_override: 'language',
          textIndexVersion: 3,
          name: nameIndex1,
          background: true,
          partialFilterExpression: { age: { $gt: 30 } },
        },
      ],
      expectedIndexCreatedCount: 1,
    },
  ]

  t.plan(testConfigs.length)
  testConfigs.forEach(({
    name,
    alreadyPresentIndexes,
    indexes,
    expectedIndexes,
    expectedIndexCreatedCount,
  }) => {
    t.test(name, async t => {
      t.plan(2 + expectedIndexes.length)
      await collection.drop()
      await database.createCollection(BOOKS_COLLECTION_NAME)
      await Promise.all(alreadyPresentIndexes
        .map(({ spec, options }) => collection.createIndex(spec, options)))
      const createdIndexNames = await createIndexes(collection, indexes, 'preserve_')
      const retIndexes = await collection.indexes()

      /* Starting in MongoDB 4.4 the `ns` field is no more included in index objects.
       * Since we are not using `ns` field in this service we remove it in the below line.
       * In this way we guarantee compatibility with MongoDB 4.4 and the previous MongoDB versions.
       * https://docs.mongodb.com/manual/reference/method/db.collection.getIndexes/
       */
      retIndexes.forEach(index => delete index.ns)
      // sort by name because the return order is not deterministic with background indexes
      // skip the first returned index as it is always the _id one
      t.strictSame(retIndexes.slice(1).sort(by('name')), expectedIndexes.sort(by('name')))
      retIndexes.slice(1).forEach(retIndex => {
        const index = expectedIndexes.find(expectedIndex => expectedIndex.name === retIndex.name)
        t.ok(JSON.stringify(index.key) === JSON.stringify(retIndex.key))
      })
      t.equal(createdIndexNames.length, expectedIndexCreatedCount)
    })
  })
})

function by(fieldName) {
  return function compare(a, b) {
    if (a[fieldName] < b[fieldName]) {
      return -1
    } else if (a[fieldName] > b[fieldName]) {
      return 1
    }
    return 0
  }
}
