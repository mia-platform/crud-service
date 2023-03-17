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

const mock = require('mock-require')
const { ObjectId } = require('mongodb')
const { randomUUID } = require('crypto')

const {
  __STATE__,
  STATES,
  UPDATERID,
  UPDATEDAT,
  CREATORID,
  CREATEDAT,
} = require('../lib/consts')

const date1 = new Date('2018-02-04')
const date2 = new Date('2017-11-22')

const updatedAtDate = new Date('2017-11-11')
const createdAtDate = new Date('2017-11-10')
const creatorId = 'my-creator-id'
const updaterId = 'my-updated-id'
const userId = 'foo-bar-id'

const lotOfBooksFixtures = require('./fixtures/lotOfBooksFixtures')
const fixtures = [
  {
    _id: ObjectId.createFromHexString('111111111111111111111111'),
    name: 'Ulysses',
    author: 'James Joyce',
    authorAddressId: ObjectId.createFromHexString('aaaaaaaaaaaaaaaaaaaaaaaa'),
    isbn: 'fake isbn 1',
    publishDate: date1,
    price: 33.33,
    isPromoted: true,
    position: { type: 'Point', coordinates: [0, 0, 10.3] },
    tags: ['tag1', 'tag2'],
    tagIds: [1, 5],
    additionalInfo: {
      footnotePages: [2, 3, 5, 44, 3],
      foo: 42,
      notes: {
        mynote: 'good',
      },
    },
    metadata: {
      somethingNumber: 2,
      somethingString: 'the-saved-string',
      somethingArrayObject: [{
        arrayItemObjectChildNumber: 4,
      }],
      somethingArrayOfNumbers: [5],
    },
    attachments: [
      {
        name: 'note',
        neastedArr: [1, 2, 3],
        detail: {
          size: 9,
        },
      },
      {
        name: 'another-note',
        other: 'stuff',
      },
    ],
    editionsDates: [{
      edition: 2,
      date: new Date('2019-06-07'),
    },
    {
      edition: 1,
      date: new Date('2018-04-01'),
    }],
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.PUBLIC,
  },
  {
    _id: ObjectId.createFromHexString('222222222222222222222222'),
    name: 'The Odyssey',
    publishDate: date1,
    author: 'Homer',
    isbn: 'fake isbn 2',
    price: 21.12,
    isPromoted: false,
    position: { type: 'Point', coordinates: [180, 0] },
    tags: ['tag3', 'tag4'],
    tagIds: [3, 4],
    additionalInfo: {
      note: 'good',
    },
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.PUBLIC,
  },
  {
    _id: ObjectId.createFromHexString('333333333333333333333333'),
    name: 'War and Peace',
    publishDate: date2,
    author: 'Leo Tolstoy',
    isbn: 'fake isbn 3',
    price: 25.52,
    isPromoted: false,
    position: { type: 'Point', coordinates: [-180, 0, 2] },
    tags: ['tag6', 'tag1'],
    tagIds: [11, 4],
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.PUBLIC,
  },
  {
    _id: ObjectId.createFromHexString('444444444444444444444444'),
    name: 'Moby Dick',
    publishDate: date1,
    author: 'Herman Melville',
    isbn: 'fake isbn 4',
    price: 7.70,
    isPromoted: true,
    position: { type: 'Point', coordinates: [180, 9] },
    tags: ['tag1', 'tag2'],
    tagIds: [1, 5],
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.PUBLIC,
  },
  {
    _id: ObjectId.createFromHexString('555555555555555555555555'),
    name: 'Divine commedy',
    publishDate: date2,
    author: 'Dante Alighieri',
    isbn: 'fake isbn 5',
    price: 77.70,
    isPromoted: true,
    tags: ['tag1', 'tag3'],
    tagIds: [1],
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.DRAFT,
  },
  {
    _id: ObjectId.createFromHexString('666666666666666666666666'),
    name: 'La favolosa storia delle verdure',
    publishDate: date2,
    author: 'Évelyne Bloch-Dano',
    isbn: 'fake isbn 6',
    price: 22.22,
    isPromoted: false,
    tags: ['tag1', 'tag2'],
    tagIds: [1, 5],
    additionalInfo: {
      footnotePages: [2, 3, 5, 23, 3],
      notes: {
        mynote: 'good',
      },
    },
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.TRASH,
  },
  {
    _id: ObjectId.createFromHexString('777777777777777777777777'),
    name: 'La casa sopra i portici',
    publishDate: date2,
    author: 'Carlo Verdone',
    isbn: 'fake isbn 7',
    price: 5.99,
    isPromoted: false,
    tags: ['tag1', 'tag2'],
    tagIds: [1, 5],
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.DELETED,
  },
  {
    _id: ObjectId.createFromHexString('888888888888888888888888'),
    name: 'La prigioniera',
    author: 'Debra Jo Immergut',
    isbn: 'fake isbn 8',
    price: 5,
    isPromoted: false,
    publishDate: date2,
    attachments: [
      {
        name: 'my-name',
        neastedArr: [1, 2, 66],
      },
    ],
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.PUBLIC,
  },
]

