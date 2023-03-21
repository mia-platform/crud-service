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
const { publicFixtures, fixtures, stationFixtures, newUpdaterId, oldUpdaterId } = require('./utils')
const { setUpTest, prefix, stationsPrefix, getHeaders } = require('./httpInterface.utils')

const [DOC] = publicFixtures
const HTTP_DOC = JSON.parse(JSON.stringify(DOC))
HTTP_DOC.position = HTTP_DOC.position.coordinates
const ID = DOC._id.toString()
const MATCHING_PRICE = DOC.price - 1
const NON_MATCHING_PRICE = DOC.price + 1

const MATCHING_QUERY = { price: { $gt: MATCHING_PRICE } }
const NON_MATCHING_QUERY = { price: { $gt: NON_MATCHING_PRICE } }

const [STATION_DOC] = stationFixtures
const STATION_ID = STATION_DOC._id.toString()

tap.test('HTTP POST /<id>/state', async t => {
  const tests = [
    {
      name: 'without filter',
      url: `/${ID}/state`,
      acl_rows: undefined,
      stateTo: STATES.DRAFT,
      id: DOC._id,
      found: true,
    },
    {
      name: 'with query filter',
      url: `/${ID}/state?price=${DOC.price}`,
      acl_rows: undefined,
      stateTo: STATES.DRAFT,
      id: DOC._id,
      found: true,
    },
    {
      name: 'with non-matching query filter',
      url: `/${ID}/state?price=${DOC.price - 1}`,
      acl_rows: undefined,
      stateTo: STATES.DRAFT,
      id: DOC._id,
      found: false,
    },
    {
      name: 'with filter',
      url: `/${ID}/state?_q=${JSON.stringify(MATCHING_QUERY)}`,
      acl_rows: undefined,
      stateTo: STATES.DRAFT,
      id: DOC._id,
      found: true,
    },
    {
      name: 'with non-matching filter',
      url: `/${ID}/state?_q=${JSON.stringify(NON_MATCHING_QUERY)}`,
      acl_rows: undefined,
      stateTo: STATES.DRAFT,
      id: DOC._id,
      found: false,
    },
    {
      name: 'with acl_rows',
      url: `/${ID}/state`,
      acl_rows: [MATCHING_QUERY],
      stateTo: STATES.DRAFT,
      id: DOC._id,
      found: true,
    },
    {
      name: 'with non-matching acl_rows',
      url: `/${ID}/state`,
      acl_rows: [NON_MATCHING_QUERY],
      stateTo: STATES.DRAFT,
      id: DOC._id,
      found: false,
    },
    {
      name: 'to wrong state',
      url: `/${ID}/state`,
      acl_rows: undefined,
      stateTo: 'DELETED',
      id: DOC._id,
      found: false,
    },
    {
      name: 'with query filter on nested object',
      url: `/${ID}/state?`
      + `metadata.somethingNumber=2`
      + `&metadata.somethingString=the-saved-string`
      + `&metadata.somethingArrayObject.0.arrayItemObjectChildNumber=4`
      + `&metadata.somethingArrayOfNumbers.0=5`
      + `&attachments.0.detail.size=9`,
      acl_rows: undefined,
      stateTo: STATES.DRAFT,
      id: DOC._id,
      found: true,
    },
  ]

  t.plan(tests.length)
  const { fastify, collection, resetCollection } = await setUpTest(t)

  tests.forEach(testConf => {
    const { name, found, ...conf } = testConf

    t.test(name, async t => {
      await resetCollection()

      const response = await fastify.inject({
        method: 'POST',
        url: prefix + conf.url,
        payload: { stateTo: conf.stateTo },
        headers: {
          userId: newUpdaterId,
          ...getHeaders(conf),
        },
      })

      t.test(`should return ${found ? 204 : 404}`, t => {
        t.strictSame(response.statusCode, found ? 204 : 404, response.payload)
        t.end()
      })

      t.test('should return application/json', t => {
        if (found) {
          t.strictSame(response.headers['content-type'], undefined)
        } else {
          t.ok(/application\/json/.test(response.headers['content-type']))
        }
        t.end()
      })

      t.test('on database', t => {
        t.test(`should ${found ? '' : 'not'} update the document`, async t => {
          const doc = await collection.findOne({ _id: conf.id })

          if (found) {
            t.strictSame(doc[__STATE__], conf.stateTo)
            t.strictSame(doc.updaterId, newUpdaterId)
            t.ok(Math.abs(Date.now() - doc.updatedAt.getTime()) < 5000, '`updatedAt` should be updated')
          } else {
            t.strictSame(doc[__STATE__], DOC[__STATE__])
            t.strictSame(doc.updaterId, oldUpdaterId)
            t.ok(Math.abs(Date.now() - doc.updatedAt.getTime()) > 5000, '`updatedAt` should not be updated')
          }

          t.end()
        })

        t.test('should keep the other documents as is', async t => {
          const documents = await collection.find({ _id: { $ne: conf.id } }).toArray()
          t.strictSame(documents, fixtures.filter(d => d._id.toString() !== conf.id.toString()))
          t.end()
        })

        t.end()
      })

      t.end()
    })
  })
})

tap.test('HTTP POST /<id>/state with string id', async t => {
  const tests = [
    {
      name: 'without filter',
      url: `/${STATION_ID}/state`,
      acl_rows: undefined,
      stateTo: STATES.DRAFT,
      id: STATION_DOC._id,
      found: true,
    },
    {
      name: 'with query filter',
      url: `/${STATION_ID}/state?CodiceMIR=${STATION_DOC.CodiceMIR}`,
      acl_rows: undefined,
      stateTo: STATES.DRAFT,
      id: STATION_DOC._id,
      found: true,
    },
  ]

  t.plan(tests.length)
  const { fastify, collection, resetCollection } = await setUpTest(t, stationFixtures, 'stations')

  tests.forEach(testConf => {
    const { name, found, ...conf } = testConf

    t.test(name, async t => {
      await resetCollection()

      const response = await fastify.inject({
        method: 'POST',
        url: stationsPrefix + conf.url,
        payload: { stateTo: conf.stateTo },
        headers: {
          userId: newUpdaterId,
          ...getHeaders(conf),
        },
      })

      t.test(`should return ${found ? 204 : 404}`, t => {
        t.strictSame(response.statusCode, found ? 204 : 404, response.payload)
        t.end()
      })

      t.test('should return application/json', t => {
        if (found) {
          t.strictSame(response.headers['content-type'], undefined)
        } else {
          t.ok(/application\/json/.test(response.headers['content-type']))
        }
        t.end()
      })

      t.test('on database', t => {
        t.test(`should ${found ? '' : 'not'} update the document`, async t => {
          const doc = await collection.findOne({ _id: conf.id })

          if (found) {
            t.strictSame(doc[__STATE__], conf.stateTo)
            t.strictSame(doc.updaterId, newUpdaterId)
            t.ok(Math.abs(Date.now() - doc.updatedAt.getTime()) < 5000, '`updatedAt` should be updated')
          } else {
            t.strictSame(doc[__STATE__], DOC[__STATE__])
            t.strictSame(doc.updaterId, oldUpdaterId)
            t.ok(Math.abs(Date.now() - doc.updatedAt.getTime()) > 5000, '`updatedAt` should not be updated')
          }

          t.end()
        })

        t.test('should keep the other documents as is', async t => {
          const documents = await collection.find({ _id: { $ne: conf.id } }).toArray()
          t.strictSame(documents, stationFixtures.filter(d => d._id.toString() !== conf.id.toString()))
          t.end()
        })

        t.end()
      })

      t.end()
    })
  })
})
