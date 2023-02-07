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
const { fixtures, stationFixtures } = require('./utils')
const { setUpTest, prefix, stationsPrefix, NOT_FOUND_BODY, getHeaders } = require('./httpInterface.utils')

const [DOC] = fixtures
const ID = DOC._id.toString()
const MATCHING_PRICE = DOC.price - 1
const NON_MATCHING_PRICE = DOC.price + 1

const [STATION_DOC] = stationFixtures
const STATION_ID = STATION_DOC._id.toString()
const MATCHING_MIR_CODE = STATION_DOC.CodiceMIR
tap.test('HTTP DELETE /<id>', t => {
  const tests = [
    {
      name: 'without filter',
      url: `/${ID}`,
      acl_rows: undefined,
      deleted: true,
    },
    {
      name: 'on unknown ID',
      url: `/000000000000000000000000`,
      acl_rows: undefined,
      deleted: false,
    },
    {
      name: 'with _q',
      url: `/${ID}?_q=${JSON.stringify({ price: { $gt: MATCHING_PRICE } })}`,
      acl_rows: undefined,
      deleted: true,
    },
    {
      name: 'with non-matching _q',
      url: `/${ID}?_q=${JSON.stringify({ price: { $gt: NON_MATCHING_PRICE } })}`,
      acl_rows: undefined,
      deleted: false,
    },
    {
      name: 'with query filter',
      url: `/${ID}?price=${DOC.price}`,
      acl_rows: undefined,
      deleted: true,
    },
    {
      name: 'with query filter with matching _q',
      url: `/${ID}?price=${DOC.price}&_q=${JSON.stringify({ price: { $gt: MATCHING_PRICE } })}`,
      acl_rows: undefined,
      deleted: true,
    },
    {
      name: 'with query filter with non-matching _q',
      url: `/${ID}?price=${DOC.price}&_q=${JSON.stringify({ price: { $gt: NON_MATCHING_PRICE } })}`,
      acl_rows: undefined,
      deleted: false,
    },
    {
      name: 'with matching acl_rows',
      url: `/${ID}`,
      acl_rows: [{ price: { $gt: MATCHING_PRICE } }],
      deleted: true,
    },
    {
      name: 'with matching acl_rows and matching _q',
      url: `/${ID}?_q=${JSON.stringify({ price: { $gt: MATCHING_PRICE - 1 } })}`,
      acl_rows: [{ price: { $gt: MATCHING_PRICE } }],
      deleted: true,
    },
    {
      name: 'with matching acl_rows and non-matching _q',
      url: `/${ID}?_q=${JSON.stringify({ price: { $gt: NON_MATCHING_PRICE } })}`,
      acl_rows: [{ price: { $gt: MATCHING_PRICE } }],
      deleted: false,
    },
    {
      name: 'with state',
      url: `/${ID}?_st=${STATES.PUBLIC}`,
      acl_rows: undefined,
      deleted: true,
    },
    {
      name: 'with non-matching state',
      url: `/${ID}?_st=${STATES.DRAFT}`,
      acl_rows: undefined,
      deleted: false,
    },
    {
      name: 'with multiple state',
      url: `/${ID}?_st=${STATES.DRAFT},${STATES.PUBLIC}`,
      acl_rows: undefined,
      deleted: true,
    },
  ]

  t.plan(tests.length)

  tests.forEach(testConf => {
    const { name, deleted, ...conf } = testConf

    t.test(name, async t => {
      t.plan(5)
      const { fastify, collection } = await setUpTest(t)

      const response = await fastify.inject({
        method: 'DELETE',
        url: prefix + conf.url,
        headers: getHeaders(conf),
      })

      t.test(`should return ${deleted ? '204' : '404'}`, t => {
        t.plan(1)
        t.strictSame(response.statusCode, (deleted ? 204 : 404))
      })

      t.test('should return the right content-type', t => {
        t.plan(1)
        if (deleted) {
          t.strictSame(response.headers['content-type'], undefined)
        } else {
          t.ok(/application\/json/.test(response.headers['content-type']))
        }
      })

      t.test(`should return ${deleted ? 'undefined' : 'NOT_FOUND_BODY'}`, t => {
        t.plan(1)
        if (deleted) {
          t.strictSame(response.payload, '')
        } else {
          t.strictSame(JSON.parse(response.payload), NOT_FOUND_BODY)
        }
      })

      t.test('on GET /<id>', async t => {
        t.plan(2)

        const response = await fastify.inject({
          method: 'GET',
          url: `${prefix}/${ID}`,
        })

        if (deleted) {
          t.test('should return 404', t => {
            t.plan(1)
            t.strictSame(response.statusCode, 404)
          })
          t.test('should return the right id', t => {
            t.plan(1)
            t.strictSame(JSON.parse(response.payload), NOT_FOUND_BODY)
          })
        } else {
          t.test('should return 200', t => {
            t.plan(1)
            t.strictSame(response.statusCode, 200)
          })
          t.test('should return the right id', t => {
            t.plan(1)
            t.strictSame(JSON.parse(response.payload)._id, ID)
          })
        }
      })

      t.test('on database', async t => {
        t.plan(1)

        const document = await collection.findOne({ _id: DOC._id })

        if (deleted) {
          t.test('should not be there', t => {
            t.plan(1)
            t.strictSame(document, null)
          })
        } else {
          t.test('should be there', t => {
            t.plan(1)
            t.strictSame(document, DOC)
          })
        }
      })
    })
  })
})