const RAW_PROJECTION = {
  attachments: {
    $filter: {
      input: '$attachments',
      as: 'item',
      cond: {
        $in: [
          '$$item.name', ['note'],
        ],
      },
    },
  },
}

const RAW_PROJECTION_FIRST_OP = {
  attachments: { $first: '$attachments' },
}

const BAD_RAW_PROJECTIONS_USAGE = [
  {
    input: {
      attachments: { $first: '$$ROOT' },
    },
    unwantedOperator: '$$ROOT',
  },
  {
    input: {
      attachments: { $first: ['$$ROOT'] },
    },
    unwantedOperator: '$$ROOT',
  },
  {
    input: {
      ent: '$$ROOT',
    },
    unwantedOperator: '$$ROOT',
  },
  {
    input: {
      precious: '$$CURRENT',
    },
    unwantedOperator: '$$CURRENT',
  },
  {
    input: {
      tree: [{ branch: 'node' }, { leaves: '$$PRUNE' }],
    },
    unwantedOperator: '$$PRUNE',
  },
  {
    input: {
      $cond: { if: { val: '$$CURRENT' }, then: '$$ROOT', else: null },
    },
    unwantedOperator: '$$CURRENT',
  },
  {
    input: {
      remove: '$$REMOVE',
    },
    unwantedOperator: '$$REMOVE',
  },
  {
    input: {
      descend: '$$DESCEND',
    },
    unwantedOperator: '$$DESCEND',
  },
  {
    input: {
      keep: '$$KEEP',
    },
    unwantedOperator: '$$KEEP',
  },
  {
    input: {
      clusterTime: '$$CLUSTER_TIME',
    },
    unwantedOperator: '$$CLUSTER_TIME',
  },
  {
    input: {
      now: '$$NOW',
    },
    unwantedOperator: '$$NOW',
  },
  {
    input: {
      doc: { $concatArrays: [['$attachments'], ['$$ROOT']] },
    },
    unwantedOperator: '$$ROOT',
  },
  {
    input: {
      reduce: {
        $reduce: {
          input: '$attachments',
          initialValue: '$$ROOT',
          in: {
            count: { $sum: 1 },
          },
        },
      },
    },
    unwantedOperator: '$$ROOT',
  },
  {
    input: {
      doc: {
        $in: ['$$CURRENT'],
      },
    },
    unwantedOperator: '$$CURRENT',
  },
]

const UNALLOWED_RAW_PROJECTIONS = [
  {
    attachments: {
      $some_not_valid_field: {
        input: '$attachments',
        as: 'item',
        cond: {
          $in: [
            '$$item.name', ['note'],
          ],
        },
      },
    },
  }, {
    foo: '$$ROOT',
  },
  {
    foo: '$bar',
  },
]

const RAW_PROJECTION_PLAIN_INCLUSIVE = {
  attachments: 1,
  price: 1,
  isbn: 1,
}

const RAW_PROJECTION_PLAIN_EXCLUSIVE = {
  attachments: 0,
  price: 0,
  isbn: 0,
}

const stationFixtures = [
  {
    _id: '002415b0-8d6d-427c-b654-9857183e57a7',
    Cap: 25040,
    CodiceMIR: 'S01788',
    Comune: 'Borgonato',
    Direttrici: [
      'D028',
    ],
    Indirizzo: 'Via Stazione, 24',
    country: 'it',
    [CREATEDAT]: createdAtDate,
    [CREATORID]: creatorId,
    [UPDATERID]: updaterId,
    [UPDATEDAT]: updatedAtDate,
    [__STATE__]: STATES.PUBLIC,
  },
]

async function clearCollectionAndInsertFixtures(collection, testFixtures = fixtures) {
  // In case of error, we do nothing here.
  // We don't want to raise error if a collection can't be dropped because it doesn't exist yet
  try {
    await collection.s.db.collection('cars').deleteMany({})
  } catch (error) { /* NOOP*/ }
  try {
    await collection.deleteMany({})
  } catch (error) { /* NOOP*/ }
  if (testFixtures !== null && testFixtures.length > 0) {
    await collection.insertMany(testFixtures)
  }
}

function checkDocumentsInDatabase(tap, collection, idsToExclude, documents) {
  tap.test('documents in database', async t => {
    const docs = await collection.find({ _id: { $nin: idsToExclude } }).toArray()

    t.equal(docs.length, documents.length)
    t.strictSame(docs, documents)
    t.end()
  })
}

function sortByPrice(a, b, sortType) {
  if (a.price === b.price) { return 0 }
  const ascending = sortType === 1
  // eslint-disable-next-line no-nested-ternary
  return ascending
    ? (a.price > b.price ? 1 : -1)
    : (a.price < b.price ? 1 : -1)
}

