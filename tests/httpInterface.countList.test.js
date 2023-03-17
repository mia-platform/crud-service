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

const { STATES, __STATE__ } = require('../lib/consts')
const { publicFixtures, fixtures } = require('./utils')
const { setUpTest, prefix, getHeaders } = require('./httpInterface.utils')

tap.test('HTTP GET /count', async t => {
  const tests = [
    {
      name: 'without query',
      method: 'GET',
      url: `${prefix}/count`,
      count: publicFixtures.length,
      acl_rows: undefined,
    },
    {
      name: 'with empty query',
      method: 'GET',
      url: `${prefix}/count?_q=${JSON.stringify({})}`,
      count: publicFixtures.length,
      acl_rows: undefined,
    },
    {
      name: 'with _q',
      method: 'GET',
      url: `${prefix}/count?_q=${JSON.stringify({ price: { $gt: 20 } })}`,
      count: publicFixtures.filter(d => d.price > 20).length,
      acl_rows: undefined,
    },
    {
      name: 'with querystring filter',
      method: 'GET',
      url: `${prefix}/count?price=${publicFixtures[0].price}`,
      count: publicFixtures.filter(d => d.price === publicFixtures[0].price).length,
      acl_rows: undefined,
    },
    {
      name: 'with non-matching filter',
      method: 'GET',
      url: `${prefix}/count?_q=${JSON.stringify({ price: { $gt: 200000 } })}`,
      count: 0,
      acl_rows: undefined,
    },
    {
      name: 'with acl rows without filter',
      method: 'GET',
      url: `${prefix}/count`,
      count: publicFixtures.filter(d => d.isPromoted === true).length,
      acl_rows: [{ isPromoted: true }],
    },
    {
      name: 'with acl rows with filter',
      method: 'GET',
      url: `${prefix}/count?_q=${JSON.stringify({ price: { $gt: 20 } })}`,
      count: publicFixtures.filter(d => d.isPromoted === true && d.price > 20).length,
      acl_rows: [{ isPromoted: true }],
    },
    {
      name: 'with state PUBLIC',
      method: 'GET',
      url: `${prefix}/count?_st=${STATES.PUBLIC}`,
      count: publicFixtures.length,
      acl_rows: undefined,
    },
    {
      name: 'with state DRAFT',
      method: 'GET',
      url: `${prefix}/count?_st=${STATES.DRAFT}`,
      count: fixtures.filter(f => f[__STATE__] === STATES.DRAFT).length,
      acl_rows: undefined,
    },
    {
      name: 'with state DRAFT,TRASH',
      method: 'GET',
      url: `${prefix}/count?_st=${STATES.DRAFT},${STATES.TRASH}`,
      count: fixtures.filter(
        f => f[__STATE__] === STATES.DRAFT || f[__STATE__] === STATES.TRASH
      ).length,
      acl_rows: undefined,
    },
    {
      name: 'with state DRAFT,TRASH with filter',
      method: 'GET',
      url: `${prefix}/count?_q=${JSON.stringify({ price: { $gt: 20 } })}&_st=${STATES.DRAFT},${STATES.TRASH}`,
      count: fixtures.filter(
        f => (f[__STATE__] === STATES.DRAFT || f[__STATE__] === STATES.TRASH) && f.price > 20
      ).length,
      acl_rows: undefined,
    },
    {
      name: 'with filter on nested object',
      method: 'GET',
      url: `${prefix}/count?`
        + `metadata.somethingNumber=2`
        + `&metadata.somethingString=the-saved-string`
        + `&metadata.somethingArrayObject.0.arrayItemObjectChildNumber=4`
        + `&metadata.somethingArrayOfNumbers.0=5`,
      acl_rows: undefined,
      count: 1,
    },
    {
      name: 'query without results',
      method: 'GET',
      url: `${prefix}/count?_q=${JSON.stringify({ price: { $gt: Infinity } })}`,
      acl_rows: undefined,
      count: 0,
    },
  ]

  t.plan(tests.length)
  // it is safe to instantiate the test once, since all
  // the tests only perform reads on the collection
  const { fastify, collection } = await setUpTest(t)

  tests.forEach(testConf => {
    const { name, ...conf } = testConf

    t.test(name, async t => {
      const response = await fastify.inject({
        method: conf.method,
        url: conf.url,
        headers: getHeaders(conf),
      })

      t.test('should return 200', t => {
        t.strictSame(response.statusCode, 200)
        t.end()
      })

      t.test('should return JSON', t => {
        t.ok(/application\/json/.test(response.headers['content-type']))
        t.end()
      })

      t.test('should return the expected body', t => {
        t.strictSame(JSON.parse(response.payload), conf.count)
        t.end()
      })

      t.test('should keep the document as is in database', async t => {
        const documents = await collection.find().toArray()
        t.strictSame(documents, fixtures)
        t.end()
      })

      t.end()
    })
  })
})
