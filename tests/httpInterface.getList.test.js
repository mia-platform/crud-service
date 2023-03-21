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
const {
  publicFixtures,
  fixtures,
  stationFixtures,
  lotOfBooksFixtures,
  RAW_PROJECTION,
  RAW_PROJECTION_FIRST_OP,
  RAW_PROJECTION_PLAIN_INCLUSIVE,
  RAW_PROJECTION_PLAIN_EXCLUSIVE,
  BAD_RAW_PROJECTIONS_USAGE,
  UNALLOWED_RAW_PROJECTIONS,
  sortByPrice,
  sortByName,
  sortByDate,
  sortByAttachmentsName,
  sortByAdditionalInfo,
} = require('./utils')
const { setUpTest, prefix, stationsPrefix, getHeaders } = require('./httpInterface.utils')
const booksCollectionDefinition = require('./collectionDefinitions/books')

const [STATION_DOC] = stationFixtures
const HTTP_STATION_DOC = JSON.parse(JSON.stringify(STATION_DOC))
const STATION_ID = STATION_DOC._id.toString()
const HTTP_PUBLIC_FIXTURES = JSON.parse(JSON.stringify(publicFixtures))
  .map(d => {
    if (d.position) {
      d.position = d.position.coordinates
    }
    return d
  })

const EXPECTED_DOCS_FOR_INCLUSIVE_RAW_PROJECTION = fixtures.map((doc) => {
  return doc.attachments
    ? {
      _id: doc._id.toString(),
      isbn: doc.isbn,
      price: doc.price,
      attachments: doc.attachments,
    }
    : {
      _id: doc._id.toString(),
      isbn: doc.isbn,
      price: doc.price,
    }
})

const EXPECTED_PUBLIC_DOCS_FOR_INCLUSIVE_RAW_PROJECTION = publicFixtures.map((doc) => {
  return doc.attachments
    ? {
      _id: doc._id.toString(),
      isbn: doc.isbn,
      price: doc.price,
      attachments: doc.attachments,
    }
    : {
      _id: doc._id.toString(),
      price: doc.price,
      isbn: doc.isbn,
    }
})