tap.test('query filter on nested object with dot notation', async t => {
  const ID = '411111111111111111111111'
  const DOC = {
    ...fixtures[0],
    _id: ObjectId.createFromHexString(ID),
    metadata: {
      somethingNumber: 2,
      somethingString: 'the-saved-string',
      somethingArrayObject: [{
        arrayItemObjectChildNumber: 4,
      }],
      somethingArrayOfNumbers: [5],
    },
  }
  const { fastify, collection } = await setUpTest(t, [DOC])

  let docOnDb = await collection.findOne({ _id: DOC._id })

  t.ok(docOnDb)

  const failingDelete = await fastify.inject({
    method: 'DELETE',
    url: `${prefix}/${ID}`,
    query: {
      'metadata.somethingNumber': '999999',
    },
    headers: {},
  })

  t.strictSame(failingDelete.statusCode, 404)
  docOnDb = await collection.findOne({ _id: DOC._id })
  t.ok(docOnDb)

  const response = await fastify.inject({
    method: 'DELETE',
    url: `${prefix}/${ID}`,
    query: {
      'metadata.somethingNumber': '2',
      'metadata.somethingString': 'the-saved-string',
      'metadata.somethingArrayObject.0.arrayItemObjectChildNumber': '4',
      'metadata.somethingArrayOfNumbers.0': '5',
    },
    headers: {},
  })

  t.strictSame(response.statusCode, 204)

  docOnDb = await collection.findOne({ _id: DOC._id })
  t.notOk(docOnDb)

  t.end()
})

tap.test('HTTP DELETE /<id> with string id', t => {
  const tests = [
    {
      name: 'without filter',
      url: `/${STATION_ID}`,
      acl_rows: undefined,
      deleted: true,
    },
    {
      name: 'with _q',
      url: `/${STATION_ID}?_q=${JSON.stringify({ CodiceMIR: MATCHING_MIR_CODE })}`,
      acl_rows: undefined,
      deleted: true,
    },
  ]

  t.plan(tests.length)

  tests.forEach(testConf => {
    const { name, deleted, ...conf } = testConf

    t.test(name, async t => {
      t.plan(5)
      const { fastify, collection } = await setUpTest(t, stationFixtures, 'stations')

      const response = await fastify.inject({
        method: 'DELETE',
        url: stationsPrefix + conf.url,
        headers: getHeaders(conf),
      })

      t.test(`should return ${deleted ? '204' : '404'}`, t => {
        t.plan(1)
        t.strictSame(response.statusCode, (deleted ? 204 : 404))
      })

      t.test('should return the right content-type', t => {
        t.plan(1)
        if (deleted) {
          t.strictSame(response.headers['content-type'], undefined)
        } else {
          t.ok(/application\/json/.test(response.headers['content-type']))
        }
      })

      t.test(`should return ${deleted ? 'undefined' : 'NOT_FOUND_BODY'}`, t => {
        t.plan(1)
        if (deleted) {
          t.strictSame(response.payload, '')
        } else {
          t.strictSame(JSON.parse(response.payload), NOT_FOUND_BODY)
        }
      })

      t.test('on GET /<id>', async t => {
        t.plan(2)

        const response = await fastify.inject({
          method: 'GET',
          url: `${stationsPrefix}/${STATION_ID}`,
        })

        if (deleted) {
          t.test('should return 404', t => {
            t.plan(1)
            t.strictSame(response.statusCode, 404)
          })
          t.test('should return the right id', t => {
            t.plan(1)
            t.strictSame(JSON.parse(response.payload), NOT_FOUND_BODY)
          })
        } else {
          t.test('should return 200', t => {
            t.plan(1)
            t.strictSame(response.statusCode, 200)
          })
          t.test('should return the right id', t => {
            t.plan(1)
            t.strictSame(JSON.parse(response.payload)._id, STATION_ID)
          })
        }
      })

      t.test('on database', async t => {
        t.plan(1)

        const document = await collection.findOne({ _id: STATION_DOC._id })

        if (deleted) {
          t.test('should not be there', t => {
            t.plan(1)
            t.strictSame(document, null)
          })
        } else {
          t.test('should be there', t => {
            t.plan(1)
            t.strictSame(document, DOC)
          })
        }
      })
    })
  })
})
