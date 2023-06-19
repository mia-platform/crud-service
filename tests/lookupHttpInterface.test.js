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
const path = require('path')
const lc39 = require('@mia-platform/lc39')
const { MongoClient } = require('mongodb')

const { getHeaders } = require('./httpInterface.utils')
const {
  lookupAddressPrefix,
  expectedRidersLookup,
  riderObjectToLookup,
  ridersFixture,
} = require('./viewUtils.utils')

const {
  getMongoDatabaseName,
  getMongoURL,
} = require('./utils')

const ridersData = require('./fixtures/riders')
const ordersData = require('./fixtures/orders')
const { STATES, __STATE__ } = require('../lib/consts')

const HTTP_PUBLIC_FIXTURES = JSON.parse(JSON.stringify(expectedRidersLookup))
const COLLECTION_DEFINITION_FOLDER = path.join(__dirname, 'collectionDefinitions')
const VIEWS_DEFINITION_FOLDER = path.join(__dirname, 'viewsDefinitionsLookup')

tap.test('HTTP GET /orders-details-endpoint/lookup/rider', async t => {
  if (process.env.MONGO_VERSION <= '4.4') {
    t.skip('Lookup view not supported on Mongo version <= 4.4')
    return
  }
  const databaseName = getMongoDatabaseName()
  const mongoURL = getMongoURL(databaseName)

  const client = await MongoClient.connect(mongoURL)
  const database = client.db(databaseName)

  const logLevel = 'silent'
  const envVariables = {
    MONGODB_URL: mongoURL,
    COLLECTION_DEFINITION_FOLDER,
    USER_ID_HEADER_KEY: 'userId',
    VIEWS_DEFINITION_FOLDER,
  }

  const fastify = await lc39('./index', { logLevel, envVariables })

  t.teardown(async() => {
    await database.dropDatabase()
    await client.close()
    await fastify.close()
  })

  const ridersCollection = database.collection('riders')
  const ordersCollection = database.collection('orders')

  try {
    await ridersCollection.drop()
    await ordersCollection.drop()
  } catch (error) { /* NOOP - ignore errors when a resource is missing*/ }

  await ordersCollection.insertMany(ordersData)
  await ridersCollection.insertMany(ridersData)

  const tests = [
    {
      name: 'without filters',
      url: '/',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES,
    },
    {
      name: 'with typed filter',
      url: `/?value=${expectedRidersLookup[0].value.toString()}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.value === expectedRidersLookup[0].value.toString()),
    },
    {
      name: 'with sorting',
      url: '/?_s=label',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([])
        .sort((a, b) => a.label.localeCompare(b.label)),
    },
    {
      name: 'with invert sorting',
      url: '/?_s=-label',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([])
        .sort((a, b) => b.label.localeCompare(a.label)),
    },
    {
      name: 'with skip and limit',
      url: '/?_l=2&_sk=1',
      found: HTTP_PUBLIC_FIXTURES.concat([]).sort((a, b) => {
        if (a._id === b._id) {
          return 0
        }
        return a._id >= b._id ? 1 : -1
      })
        .slice(1, 3),
    },
    {
      name: 'with projection',
      url: '/?_p=value',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.map(f => ({ value: f.value })),
    },
    {
      name: 'with query filter',
      url: `/?label=${expectedRidersLookup[0].label}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.label === expectedRidersLookup[0].label),
    },
    {
      name: 'with filter regex',
      url: `/?_q=${JSON.stringify({ label: { $regex: 'Mar', $options: 'i' } })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(f => /Mar/i.test(f.label)),
    },
    {
      name: 'with non-matching filter',
      url: `/?_q=${JSON.stringify({ label: { $regex: 'notExisting', $options: 'i' } })}`,
      acl_rows: undefined,
      found: [],
    },
    {
      name: 'with filter with null values',
      url: `/?_q=${JSON.stringify({ label: null })}`,
      acl_rows: undefined,
      found: [],
    },
    {
      name: 'with acl_rows',
      url: '/',
      acl_rows: [{ label: { $regex: 'Harry', $options: 'i' } }],
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.label.toLowerCase().includes('harry')),
    },
    {
      name: 'with acl_rows and query filter',
      url: `/?label=${expectedRidersLookup[0].label}`,
      acl_rows: [{ label: { $regex: 'ar', $options: 'i' } }],
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.label === expectedRidersLookup[0].label),
    },
    {
      name: 'with acl_rows and filter',
      url: `/?_q=${JSON.stringify({ label: { $regex: 'Potter' } })}`,
      acl_rows: [{ label: { $regex: 'Harry' } }],
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.label.includes('Harry') && f.label.includes('Potter')),
    },
    {
      name: 'with acl_read_columns',
      url: '/',
      acl_rows: undefined,
      acl_read_columns: ['label'],
      found: HTTP_PUBLIC_FIXTURES.map(f => ({ label: f.label })),
    },
    {
      name: 'with acl_read_columns > projection',
      url: '/?_p=value',
      acl_rows: undefined,
      acl_read_columns: ['value', 'label'],
      found: HTTP_PUBLIC_FIXTURES.map(f => ({ value: f.value })),
    },
    {
      name: 'with acl_read_columns < projection',
      url: '/?_p=value,label',
      acl_rows: undefined,
      acl_read_columns: ['value'],
      found: HTTP_PUBLIC_FIXTURES.map(f => ({ value: f.value })),
    },
    {
      name: 'with state',
      url: `/?_st=${STATES.PUBLIC}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: JSON.parse(JSON.stringify(ridersFixture
        .filter(f => f[__STATE__] === STATES.PUBLIC)
        .map(riderObjectToLookup))),
    },
    {
      name: 'with state DRAFT',
      url: `/?_st=${STATES.DRAFT}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: JSON.parse(JSON.stringify(ridersFixture
        .filter(f => f[__STATE__] === STATES.DRAFT)
        .map(riderObjectToLookup))),
    },
    {
      name: 'with state DRAFT,PUBLIC',
      url: `/?_st=${STATES.DRAFT},${STATES.PUBLIC}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: JSON.parse(JSON.stringify(ridersFixture
        .filter(f => [STATES.DRAFT, STATES.PUBLIC].includes(f[__STATE__]))
        .map(riderObjectToLookup))),
    },
  ]

  tests.forEach(testConf => {
    const { name, found, ...conf } = testConf

    t.test(name, async t => {
      const response = await fastify.inject({
        method: 'GET',
        url: lookupAddressPrefix + conf.url,
        headers: getHeaders(conf),
      })

      t.test('should return 200', t => {
        t.strictSame(response.statusCode, 200, response.payload)
        t.end()
      })

      t.test('should return "application/json"', t => {
        t.strictSame(response.headers['content-type'], 'application/json')
        t.end()
      })

      t.test('should return the document', t => {
        t.strictSame(JSON.parse(response.payload), found)
        t.end()
      })

      t.test('should keep the document as is in database', async t => {
        const documents = (await ridersCollection.find().toArray()).map(riderObjectToLookup)
        t.strictSame(documents, expectedRidersLookup)
        t.end()
      })

      t.end()
    })
  })

  t.test('with acl_read_columns not intersect projection', async t => {
    const response = await fastify.inject({
      method: 'GET',
      url: `${lookupAddressPrefix}/?_p=label`,
      headers: getHeaders({
        acl_rows: undefined,
        acl_read_columns: ['value'],
      }),
    })

    t.test('should return 400', t => {
      t.strictSame(response.statusCode, 400, response.payload)
      t.end()
    })

    t.test('should return "application/json"', t => {
      t.strictSame(JSON.parse(response.payload), {
        statusCode: 400,
        error: 'Bad Request',
        message: 'No allowed colums',
      })
      t.end()
    })
    t.end()
  })
})
