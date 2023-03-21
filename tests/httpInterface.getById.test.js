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

const { STATES, STATE } = require('../lib/consts')
const {
  fixtures,
  stationFixtures,
  draftFixture,
  RAW_PROJECTION_PLAIN_INCLUSIVE,
  RAW_PROJECTION_PLAIN_EXCLUSIVE,
  RAW_PROJECTION, UNALLOWED_RAW_PROJECTIONS,
} = require('./utils')
const {
  setUpTest,
  prefix,
  stationsPrefix,
  NOT_FOUND_BODY,
  getHeaders,
} = require('./httpInterface.utils')

const [DOC] = fixtures
const HTTP_DOC = JSON.parse(JSON.stringify(DOC))
HTTP_DOC.position = HTTP_DOC.position.coordinates
const { attachments, isbn, price } = HTTP_DOC
const ID = DOC._id.toString()
const MATCHING_PRICE = DOC.price - 1
const NON_MATCHING_PRICE = DOC.price + 1

const [STATION_DOC] = stationFixtures
const HTTP_STATION_DOC = JSON.parse(JSON.stringify(STATION_DOC))
const STATION_ID = STATION_DOC._id.toString()
const MATCHING_MIR_CODE = STATION_DOC.CodiceMIR
const NON_MATCHING_MIR_CODE = 'WrongMirCode'