function sortByName(a, b, sortType) {
  const ascending = sortType === 1
  return ascending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
}

function sortByDate(a, b, sortType) {
  const ascending = sortType === 1
  return ascending ? new Date(b.date) - new Date(a.date) : new Date(a.date) - new Date(b.date)
}

function sortById(a, b, ascending) {
  // eslint-disable-next-line no-nested-ternary
  return ascending
    ? (a._id.oid > b._id.oid ? 1 : -1)
    : (a._id.oid < b._id.oid ? 1 : -1)
}

function sortByAdditionalInfo(a, b, sortType) {
  const ascending = sortType === 1
  if (!(a.additionalInfo && b.additionalInfo)) { return sortById(a, b, ascending) }
  if (a.additionalInfo && !b.additionalInfo) { return ascending ? 1 : -1 }
  if (!a.additionalInfo && b.additionalInfo) { return ascending ? -1 : 1 }
  if (a.additionalInfo.notes === b.additionalInfo.notes) { return 0 }
  if (a.additionalInfo.notes && !b.additionalInfo.notes) { return ascending ? 1 : -1 }
  if (!a.additionalInfo.notes && b.additionalInfo.notes) { return ascending ? -1 : 1 }

  return ascending
    ? a.additionalInfo.notes.localeCompare(b.additionalInfo.notes)
    : b.additionalInfo.notes.localeCompare(a.additionalInfo.notes)
}

function sortByAttachmentsName(a, b, sortType) {
  function indexOf(x, sortDirection) {
    const ascending = sortDirection === 1
    let index = 0
    let condition
    for (let i = 1; i < x.length; i++) {
      condition = ascending ? x[i].name < x[index].name : x[i].name > x[index].name
      if (condition) { index = i }
    }
    return index
  }

  const ascending = sortType === 1
  if (!(a.attachments && b.attachments)) { return sortById(a, b, ascending) }
  if (a.attachments && !b.attachments) { return ascending ? 1 : -1 }
  if (!a.attachments && b.attachments) { return ascending ? -1 : 1 }

  const aIndex = indexOf(a, sortType)
  const bIndex = indexOf(b, sortType)
  return sortByName(a.attachments[aIndex], b.attachments[bIndex], sortType)
}

const mongoHost = process.env.MONGO_HOST ?? 'mongodb://localhost:27017'

/**
 * It creates a unique name for a Database to be used in tests. The name will include a series
 * a numbers automatically generated to ensure that each test file would have its own database to perform tests in it
 *
 * @returns {string} the name of the database
 */
const getMongoDatabaseName = () => `crud-${randomUUID()}`

/**
 * Given the name of a database, returnes the complete MongoDB URL to connect with. The base path will be either
 * "localhost:27017" or the value included in the 'MONGO_HOST' environment variable
 *
 * @param {string} databaseName the name of the database
 * @returns {string} the complete URL of the MongoDB database
 */
const getMongoURL = (databaseName) => `mongodb://${mongoHost}/${databaseName}`

const BOOKS_COLLECTION_NAME = 'books'
const STATIONS_COLLECTION_NAME = 'stations'

const CRUD_LIMIT_CONSTRAINT_ENABLED = 'true'
const CRUD_MAX_LIMIT = 200

function mockObjectId() {
  mock('mongodb', {
    // eslint-disable-next-line no-shadow
    ObjectId: function ObjectId() {
      this.toString = () => '000000000000000000000000'
    },
  })
}

function mockUuidV4() {
  mock('uuid', { v4: () => '00000000-0000-4000-0000-000000000000' })
}

module.exports = {
  BOOKS_COLLECTION_NAME,
  STATIONS_COLLECTION_NAME,
  CRUD_LIMIT_CONSTRAINT_ENABLED,
  CRUD_MAX_LIMIT,
  RAW_PROJECTION,
  RAW_PROJECTION_PLAIN_INCLUSIVE,
  RAW_PROJECTION_PLAIN_EXCLUSIVE,
  RAW_PROJECTION_FIRST_OP,
  UNALLOWED_RAW_PROJECTIONS,
  BAD_RAW_PROJECTIONS_USAGE,
  getMongoDatabaseName,
  getMongoURL,
  clearCollectionAndInsertFixtures,
  checkDocumentsInDatabase,
  newUpdaterId: userId,
  oldUpdaterId: updaterId,
  fixtures,
  stationFixtures,
  lotOfBooksFixtures,
  publicFixtures: fixtures.filter(f => f[__STATE__] === STATES.PUBLIC),
  draftFixture: fixtures.filter(f => f[__STATE__] === STATES.DRAFT).pop(),
  trashFixture: fixtures.filter(f => f[__STATE__] === STATES.TRASH).pop(),
  deletedFixture: fixtures.filter(f => f[__STATE__] === STATES.DELETED).pop(),
  sortByPrice,
  sortByName,
  sortByDate,
  sortByAttachmentsName,
  sortByAdditionalInfo,
  mockObjectId,
  mockUuidV4,
}