tap.test('HTTP GET /', async t => {
  const tests = [
    {
      name: 'without filters',
      url: '/',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([]).sort((a, b) => {
        if (a._id === b._id) {
          return 0
        }
        return a._id >= b._id ? 1 : -1
      }),
    },
    {
      name: 'with sorting',
      url: '/?_s=price',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([])
        .sort((a, b) => sortByPrice(a, b, 1)),
    },
    {
      name: 'with invert sorting',
      url: '/?_s=-price',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([])
        .sort((a, b) => sortByPrice(a, b, -1)),
    },
    {
      name: 'with multiple sorting COMMA',
      url: '/?_s=price,name',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([])
        .sort((a, b) => sortByName(a, b, 1))
        .sort((a, b) => sortByPrice(a, b, 1)),
    },
    {
      name: 'with multiple invert sorting COMMA',
      url: '/?_s=-price,-name',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([])
        .sort((a, b) => sortByName(a, b, -1))
        .sort((a, b) => sortByPrice(a, b, -1)),
    },
    {
      name: 'with multiple: normal sorting for first, invert second MULTIPLE QUERYSTRING',
      url: '/?_s=price&_s=-name',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([])
        .sort((a, b) => sortByName(a, b, -1))
        .sort((a, b) => sortByPrice(a, b, 1)),
    },
    {
      name: 'with multiple: normal sorting for first, invert for second with subfield, normal for third COMMA',
      url: '/?_s=price,-attachments.name,publishDate',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([])
        .sort((a, b) => sortByDate(a, b, 1))
        .sort((a, b) => sortByAttachmentsName(a, b, -1))
        .sort((a, b) => sortByPrice(a, b, 1)),
    },
    {
      name: 'with multiple: normal sorting for first and second (nested array) MULTIPLE QUERYSTRING',
      url: '/?_s=price&_s=attachments.name',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([])
        .sort((a, b) => sortByAttachmentsName(a, b, 1))
        .sort((a, b) => sortByPrice(a, b, 1)),
    },
    {
      name: 'with multiple sorting, first RawObject and second normal field',
      url: '/?_s=additionalInfo.notes&_s=price',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([])
        .sort((a, b) => sortByAdditionalInfo(a, b, 1))
        .sort((a, b) => sortByPrice(a, b, 1)),
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
      url: '/?_p=price,name,author',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.map(f => ({ _id: f._id, price: f.price, name: f.name, author: f.author })),
    },
    {
      name: 'with query filter',
      url: `/?price=${publicFixtures[0].price}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.price === publicFixtures[0].price),
    },
    {
      name: 'with filter',
      url: `/?_q=${JSON.stringify({ price: { $gt: 20 } })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.price > 20),
    },
    {
      name: 'with filter regex',
      url: `/?_q=${JSON.stringify({ name: { $regex: 'ulysses', $options: 'si' } })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(f => /ulysses/i.test(f.name)),
    },
    {
      name: 'with non-matching filter',
      url: `/?_q=${JSON.stringify({ price: { $gt: 20000000 } })}`,
      acl_rows: undefined,
      found: [],
    },
    {
      name: 'with filter with null values',
      url: `/?_q=${JSON.stringify({ price: { $gt: 20 }, additionalInfo: null })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.price > 20 && !f.additionalInfo),
    },
    {
      name: 'with filter by additionalInfo nested with dot notation',
      url: `/?_q=${JSON.stringify({ 'additionalInfo.notes.mynote': 'good' })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(
        f => f.additionalInfo && f.additionalInfo.notes && f.additionalInfo.notes.mynote === 'good'
      ),
    },
    {
      name: 'with filter by additionalInfo nested with dot notation with a command',
      url: `/?_q=${JSON.stringify({ 'additionalInfo.notes.mynote': { $ne: 'good' } })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(
        f => !f.additionalInfo || !f.additionalInfo.notes || f.additionalInfo.notes.mynote !== 'good'
      ),
    },
    {
      name: '$exists: false',
      url: `/?_q=${JSON.stringify({ 'additionalInfo.gg': { $exists: false } })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(
        f => !f.additionalInfo || !{}.hasOwnProperty.call(f.additionalInfo, 'gg')
      ),
    },
    {
      name: 'with filter by additionalInfo nested without dot notation (only one level)',
      url: `/?_q=${JSON.stringify({ additionalInfo: { note: 'good' } })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.additionalInfo && f.additionalInfo.note === 'good'),
    },
    {
      name: 'with filter with geo search',
      url: `/?_q=${JSON.stringify({ position: { $nearSphere: { from: [0, 0] } } })}&_p=_id`,
      acl_rows: undefined,
      found: [
        { _id: '111111111111111111111111' },
        { _id: '444444444444444444444444' },
        { _id: '222222222222222222222222' },
        { _id: '333333333333333333333333' },
      ],
    },
    {
      name: 'with filter with geo search with altitude',
      url: `/?_q=${JSON.stringify({ position: { $nearSphere: { from: [0, 0, 5] } } })}&_p=_id`,
      acl_rows: undefined,
      found: [
        { _id: '111111111111111111111111' },
        { _id: '444444444444444444444444' },
        { _id: '222222222222222222222222' },
        { _id: '333333333333333333333333' },
      ],
    },
    {
      name: 'with filter with geo search with min and max',
      url: `/?_q=${JSON.stringify({ position: { $nearSphere: { from: [0, 0], minDistance: 0, maxDistance: 10 } } })}&_p=_id`,
      acl_rows: undefined,
      found: [
        { _id: '111111111111111111111111' },
      ],
    },
    {
      name: 'with acl_rows',
      url: '/',
      acl_rows: [{ price: { $gt: 20 } }],
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.price > 20),
    },
    {
      name: 'with acl_rows and query filter',
      url: '/?isPromoted=true',
      acl_rows: [{ price: { $gt: 20 } }],
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.price > 20 && f.isPromoted === true),
    },
    {
      name: 'with acl_rows and filter',
      url: `/?_q=${JSON.stringify({ isPromoted: true })}`,
      acl_rows: [{ price: { $gt: 20 } }],
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.price > 20 && f.isPromoted === true),
    },
    {
      name: 'with acl_read_columns',
      url: '/',
      acl_rows: undefined,
      acl_read_columns: ['price', 'author'],
      found: HTTP_PUBLIC_FIXTURES.map(f => ({ _id: f._id, price: f.price, author: f.author })),
    },
    {
      name: 'with acl_read_columns > projection',
      url: '/?_p=price',
      acl_rows: undefined,
      acl_read_columns: ['price', 'author'],
      found: HTTP_PUBLIC_FIXTURES.map(f => ({ _id: f._id, price: f.price })),
    },
    {
      name: 'with acl_read_columns < projection',
      url: '/?_p=price,author,isbn',
      acl_rows: undefined,
      acl_read_columns: ['price', 'author'],
      found: HTTP_PUBLIC_FIXTURES.map(f => ({ _id: f._id, price: f.price, author: f.author })),
    },
    {
      name: 'with acl_read_columns intersect projection',
      url: '/?_p=price,author,isbn',
      acl_rows: undefined,
      acl_read_columns: ['price', 'author', 'name'],
      found: HTTP_PUBLIC_FIXTURES.map(f => ({ _id: f._id, price: f.price, author: f.author })),
    },
    {
      name: 'with acl_read_columns not intersect projection',
      url: '/?_p=price',
      acl_rows: undefined,
      acl_read_columns: ['author', 'name'],
      found: HTTP_PUBLIC_FIXTURES.map(f => ({ _id: f._id })),
    },
    {
      name: 'with state',
      url: `/?_st=${STATES.PUBLIC}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([]),
    },
    {
      name: 'with state DRAFT',
      url: `/?_p=name&_st=${STATES.DRAFT}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: fixtures.concat([]).filter(f => f[__STATE__] === STATES.DRAFT)
        .map(f => ({ _id: f._id.toString(), name: f.name })),
    },
    {
      name: 'with state DRAFT,PUBLIC',
      url: `/?_p=name&_st=${STATES.DRAFT},${STATES.PUBLIC}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: fixtures.concat([]).filter(f => f[__STATE__] === STATES.DRAFT || f[__STATE__] === STATES.PUBLIC)
        .map(f => ({ _id: f._id.toString(), name: f.name })),
    },
    {
      name: '$elemMatch array rawobject array',
      url: `/?_p=_id&_q=${JSON.stringify({ attachments: { $elemMatch: { neastedArr: { $in: [3] } } } })}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: fixtures.filter(f => {
        return f.attachments
          && f.attachments.some(a => {
            return a.neastedArr && a.neastedArr.some(fp => fp === 3)
          })
      }).map(f => ({ _id: f._id.toString() })),
    },
    {
      name: '$elemMatch array rawobject string',
      url: `/?_p=_id&_q=${JSON.stringify({ attachments: { $elemMatch: { name: { $in: ['my-name'] } } } })}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: fixtures.filter(f => {
        return f.attachments
          && f.attachments.some(a => {
            return a.name === 'my-name'
          })
      }).map(f => ({ _id: f._id.toString() })),
    },
    {
      name: 'filter on nested object with dot notation',
      url: '/?_p=_id,isbn,metadata,attachments'
        + '&metadata.somethingNumber=2'
        + '&metadata.somethingString=the-saved-string'
        + '&metadata.somethingArrayObject.0.arrayItemObjectChildNumber=4'
        + '&metadata.somethingArrayOfNumbers.0=5'
        + '&attachments.0.detail.size=9',
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: [{
        _id: fixtures[0]._id.toString(),
        isbn: fixtures[0].isbn,
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
      }],
    },
    {
      name: 'filter on nested object with aclRows',
      url: '/?_p=_id,isbn,metadata',
      acl_rows: [{ 'metadata.somethingArrayOfNumbers.0': 5 }],
      acl_read_columns: undefined,
      found: [{
        _id: fixtures[0]._id.toString(),
        isbn: fixtures[0].isbn,
        metadata: {
          somethingNumber: 2,
          somethingString: 'the-saved-string',
          somethingArrayObject: [{
            arrayItemObjectChildNumber: 4,
          }],
          somethingArrayOfNumbers: [5],
        },
      }],
    },
    {
      name: 'correct project on nested object and nested array of object with _p',
      url: '/?_p=isbn,additionalInfo.foo,attachments.name',
      acl_rows: [{ 'metadata.somethingArrayOfNumbers.0': 5 }],
      acl_read_columns: undefined,
      found: [{
        _id: fixtures[0]._id.toString(),
        isbn: fixtures[0].isbn,
        attachments: [
          {
            name: 'note',
          },
          {
            name: 'another-note',
          },
        ],
        additionalInfo: {
          foo: fixtures[0].additionalInfo.foo,
        },
      }],
    },
    {
      name: 'correct project on inexistent field with _p',
      url: '/?_p=isbn,additionalInfo.inexistentField',
      acl_rows: [{ 'metadata.somethingArrayOfNumbers.0': 5 }],
      acl_read_columns: undefined,
      found: [{
        _id: fixtures[0]._id.toString(),
        isbn: fixtures[0].isbn,
        additionalInfo: {},
      }],
    },
    {
      name: 'use of $ operator for array element condition into _p',
      url: `/?_q=${JSON.stringify({ 'attachments.name': 'another-note' })}&_p=attachments.$`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: [{
        _id: fixtures[0]._id.toString(),
        attachments: [{
          name: 'another-note',
          other: 'stuff',
        }],
      }],
    },
    {
      name: 'wrong project with _p returns only the _id',
      url: '/?_p=a wrong projection',
      acl_rows: [{ 'metadata.somethingArrayOfNumbers.0': 5 }],
      acl_read_columns: undefined,
      found: [{
        _id: fixtures[0]._id.toString(),
      }],
    },
    {
      name: 'use of raw projection in url',
      url: `/?_rawp=${JSON.stringify(RAW_PROJECTION_PLAIN_INCLUSIVE)}&_st=${STATES.DELETED},${STATES.PUBLIC},${STATES.TRASH},${STATES.DRAFT}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: EXPECTED_DOCS_FOR_INCLUSIVE_RAW_PROJECTION,
    },
    {
      name: 'use of raw projection in url with only PUBLIC documents',
      url: `/?_rawp=${JSON.stringify(RAW_PROJECTION_PLAIN_INCLUSIVE)}&_st=${STATES.PUBLIC}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: EXPECTED_PUBLIC_DOCS_FOR_INCLUSIVE_RAW_PROJECTION,
    },
    {
      name: 'use of raw projection in url with _q',
      url: `/?_q=${JSON.stringify({ name: 'Ulysses' })}&_rawp=${JSON.stringify(RAW_PROJECTION_PLAIN_INCLUSIVE)}&_st=${STATES.DELETED},${STATES.PUBLIC},${STATES.TRASH},${STATES.DRAFT}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: [EXPECTED_DOCS_FOR_INCLUSIVE_RAW_PROJECTION[0]],
    },
    {
      name: 'use of raw projection in url with _q with acl_columns',
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
    {
      name: 'use of raw projection exclusive which do not intersect acls',
      url: `/?_rawp=${JSON.stringify(RAW_PROJECTION_PLAIN_EXCLUSIVE)}`,
      acl_rows: undefined,
      acl_read_columns: ['author'],
      found: publicFixtures.map((doc) => {
        return {
          _id: doc._id.toString(),
        }
      }),
    },
  ]

  const testsConfToExport = [...tests]

  /*
    rawProjection tests are added only if MongoDB version is 4.4 or above because
    they contain projection with aggregation expression not supported in older MongoDB version
  */

  if (process.env.MONGO_VERSION >= '4.4') {
    const rawProjectionWithAggregationTests = [
      {
        name: '[only in mongo 4.4+] use of raw projection in url',
        url: `/?_rawp=${JSON.stringify(RAW_PROJECTION)}&_st=${STATES.DELETED},${STATES.PUBLIC},${STATES.TRASH},${STATES.DRAFT}`,
        acl_rows: undefined,
        acl_read_columns: undefined,
        found: fixtures.map((doc) => {
          return {
            _id: doc._id.toString(),
            attachments: doc.attachments ? doc.attachments.filter((attachment) => attachment.name === 'note') : null,
          }
        }),
      },
      {
        name: '[only in mongo 4.4+] use of raw projection in url with only PUBLIC documents',
        url: `/?_rawp=${JSON.stringify(RAW_PROJECTION)}&_st=${STATES.PUBLIC}`,
        acl_rows: undefined,
        acl_read_columns: undefined,
        found: publicFixtures.map((doc) => {
          return {
            _id: doc._id.toString(),
            attachments: doc.attachments ? doc.attachments.filter((attachment) => attachment.name === 'note') : null,
          }
        }),
      },
      {
        name: '[only in mongo 4.4+] use of raw projection in url with _q',
        url: `/?_q=${JSON.stringify({ name: 'Ulysses' })}&_rawp=${JSON.stringify(RAW_PROJECTION)}&_st=${STATES.DELETED},${STATES.PUBLIC},${STATES.TRASH},${STATES.DRAFT}`,
        acl_rows: undefined,
        acl_read_columns: undefined,
        found: [{
          _id: fixtures[0]._id.toString(),
          attachments: fixtures[0].attachments.filter((attachment) => attachment.name === 'note'),
        }],
      },
      {
        name: '[only in mongo 4.4+] use of raw projection with $first operator',
        url: `/?_q=${JSON.stringify({ name: 'Ulysses' })}&_rawp=${JSON.stringify(RAW_PROJECTION_FIRST_OP)}&_st=${STATES.DELETED},${STATES.PUBLIC},${STATES.TRASH},${STATES.DRAFT}`,
        acl_rows: undefined,
        acl_read_columns: undefined,
        found: [{
          _id: fixtures[0]._id.toString(),
          attachments: fixtures[0].attachments[0],
        }],
      },
      {
        name: '[only in mongo 4.4+] use of raw projection with $dateToString operator',
        url: `/?_q=${JSON.stringify({ name: 'Ulysses' })}&_rawp=${encodeURIComponent(JSON.stringify({
          createdAt: {
            $dateToString: {
              date: '$createdAt',
              format: '%H',
              // same as offset below (+ 10)
              timezone: '+10:00',
            },
          },
        }))}`,
        acl_rows: undefined,
        acl_read_columns: undefined,
        found: [{
          _id: fixtures[0]._id.toString(),
          // same as timezone above (+10:00)
          createdAt: `${fixtures[0].createdAt.getUTCHours() + 10}`,
        }],
      },
    ]

    tests.push(...rawProjectionWithAggregationTests)
  }

  t.plan(tests.length + testsConfToExport.length)
  // it is safe to instantiate the test once, since all
  // the tests only perform reads on the collection
  const { fastify, collection } = await setUpTest(t)

  // Test endpoints that return JSON payload
  tests.forEach(testConf => {
    const { name, found, ...conf } = testConf

    t.test(name, async t => {
      const response = await fastify.inject({
        method: 'GET',
        url: prefix + conf.url,
        headers: getHeaders(conf),
      })

      t.test('should return 200', t => {
        t.strictSame(response.statusCode, 200)
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
        const documents = await collection.find().toArray()
        t.strictSame(documents, fixtures)
        t.end()
      })

      t.end()
    })
  })

  // Test EXPORT endpoints, which return x-ndjson payload
  testsConfToExport.map(testConfToExport).forEach(testConf => {
    const { name, found, ...conf } = testConf

    t.test(`EXPORT ${name}`, async t => {
      const response = await fastify.inject({
        method: 'GET',
        url: prefix + conf.url,
        headers: getHeaders(conf),
      })

      t.test('should return 200', t => {
        t.strictSame(response.statusCode, 200)
        t.end()
      })

      t.test('should return "application/x-ndjson"', t => {
        t.ok(/application\/x-ndjson/.test(response.headers['content-type']))
        t.end()
      })

      t.test('should return the document', t => {
        const documents = response.payload.split('\n')
          .filter(s => s !== '')
          .map(JSON.parse)
        t.strictSame(documents, found)
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

tap.test('HTTP GET / - $text search', async t => {
  const textTests = [
    {
      name: 'with filter with $text search',
      url: `/?_q=${JSON.stringify({ $text: { $search: 'Ulyss', $caseSensitive: true } })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.name === 'Ulysses'),
      textIndex: true,
      scores: { 'fake isbn 1': 1 },
    },
    {
      name: 'with filter with $text search with $or clause and indexed fields',
      url: `/?_q=${JSON.stringify({ $or: [{ $text: { $search: 'Ulyss', $caseSensitive: true } }, { isbn: 'fake isbn 2' }] })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.name === 'Ulysses' || f.isbn === 'fake isbn 2'),
      textIndex: true,
      scores: { 'fake isbn 1': 1, 'fake isbn 2': 0 },
    },
    {
      name: 'with filter with $text search with all options',
      url: `/?_q=${JSON.stringify({ $text: { $search: 'Ulyss', $caseSensitive: true, $language: 'en', $diacriticSensitive: false } })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.name === 'Ulysses'),
      textIndex: true,
      scores: { 'fake isbn 1': 1 },
    },
    {
      name: 'with acl_rows and $text search filter',
      url: `/?_q=${JSON.stringify({ $text: { $search: 'Ulyss' } })}`,
      acl_rows: [{ price: { $gt: 20 } }],
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.price > 20 && f.name === 'Ulysses'),
      textIndex: true,
      scores: { 'fake isbn 1': 1 },
    },
    {
      name: 'with acl_rows and $text search filter not matching documents',
      url: `/?_q=${JSON.stringify({ $text: { $search: 'Ulyss' } })}`,
      acl_rows: [{ price: { $gt: 50 } }],
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.price > 50 && f.name === 'Ulysses'),
      textIndex: true,
      scores: { },
    },
    {
      name: 'with acl_read_columns and $text search filter',
      url: `/?_q=${JSON.stringify({ $text: { $search: 'Ulyss' } })}&_p=price,isbn`,
      acl_rows: undefined,
      acl_read_columns: ['isbn', 'name'],
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.name === 'Ulysses').map(f => ({ _id: f._id, isbn: f.isbn })),
      textIndex: true,
      scores: { 'fake isbn 1': 1 },
    },
  ]

  const assertExpectedResponse = (assert, payload, expectedPayload) => {
    for (const doc of payload) {
      const expectedDoc = { ...expectedPayload.filter(el => el.isbn === doc.isbn)[0] }
      const foundDoc = { ...doc }
      if (!foundDoc.score && expectedDoc.score === 0) {
        // accordingly to mongo version, when query is not of $text type
        // field `score` might be evaluated as 0 or as undefined
        // mongo 4.0 => 0, mongo 4.4 => undefined
        delete foundDoc.score
        delete expectedDoc.score
      }
      assert.strictSame(foundDoc, expectedDoc)
    }
  }

  t.plan(textTests.length * 2)
  // it is safe to instantiate the test once, since all
  // the tests only perform reads on the collection
  const { fastify, collection } = await setUpTest(t)

  // Test endpoints that return JSON payload
  textTests.forEach(testConf => {
    const { name, found, ...conf } = testConf

    t.test(name, async t => {
      const response = await fastify.inject({
        method: 'GET',
        url: prefix + conf.url,
        headers: getHeaders(conf),
      })

      t.test('should return 200', t => {
        t.strictSame(response.statusCode, 200)
        t.end()
      })

      t.test('should return "application/json"', t => {
        t.strictSame(response.headers['content-type'], 'application/json')
        t.end()
      })

      t.test('should return the document', t => {
        let expectedResponse = JSON.parse(JSON.stringify(found))
        if (testConf.textIndex) {
          expectedResponse = expectedResponse.map(doc => {
            return {
              ...doc,
              score: testConf.scores[doc.isbn],
            }
          })
        }
        assertExpectedResponse(t, JSON.parse(response.payload), expectedResponse)
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

  // Test EXPORT endpoints, which return x-ndjson payload
  textTests.map(testConfToExport).forEach(testConf => {
    const { name, found, ...conf } = testConf

    t.test(name, async t => {
      const response = await fastify.inject({
        method: 'GET',
        url: prefix + conf.url,
        headers: getHeaders(conf),
      })

      t.test('should return 200', t => {
        t.strictSame(response.statusCode, 200)
        t.end()
      })

      t.test('should return "application/x-ndjson"', t => {
        t.ok(/application\/x-ndjson/.test(response.headers['content-type']))
        t.end()
      })

      t.test('should return the document', t => {
        const documents = response.payload.split('\n')
          .filter(s => s !== '')
          .map(JSON.parse)
        t.strictSame(documents, found)
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

tap.test('HTTP GET / ', async t => {
  const { fastify, collection, resetCollection } = await setUpTest(t, [])

  t.test('filter on nested object with object notation cannot be used', async t => {
    // Documentation purpose
    const DOC = {
      ...fixtures[0],
      metadata: {
        somethingNumber: 2,
      },
      attachments: [{
        name: 'note',
        detail: {
          size: 6,
        },
      }],
    }
    await resetCollection([DOC])

    const filterQueryMetadata = { somethingNumber: 2 }
    const filterAttachments = [{
      name: 'note',
      detail: {
        size: 6,
      },
    }]

    const docOnDb = await collection.findOne({ metadata: filterQueryMetadata, attachments: filterAttachments })

    t.ok(docOnDb)

    const response = await fastify.inject({
      method: 'GET',
      url: `${prefix}/`,
      query: {
        metadata: JSON.stringify(filterQueryMetadata),
        attachments: JSON.stringify(filterAttachments),
      },
      headers: {},
    })

    t.strictSame(response.statusCode, 400)
    t.strictSame(JSON.parse(response.payload), {
      statusCode: 400,
      error: 'Bad Request',
      message: 'querystring must NOT have additional properties',
    })

    t.end()
  })

  t.test('(missing property)', async t => {
    await resetCollection()

    t.test('with _s with nonexistent property', async assert => {
      const response = await fastify.inject({
        method: 'GET',
        url: `${prefix}/?_s=nonexistent`,
        headers: {},
      })

      assert.strictSame(response.statusCode, 400)
      assert.end()
    })

    t.test('with _s with nonexistent and existing properties', async t => {
      const response = await fastify.inject({
        method: 'GET',
        url: `${prefix}/?_s=price,nonexistent`,
        headers: {},
      })

      t.strictSame(response.statusCode, 400)
      t.end()
    })

    t.test('with _s with existing nested and nonexistent properties', async t => {
      const response = await fastify.inject({
        method: 'GET',
        url: `${prefix}/?_s=attachments.name,nonexistent`,
        headers: {},
      })

      t.strictSame(response.statusCode, 400)
      t.end()
    })

    t.test('with _s with nonexistent and existing nested properties REPEATED QUERYSTRING', async t => {
      const response = await fastify.inject({
        method: 'GET',
        url: `${prefix}/?_s=nonexistent&_s=attachments.name`,
        headers: {},
      })

      t.strictSame(response.statusCode, 400)
      t.end()
    })

    t.end()
  })

  t.test('serialize correctly data on GET (a string should be casted to number to match schema)', async t => {
    const DOC = {
      ...fixtures[0],
      // expected to be casted to number
      price: '44',
      ignoreMe: 'expect to be ignored',
    }

    await resetCollection([DOC])

    const response = await fastify.inject({
      method: 'GET',
      url: '/books-endpoint/',
      headers: {},
    })

    t.strictSame(response.statusCode, 200)
    const [item] = JSON.parse(response.payload)

    t.equal(item.ignoreMe, undefined)
    t.strictSame(item.price, 44)

    t.end()
  })


  t.test('(limits)', async t => {
    const limitsFixtures = []
    for (let index = 0; index < 26; index++) {
      limitsFixtures.push({ [__STATE__]: STATES.PUBLIC, isbn: `default-test-${index}` })
    }

    await resetCollection(limitsFixtures)

    t.test('don\'t fail with minimum and maximum limit value and return only default numbers ', async t => {
      t.test('Minimum 1', async t => {
        const response = await fastify.inject({
          method: 'GET',
          url: `${prefix}/?_l=1`,
        })

        t.strictSame(response.statusCode, 200)
        t.end()
      })

      t.test('Maximum 200', async t => {
        const response = await fastify.inject({
          method: 'GET',
          url: `${prefix}/?_l=200`,
        })

        t.strictSame(response.statusCode, 200)
        t.end()
      })

      t.test('Return the default number of document', async t => {
        const response = await fastify.inject({
          method: 'GET',
          url: `${prefix}/`,
        })

        t.strictSame(response.statusCode, 200)
        t.strictSame(JSON.parse(response.payload).length, 25)
        t.end()
      })

      t.end()
    })

    t.test('fails with wrong limit value', async assert => {
      const response = await fastify.inject({
        method: 'GET',
        url: `${prefix}/?_l=500`,
      })

      assert.strictSame(response.statusCode, 400)
      assert.end()
    })

    t.end()
  })

  t.test('fails', async t => {
    await resetCollection()

    t.test('with 500', async t => {
      UNALLOWED_RAW_PROJECTIONS.forEach(projection => {
        t.test('Should not allow raw projection', async assert => {
          const { statusCode } = await fastify.inject({
            method: 'GET',
            url: `${prefix}/?_rawp=${JSON.stringify(projection)}`,
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
          url: `${prefix}/?_rawp=${JSON.stringify(RAW_PROJECTION_PLAIN_EXCLUSIVE)}`,
          headers: {
            acl_read_columns: ['price', 'author', 'name'],
          },
        })

        assert.strictSame(statusCode, 400)
        assert.strictSame(JSON.parse(payload), expectedPayload)
        assert.end()
      })

      t.end()
    })

    t.test('with 400 for mixed _rawp and _p', async t => {
      UNALLOWED_RAW_PROJECTIONS.forEach(projection => {
        t.test('Should not allow raw projection with projection', async assert => {
          const expectedPayload = {
            statusCode: 400,
            error: 'Bad Request',
            message: 'Use of both _rawp and _p parameter is not allowed',
          }
          const { statusCode, payload } = await fastify.inject({
            method: 'GET',
            url: `${prefix}/?_rawp=${JSON.stringify(projection)}&_p=author`,
            headers: {},
          })

          assert.strictSame(statusCode, 400)
          assert.strictSame(JSON.parse(payload), expectedPayload)
          assert.end()
        })
      })

      t.end()
    })

    t.test('with 400 due to usage of forbidden operators', async t => {
      BAD_RAW_PROJECTIONS_USAGE.forEach(projection => {
        t.test('Should not allow specified raw projection', async assert => {
          const expectedPayload = {
            statusCode: 400,
            error: 'Bad Request',
            message: `Operator ${projection.unwantedOperator} is not allowed in raw projection`,
          }
          const { statusCode, payload } = await fastify.inject({
            method: 'GET',
            url: `${prefix}/?_rawp=${JSON.stringify(projection.input)}`,
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

  t.end()
})

tap.test('HTTP GET / with _id in querystring', async t => {
  const tests = [
    {
      name: 'without filters',
      url: `/?_id=${STATION_ID}`,
      acl_rows: undefined,
      found: [HTTP_STATION_DOC],
    },
  ]

  const { fastify, collection } = await setUpTest(t, stationFixtures, 'stations')

  // Test endpoints that return JSON payload
  tests.forEach(testConf => {
    const { name, found, ...conf } = testConf

    t.test(name, async t => {
      const response = await fastify.inject({
        method: 'GET',
        url: stationsPrefix + conf.url,
        headers: getHeaders(conf),
      })

      t.test('should return 200', t => {
        t.strictSame(response.statusCode, 200)
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
        const documents = await collection.find().toArray()
        t.strictSame(documents, stationFixtures)
        t.end()
      })

      t.end()
    })
  })

  // Test EXPORT endpoints, which return x-ndjson payload
  tests.map(testConfToExport).forEach(testConf => {
    const { name, found, ...conf } = testConf

    t.test(name, async t => {
      const response = await fastify.inject({
        method: 'GET',
        url: stationsPrefix + conf.url,
        headers: getHeaders(conf),
      })

      t.test('should return 200', t => {
        t.strictSame(response.statusCode, 200)
        t.end()
      })

      t.test('should return "application/x-ndjson"', assert => {
        assert.ok(/application\/x-ndjson/.test(response.headers['content-type']))
        assert.end()
      })

      t.test('should return the document', assert => {
        const documents = response.payload.split('\n')
          .filter(s => s !== '')
          .map(JSON.parse)
        assert.strictSame(documents, found)
        assert.end()
      })
      t.test('should keep the document as is in database', async assert => {
        const documents = await collection.find().toArray()
        assert.strictSame(documents, stationFixtures)
        assert.end()
      })

      t.end()
    })
  })

  t.end()
})

tap.test('HTTP GET /export', async t => {
  const mongoDbCollectionName = booksCollectionDefinition.name
  const { fastify } = await setUpTest(t, lotOfBooksFixtures, mongoDbCollectionName)

  t.test('should return all documents', async t => {
    const response = await fastify.inject({
      method: 'GET',
      url: `${prefix}/export`,
    })
    const parseBodyResponse = response.body.split('\n').filter(item => item)
      .map(item => JSON.parse(item))

    t.strictSame(response.statusCode, 200)
    t.equal(parseBodyResponse.length, lotOfBooksFixtures.length)

    t.end()
  })

  t.test('should return only 3 documents', async(t) => {
    const response = await fastify.inject({
      method: 'GET',
      url: `${prefix}/export?_l=3`,
    })
    const parseBodyResponse = response.body.split('\n').filter(item => item)
      .map(item => JSON.parse(item))

    t.strictSame(response.statusCode, 200)
    t.equal(parseBodyResponse.length, 3)

    t.end()
  })

  t.test('should return greater than previous maximum default (200 documents)', async(t) => {
    const response = await fastify.inject({
      method: 'GET',
      url: `${prefix}/export?_l=201`,
    })
    const parseBodyResponse = response.body.split('\n').filter(item => item)
      .map(item => JSON.parse(item))

    t.strictSame(response.statusCode, 200)
    t.equal(parseBodyResponse.length, 201)

    t.end()
  })

  t.end()
})

if (process.env.MONGO_VERSION === '4.0') {
  tap.test('unsupported _rawp in MongoDB v4.0', async t => {
    const { fastify } = await setUpTest(t)

    const conf = {
      name: 'unsupported _rawp in MongoDB v4.0',
      url: `/?_rawp=${JSON.stringify(RAW_PROJECTION)}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
    }

    const response = await fastify.inject({
      method: 'GET',
      url: prefix + conf.url,
      headers: getHeaders(conf),
    })

    t.test('should return 200', t => {
      t.strictSame(response.statusCode, 400)
      t.end()
    })

    t.test('should return "application/json"', t => {
      t.end()
      t.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
    })

    t.test('should return the error message', t => {
      t.end()
      t.strictSame(JSON.parse(response.payload), {
        message: 'Unsupported projection option: attachments: { $filter: { input: "$attachments", as: "item", cond: { $in: [ "$$item.name", [ "note" ] ] } } }',
        error: 'Bad Request',
        statusCode: 400,
      })
    })

    t.end()
  })
}

function testConfToExport(testConf) {
  const url = testConf.url.replace('/', '/export')
  return Object.assign(testConf, { url })
}