tap.test('HTTP GET /<id>', async t => {
  const tests = [
    {
      name: 'without filter',
      url: `/${ID}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: HTTP_DOC,
    },
    {
      name: 'with filter',
      url: `/${ID}?_q=${JSON.stringify({ price: { $gt: MATCHING_PRICE } })}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: HTTP_DOC,
    },
    {
      name: 'with filter encoded',
      url: `/${ID}?_q=${Buffer.from(JSON.stringify({ price: { $gt: MATCHING_PRICE } })).toString('base64')}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: HTTP_DOC,
      jsonQueryParamsEncoding: 'base64',
    },
    {
      name: 'with non-matching filter',
      url: `/${ID}?_q=${JSON.stringify({ price: { $gt: NON_MATCHING_PRICE } })}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: false,
    },
    {
      name: 'with non-matching encoded filter',
      url: `/${ID}?_q=${Buffer.from(JSON.stringify({ price: { $gt: NON_MATCHING_PRICE } })).toString('base64')}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: false,
      jsonQueryParamsEncoding: 'base64',
    },
    {
      name: 'with query filter',
      url: `/${ID}?price=${DOC.price}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: HTTP_DOC,
    },
    {
      name: 'with non-matching query filter',
      url: `/${ID}?price=${DOC.price + 1}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: false,
    },
    {
      name: 'with acl_rows',
      url: `/${ID}`,
      acl_rows: [{ price: { $gt: MATCHING_PRICE } }],
      acl_read_columns: undefined,
      found: HTTP_DOC,
    },
    {
      name: 'with non-matching acl_rows',
      url: `/${ID}`,
      acl_rows: [{ price: { $gt: NON_MATCHING_PRICE } }],
      acl_read_columns: undefined,
      found: false,
    },
    {
      name: 'with filter and with matching acl_rows',
      url: `/${ID}?_q=${JSON.stringify({ price: { $gt: MATCHING_PRICE - 1 } })}`,
      acl_rows: [{ price: { $gt: MATCHING_PRICE } }],
      acl_read_columns: undefined,
      found: HTTP_DOC,
    },
    {
      name: 'with filter and with non-matching acl_rows',
      url: `/${ID}?_q=${JSON.stringify({ price: { $gt: MATCHING_PRICE } })}`,
      acl_rows: [{ price: { $gt: NON_MATCHING_PRICE } }],
      acl_read_columns: undefined,
      found: false,
    },
    {
      name: 'with projection',
      url: `/${ID}?_p=${['name', 'author'].join(',')}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: { _id: HTTP_DOC._id, name: HTTP_DOC.name, author: HTTP_DOC.author },
    },
    {
      name: 'with projection < acl_read_columns',
      url: `/${ID}?_p=${['name', 'author'].join(',')}`,
      acl_rows: undefined,
      acl_read_columns: ['name', 'author', 'isbn'],
      found: { _id: HTTP_DOC._id, name: HTTP_DOC.name, author: HTTP_DOC.author },
    },
    {
      name: 'with projection > acl_read_columns',
      url: `/${ID}?_p=${['name', 'author', 'position'].join(',')}`,
      acl_rows: undefined,
      acl_read_columns: ['name', 'author'],
      found: { _id: HTTP_DOC._id, name: HTTP_DOC.name, author: HTTP_DOC.author },
    },
    {
      name: 'with projection intersect acl_read_columns',
      url: `/${ID}?_p=${['name', 'author', 'position'].join(',')}`,
      acl_rows: undefined,
      acl_read_columns: ['name', 'author', 'isbn'],
      found: { _id: HTTP_DOC._id, name: HTTP_DOC.name, author: HTTP_DOC.author },
    },
    {
      name: 'with projection not intersect acl_read_columns',
      url: `/${ID}?_p=${['name', 'author', 'position'].join(',')}`,
      acl_rows: undefined,
      acl_read_columns: ['isbn'],
      found: { _id: HTTP_DOC._id },
    },
    {
      name: 'with state',
      url: `/${ID}?_st=${STATES.PUBLIC}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: HTTP_DOC,
    },
    {
      name: 'with non-matching state',
      url: `/${ID}?_st=${STATES.DRAFT}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: false,
    },
    {
      name: 'with non-matching state and matching acl_rows',
      url: `/${ID}?_st=${STATES.DRAFT}`,
      acl_rows: [{ price: { $gt: MATCHING_PRICE } }],
      acl_read_columns: undefined,
      found: false,
    },
    {
      name: 'with non-matching state and matching acl_rows',
      url: `/${ID}?_st=${STATES.DRAFT}`,
      acl_rows: [{ price: { $gt: MATCHING_PRICE } }],
      acl_read_columns: undefined,
      found: false,
    },
    {
      name: 'with state=DRAFT',
      url: `/${draftFixture._id}?_p=_id&_st=${STATES.DRAFT}`,
      acl_rows: [{ price: { $gt: MATCHING_PRICE } }],
      acl_read_columns: undefined,
      found: { _id: draftFixture._id.toString() },
    },
    {
      name: 'use of raw projection in url',
      url: `/${ID}?_rawp=${JSON.stringify(RAW_PROJECTION_PLAIN_INCLUSIVE)}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: {
        _id: DOC._id.toString(),
        isbn,
        price,
        attachments,
      },
    },
    {
      name: 'use of encoded raw projection in url',
      url: `/${ID}?_rawp=${Buffer.from(JSON.stringify(RAW_PROJECTION_PLAIN_INCLUSIVE), 'binary').toString('base64')}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: {
        _id: DOC._id.toString(),
        isbn,
        price,
        attachments,
      },
      jsonQueryParamsEncoding: 'base64',
    },
    {
      name: 'use of raw projection esclusive which do not intersect acls',
      url: `/${ID}?_rawp=${JSON.stringify(RAW_PROJECTION_PLAIN_EXCLUSIVE)}`,
      acl_rows: undefined,
      acl_read_columns: ['author'],
      found: {
        _id: DOC._id.toString(),
      },
    },
  ]

  if (process.env.MONGO_VERSION >= '4.4') {
    const rawProjectionWithAggregationTests = [
      {
        name: '[only in mongo 4.4+] use of raw projection (with aggregation operators) in url',
        url: `/${ID}?_rawp=${JSON.stringify(RAW_PROJECTION)}`,
        acl_rows: undefined,
        acl_read_columns: undefined,
        found: {
          _id: DOC._id.toString(),
          attachments: DOC.attachments.filter((attachment) => attachment.name === 'note'),
        },
      },
      {
        name: '[only in mongo 4.4+] use of raw projection in url with _q with acl_columns',
        url: `/?_q=${JSON.stringify({ name: 'Ulysses' })}&_rawp=${JSON.stringify(RAW_PROJECTION_PLAIN_INCLUSIVE)}&_st=${STATES.DELETED},${STATES.PUBLIC},${STATES.TRASH},${STATES.DRAFT}`,
        acl_rows: undefined,
        acl_read_columns: ['price', 'author', 'name'],
        found: [
          {
            _id: fixtures[0]._id.toString(),
            price: fixtures[0].price,
          },
        ],
      },
    ]

    tests.push(...rawProjectionWithAggregationTests)
  }

  t.plan(tests.length)
  // it is safe to instantiate the test once, since all
  // the tests only perform reads on the collection
  const { fastify, collection } = await setUpTest(t)

  tests.forEach(testConf => {
    const { name, found, ...conf } = testConf

    t.test(name, async t => {
      const response = await fastify.inject({
        method: 'GET',
        url: prefix + conf.url,
        headers: getHeaders(conf),
      })

      t.test(`should return ${found ? '200' : '404'}`, t => {
        t.strictSame(response.statusCode, (found ? 200 : 404))
        t.end()
      })

      t.test('should return "application/json"', t => {
        t.ok(/application\/json/.test(response.headers['content-type']))
        t.end()
      })

      t.test(`should return ${found ? 'the document' : 'NOT_FOUND_BODY'}`, t => {
        if (found) {
          t.strictSame(JSON.parse(response.payload), found)
        } else {
          t.strictSame(JSON.parse(response.payload), NOT_FOUND_BODY)
        }
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

tap.test('HTTP GET /<id> with string id', async t => {
  const tests = [
    {
      name: 'without filter',
      url: `/${STATION_ID}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: HTTP_STATION_DOC,
    },
    {
      name: 'with filter',
      url: `/${STATION_ID}?_q=${JSON.stringify({ CodiceMIR: MATCHING_MIR_CODE })}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: HTTP_STATION_DOC,
    },
    {
      name: 'with non-matching filter',
      url: `/${STATION_ID}?_q=${JSON.stringify({ CodiceMIR: NON_MATCHING_MIR_CODE })}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: false,
    },
    {
      name: 'with query filter',
      url: `/${STATION_ID}?CodiceMIR=${STATION_DOC.CodiceMIR}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: HTTP_STATION_DOC,
    },
    {
      name: 'with non-matching query filter',
      url: `/${STATION_ID}?CodiceMIR=WrongMirCode`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: false,
    },
    {
      name: 'with acl_rows',
      url: `/${STATION_ID}`,
      acl_rows: [{ CodiceMIR: MATCHING_MIR_CODE }],
      acl_read_columns: undefined,
      found: HTTP_STATION_DOC,
    },
    {
      name: 'with non-matching acl_rows',
      url: `/${STATION_ID}`,
      acl_rows: [{ CodiceMIR: NON_MATCHING_MIR_CODE }],
      acl_read_columns: undefined,
      found: false,
    },
    {
      name: 'with filter and with matching acl_rows',
      url: `/${STATION_ID}?_q=${JSON.stringify({ CodiceMIR: MATCHING_MIR_CODE })}`,
      acl_rows: [{ CodiceMIR: MATCHING_MIR_CODE }],
      acl_read_columns: undefined,
      found: HTTP_STATION_DOC,
    },
    {
      name: 'with filter and with non-matching acl_rows',
      url: `/${STATION_ID}?_q=${JSON.stringify({ CodiceMIR: MATCHING_MIR_CODE })}`,
      acl_rows: [{ CodiceMIR: NON_MATCHING_MIR_CODE }],
      acl_read_columns: undefined,
      found: false,
    },
    {
      name: 'with projection',
      url: `/${STATION_ID}?_p=${['Cap', 'Comune'].join(',')}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: { _id: HTTP_STATION_DOC._id, Cap: HTTP_STATION_DOC.Cap, Comune: HTTP_STATION_DOC.Comune },
    },
    {
      name: 'with projection < acl_read_columns',
      url: `/${STATION_ID}?_p=${['Cap', 'Comune'].join(',')}`,
      acl_rows: undefined,
      acl_read_columns: ['Cap', 'Comune', 'Direttrici'],
      found: { _id: HTTP_STATION_DOC._id, Cap: HTTP_STATION_DOC.Cap, Comune: HTTP_STATION_DOC.Comune },
    },
    {
      name: 'with projection > acl_read_columns',
      url: `/${STATION_ID}?_p=${['Cap', 'Comune', 'Direttrici'].join(',')}`,
      acl_rows: undefined,
      acl_read_columns: ['Cap', 'Comune'],
      found: { _id: HTTP_STATION_DOC._id, Cap: HTTP_STATION_DOC.Cap, Comune: HTTP_STATION_DOC.Comune },
    },
    {
      name: 'with projection intersect acl_read_columns',
      url: `/${STATION_ID}?_p=${['Cap', 'Comune', 'Direttrici'].join(',')}`,
      acl_rows: undefined,
      acl_read_columns: ['Cap', 'Comune', 'Indirizzo'],
      found: { _id: HTTP_STATION_DOC._id, Cap: HTTP_STATION_DOC.Cap, Comune: HTTP_STATION_DOC.Comune },
    },
    {
      name: 'with projection not intersect acl_read_columns',
      url: `/${STATION_ID}?_p=${['Cap', 'Comune', 'Direttrici'].join(',')}`,
      acl_rows: undefined,
      acl_read_columns: ['isbn'],
      found: { _id: HTTP_STATION_DOC._id },
    },
    {
      name: 'with state',
      url: `/${STATION_ID}?_st=${STATES.PUBLIC}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: HTTP_STATION_DOC,
    },
    {
      name: 'with non-matching state',
      url: `/${STATION_ID}?_st=${STATES.DRAFT}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: false,
    },
    {
      name: 'with non-matching state and matching acl_rows',
      url: `/${STATION_ID}?_st=${STATES.DRAFT}`,
      acl_rows: [{ CodiceMIR: MATCHING_MIR_CODE }],
      acl_read_columns: undefined,
      found: false,
    },
    {
      name: 'with non-matching state and matching acl_rows',
      url: `/${STATION_ID}?_st=${STATES.DRAFT}`,
      acl_rows: [{ CodiceMIR: MATCHING_MIR_CODE }],
      acl_read_columns: undefined,
      found: false,
    },
  ]
  t.plan(tests.length)

  // it is safe to instantiate the test once, since all
  // the tests only perform reads on the collection
  const { fastify, collection } = await setUpTest(t, stationFixtures, 'stations')

  tests.forEach(testConf => {
    const { name, found, ...conf } = testConf

    t.test(name, async t => {
      const response = await fastify.inject({
        method: 'GET',
        url: stationsPrefix + conf.url,
        headers: getHeaders(conf),
      })
      t.test(`should return ${found ? '200' : '404'}`, t => {
        t.strictSame(response.statusCode, (found ? 200 : 404))
        t.end()
      })

      t.test('should return "application/json"', t => {
        t.ok(/application\/json/.test(response.headers['content-type']))
        t.end()
      })

      t.test(`should return ${found ? 'the document' : 'NOT_FOUND_BODY'}`, t => {
        if (found) {
          t.strictSame(JSON.parse(response.payload), found)
        } else {
          t.strictSame(JSON.parse(response.payload), NOT_FOUND_BODY)
        }
        t.end()
      })

      t.test('should keep the document as is in database', async t => {
        const documents = await collection.find().toArray()
        t.strictSame(documents, stationFixtures)
        t.end()
      })

      t.end()
    })
  })
})

tap.test('HTTP GET', async t => {
  const { fastify, resetCollection } = await setUpTest(t, null, 'books')

  t.test('/:id cast correctly nested object with schema', async t => {
    const DOC_TEST = {
      ...DOC,
      _id: ObjectId.createFromHexString('211111111111111111111111'),
      metadata: {
        somethingNumber: '3333',
      },
      attachments: [{
        name: 'the-note',
        detail: {
          size: '6',
        },
      }],
      [STATE]: STATES.PUBLIC,
    }

    await resetCollection([DOC_TEST])

    const response = await fastify.inject({
      method: 'GET',
      url: `${prefix}/${DOC_TEST._id.toHexString()}`,
      headers: {},
    })
    t.strictSame(JSON.parse(response.payload).metadata, {
      somethingNumber: 3333,
    })
    t.strictSame(JSON.parse(response.payload).attachments, [{
      name: 'the-note',
      detail: {
        size: 6,
      },
    }])

    t.end()
  })

  t.test('/:id filter correctly by nested object field', async t => {
    const DOC_TEST = {
      ...fixtures[0],
      _id: ObjectId.createFromHexString('311111111111111111111111'),
      metadata: {
        somethingNumber: 3333,
        somethingArrayObject: [{
          arrayItemObjectChildNumber: 4,
        }],
        somethingArrayOfNumbers: [5],
      },
      [STATE]: STATES.PUBLIC,
    }
    const DOC_TEST_NO_MATCH = {
      ...fixtures[0],
      isbn: 'faske isbn 2',
      _id: ObjectId.createFromHexString('321111111111111111111111'),
      metadata: {
        somethingNumber: 999,
        somethingArrayObject: [{
          arrayItemObjectChildNumber: 4,
        }],
        somethingArrayOfNumbers: [5],
      },
      [STATE]: STATES.PUBLIC,
    }

    await resetCollection([DOC_TEST, DOC_TEST_NO_MATCH])

    const response = await fastify.inject({
      method: 'GET',
      url: `${prefix}/${DOC_TEST._id.toHexString()}`,
      query: {
        'metadata.somethingNumber': '3333',
        'metadata.somethingArrayObject.0.arrayItemObjectChildNumber': '4',
        'metadata.somethingArrayOfNumbers.0': '5',
      },
      headers: {},
    })

    t.equal(response.statusCode, 200)
    t.strictSame(JSON.parse(response.payload).metadata, {
      somethingNumber: 3333,
      somethingArrayObject: [{
        arrayItemObjectChildNumber: 4,
      }],
      somethingArrayOfNumbers: [5],
    })

    t.end()
  })

  t.test('/:id 404 with unmatching filter on nested object', async t => {
    const DOC_TEST = {
      ...fixtures[0],
      _id: ObjectId.createFromHexString('311111111111111111111111'),
      metadata: {
        somethingNumber: 1,
        somethingArrayObject: [{
          arrayItemObjectChildNumber: 4,
        }],
        somethingArrayOfNumbers: [5],
      },
      [STATE]: STATES.PUBLIC,
    }

    await resetCollection([DOC_TEST])

    const response = await fastify.inject({
      method: 'GET',
      url: `${prefix}/${DOC_TEST._id.toHexString()}`,
      query: {
        'metadata.somethingArrayObject.0.arrayItemObjectChildNumber': '999',
      },
      headers: {},
    })

    t.equal(response.statusCode, 404)
    t.strictSame(JSON.parse(response.payload), NOT_FOUND_BODY)
    t.end()
  })

  t.test('/:id fails with 400', async t => {
    await resetCollection([DOC])

    UNALLOWED_RAW_PROJECTIONS.forEach(projection => {
      t.test('Should not allow raw projection', async assert => {
        const { statusCode } = await fastify.inject({
          method: 'GET',
          url: `${prefix}/${ID}?_rawp=${JSON.stringify(projection)}`,
          headers: {},
        })

        assert.strictSame(statusCode, 400)
        assert.end()
      })
    })

    t.test('Should raise error if raw projection tries to override acls', async assert => {
      const expectedPayload = {
        statusCode: 400,
        error: 'Bad Request',
        message: '_rawp exclusive projection is overriding at least one acl_read_column value',
      }
      const { statusCode, payload } = await fastify.inject({
        method: 'GET',
        url: `${prefix}/${ID}?_rawp=${JSON.stringify(RAW_PROJECTION_PLAIN_EXCLUSIVE)}`,
        headers: {
          acl_read_columns: ['price', 'author', 'name'],
        },
      })

      assert.strictSame(statusCode, 400)
      assert.strictSame(JSON.parse(payload), expectedPayload)
      assert.end()
    })

    UNALLOWED_RAW_PROJECTIONS.forEach(() => {
      t.test('should not allow raw projection with projection (mixed _rawp and _p)', async assert => {
        const expectedPayload = {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Use of both _rawp and _p parameter is not allowed',
        }
        const { statusCode, payload } = await fastify.inject({
          method: 'GET',
          url: `${prefix}/${ID}?_rawp=${JSON.stringify(RAW_PROJECTION)}&_p=price`,
          headers: {},
        })

        assert.strictSame(statusCode, 400)
        assert.strictSame(JSON.parse(payload), expectedPayload)
        assert.end()
      })
    })

    t.end()
  })

  t.end()
})
