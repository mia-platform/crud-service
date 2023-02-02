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

const { STATES } = require('../lib/consts')
const { fixtures } = require('./utils')
const { setUpTest, prefix, getHeaders } = require('./httpInterface.utils')

const [DOC] = fixtures
const MATCHING_PRICE = DOC.price - 1
const NON_MATCHING_PRICE = DOC.price + 1

tap.test('HTTP DELETE /', t => {
  const tests = [
    {
      name: 'without filter',
      url: '/',
      acl_rows: undefined,
      databaseDocuments: fixtures.filter(f => f.__STATE__ !== STATES.PUBLIC),
    },
    {
      name: 'with _q',
      url: `/?_q=${JSON.stringify({ price: { $gt: MATCHING_PRICE } })}`,
      acl_rows: undefined,
      databaseDocuments: fixtures.filter(f => f.__STATE__ !== STATES.PUBLIC || f.price <= MATCHING_PRICE),
    },
    {
      name: 'with non-matching _q',
      url: `/?_q=${JSON.stringify({ price: { $lt: -1 } })}`,
      acl_rows: undefined,
      databaseDocuments: fixtures,
    },
    {
      name: 'with query filter',
      url: `/?price=${DOC.price}`,
      acl_rows: undefined,
      databaseDocuments: fixtures.filter(f => f.__STATE__ !== STATES.PUBLIC || f.price !== DOC.price),
    },
    {
      name: 'with query filter with matching _q',
      url: `/?price=${DOC.price}&_q=${JSON.stringify({ price: { $gt: MATCHING_PRICE } })}`,
      acl_rows: undefined,
      databaseDocuments: fixtures.filter(
        f => f.__STATE__ !== STATES.PUBLIC || (f.price !== DOC.price && f.price <= MATCHING_PRICE)
      ),
    },
    {
      name: 'with query filter with non-matching _q',
      url: `/?price=${DOC.price}&_q=${JSON.stringify({ price: { $lt: -1 } })}`,
      acl_rows: undefined,
      databaseDocuments: fixtures,
    },
    {
      name: 'with matching acl_rows',
      url: '/',
      acl_rows: [{ price: { $gt: MATCHING_PRICE } }],
      databaseDocuments: fixtures.filter(f => f.__STATE__ !== STATES.PUBLIC || f.price <= MATCHING_PRICE),
    },
    {
      name: 'with matching acl_rows and matching _q',
      url: `/?_q=${JSON.stringify({ price: { $gt: MATCHING_PRICE - 1 } })}`,
      acl_rows: [{ price: { $gt: MATCHING_PRICE } }],
      databaseDocuments: fixtures.filter(f => f.__STATE__ !== STATES.PUBLIC || f.price <= MATCHING_PRICE),
    },
    {
      name: 'with matching acl_rows and non-matching _q',
      url: `/?_q=${JSON.stringify({ price: { $gt: NON_MATCHING_PRICE } })}`,
      acl_rows: [{ price: { $gt: MATCHING_PRICE } }],
      databaseDocuments: fixtures,
    },
    {
      name: 'with state',
      url: `/?_st=${STATES.PUBLIC}`,
      acl_rows: undefined,
      databaseDocuments: fixtures.filter(f => f.__STATE__ !== STATES.PUBLIC),
    },
    {
      name: 'with multiple state',
      url: `/?_st=${STATES.DRAFT},${STATES.PUBLIC}`,
      acl_rows: undefined,
      databaseDocuments: fixtures.filter(f => f.__STATE__ !== STATES.PUBLIC && f.__STATE__ !== STATES.DRAFT),
    },
  ]

  t.plan(tests.length)

  tests.forEach(testConf => {
    const { name, databaseDocuments, ...conf } = testConf

    t.test(name, async t => {
      t.plan(4)
      const { fastify, collection } = await setUpTest(t)

      const response = await fastify.inject({
        method: 'DELETE',
        url: prefix + conf.url,
        headers: getHeaders(conf),
      })

      t.test('should return 200', t => {
        t.plan(1)
        t.strictSame(response.statusCode, 200)
      })

      t.test('should return the right content-type', t => {
        t.plan(1)
        t.ok(/application\/json/.test(response.headers['content-type']))
      })

      t.test('should return the deleted document count', t => {
        t.plan(1)
        t.strictSame(JSON.parse(response.payload), fixtures.length - databaseDocuments.length)
      })

      t.test('on database', async t => {
        t.plan(1)

        const documents = await collection.find().toArray()

        t.test('should be there', t => {
          t.plan(1)
          t.strictSame(documents, databaseDocuments)
        })
      })
    })
  })
})

tap.test('query filter on nested object with dot notation', async t => {
  const DOC_TO_DELETE_1 = {
    ...fixtures[0],
    isbn: 'isbn-1',
    _id: ObjectId.createFromHexString('111111111111111111111111'),
    metadata: {
      somethingNumber: 2,
      somethingString: 'the-saved-string',
      somethingArrayObject: [{
        arrayItemObjectChildNumber: 4,
      }],
      somethingArrayOfNumbers: [5],
    },
  }
  const DOC_TO_DELETE_2 = {
    ...fixtures[0],
    isbn: 'isbn-2',
    _id: ObjectId.createFromHexString('211111111111111111111111'),
    metadata: {
      somethingNumber: 2,
      somethingString: 'the-saved-string',
      somethingArrayObject: [{
        arrayItemObjectChildNumber: 4,
      }],
      somethingArrayOfNumbers: [5],
    },
  }

  const DOC_NOT_TO_DELETE = {
    ...fixtures[0],
    isbn: 'isbn-3',
    _id: ObjectId.createFromHexString('311111111111111111111111'),
    metadata: {
      somethingNumber: 4,
      somethingString: 'another-the-saved-string',
      somethingArrayObject: [{
        arrayItemObjectChildNumber: 4,
      }],
      somethingArrayOfNumbers: [5],
    },
  }

  const { fastify, collection } = await setUpTest(t, [DOC_TO_DELETE_1, DOC_TO_DELETE_2, DOC_NOT_TO_DELETE])

  let docsOnDb = await collection.findOne({ _id: DOC._id })

  t.ok(docsOnDb)

  const failingDelete = await fastify.inject({
    method: 'DELETE',
    url: `${prefix}/`,
    query: {
      'metadata.somethingNumber': '99999999999',
      'metadata.somethingString': 'the-saved-string',
      'metadata.somethingArrayObject.0.arrayItemObjectChildNumber': '4',
      'metadata.somethingArrayOfNumbers.0': '5',
    },
    headers: {},
  })

  t.strictSame(failingDelete.statusCode, 200)
  t.strictSame(JSON.parse(failingDelete.payload), 0)

  docsOnDb = await collection.find({}).toArray()
  t.equal(docsOnDb.length, 3)

  const response = await fastify.inject({
    method: 'DELETE',
    url: `${prefix}/`,
    query: {
      'metadata.somethingNumber': '2',
      'metadata.somethingString': 'the-saved-string',
      'metadata.somethingArrayObject.0.arrayItemObjectChildNumber': '4',
      'metadata.somethingArrayOfNumbers.0': '5',
    },
    headers: {},
  })

  t.strictSame(response.statusCode, 200)
  t.strictSame(JSON.parse(response.payload), 2)

  docsOnDb = await collection.find({}).toArray()
  t.equal(docsOnDb.length, 1)
  t.strictSame(docsOnDb[0]._id, DOC_NOT_TO_DELETE._id)

  t.end()
})
