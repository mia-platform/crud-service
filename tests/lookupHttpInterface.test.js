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

const { setUpTest, getHeaders } = require('./httpInterface.utils')
const {
  lookupAddressPrefix,
  expectedRidersLookup,
  riderObjectToLookup,
} = require('./viewUtils.utils')

const ridersData = require('./fixtures/riders')
const ordersData = require('./fixtures/orders')

const HTTP_PUBLIC_FIXTURES = JSON.parse(JSON.stringify(expectedRidersLookup))

tap.test('HTTP GET /orders-details-endpoint/lookup/rider', async t => {
  const { fastify, database } = await setUpTest(t)

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
      name: 'with sorting',
      url: '/?_s=label',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([])
        .sort((a, b) => b.label - a.label),
    },
    {
      name: 'with filter regex',
      url: `/?_q=${JSON.stringify({ label: { $regex: 'Mar', $options: 'i' } })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(f => /Mar/i.test(f.label)),
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
})
