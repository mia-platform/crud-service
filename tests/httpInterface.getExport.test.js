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
  sortByPrice,
  sortByName,
  sortByDate,
  sortByAttachmentsName,
  sortByAdditionalInfo,
} = require('./utils')
const { setUpTest, prefix, stationsPrefix, getHeaders } = require('./httpInterface.utils')
const booksCollectionDefinition = require('./collectionDefinitions/books')
const csvStringify = require('csv-stringify/sync')

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

tap.test('HTTP GET /export', async t => {
  const tests = [
    {
      name: 'without filters',
      url: '/export',
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
      url: '/export?_s=price',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([])
        .sort((a, b) => sortByPrice(a, b, 1)),
    },
    {
      name: 'with invert sorting',
      url: '/export?_s=-price',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([])
        .sort((a, b) => sortByPrice(a, b, -1)),
    },
    {
      name: 'with multiple sorting COMMA',
      url: '/export?_s=price,name',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([])
        .sort((a, b) => sortByName(a, b, 1))
        .sort((a, b) => sortByPrice(a, b, 1)),
    },
    {
      name: 'with multiple invert sorting COMMA',
      url: '/export?_s=-price,-name',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([])
        .sort((a, b) => sortByName(a, b, -1))
        .sort((a, b) => sortByPrice(a, b, -1)),
    },
    {
      name: 'with multiple: normal sorting for first, invert second MULTIPLE QUERYSTRING',
      url: '/export?_s=price&_s=-name',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([])
        .sort((a, b) => sortByName(a, b, -1))
        .sort((a, b) => sortByPrice(a, b, 1)),
    },
    {
      name: 'with multiple: normal sorting for first, invert for second with subfield, normal for third COMMA',
      url: '/export?_s=price,-attachments.name,publishDate',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([])
        .sort((a, b) => sortByDate(a, b, 1))
        .sort((a, b) => sortByAttachmentsName(a, b, -1))
        .sort((a, b) => sortByPrice(a, b, 1)),
    },
    {
      name: 'with multiple: normal sorting for first and second (nested array) MULTIPLE QUERYSTRING',
      url: '/export?_s=price&_s=attachments.name',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([])
        .sort((a, b) => sortByAttachmentsName(a, b, 1))
        .sort((a, b) => sortByPrice(a, b, 1)),
    },
    {
      name: 'with multiple sorting, first RawObject and second normal field',
      url: '/export?_s=additionalInfo.notes&_s=price',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([])
        .sort((a, b) => sortByAdditionalInfo(a, b, 1))
        .sort((a, b) => sortByPrice(a, b, 1)),
    },
    {
      name: 'with skip and limit',
      url: '/export?_l=2&_sk=1',
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
      url: '/export?_p=price,name,author',
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.map(f => ({ _id: f._id, name: f.name, author: f.author, price: f.price })),
    },
    {
      name: 'with query filter',
      url: `/export?price=${publicFixtures[0].price}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.price === publicFixtures[0].price),
    },
    {
      name: 'with filter',
      url: `/export?_q=${JSON.stringify({ price: { $gt: 20 } })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.price > 20),
    },
    {
      name: 'with filter regex',
      url: `/export?_q=${JSON.stringify({ name: { $regex: 'ulysses', $options: 'si' } })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(f => /ulysses/i.test(f.name)),
    },
    {
      name: 'with non-matching filter',
      url: `/export?_q=${JSON.stringify({ price: { $gt: 20000000 } })}`,
      acl_rows: undefined,
      found: [],
    },
    {
      name: 'with filter with null values',
      url: `/export?_q=${JSON.stringify({ price: { $gt: 20 }, additionalInfo: null })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.price > 20 && !f.additionalInfo),
    },
    {
      name: 'with filter by additionalInfo nested with dot notation',
      url: `/export?_q=${JSON.stringify({ 'additionalInfo.notes.mynote': 'good' })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(
        f => f.additionalInfo && f.additionalInfo.notes && f.additionalInfo.notes.mynote === 'good'
      ),
    },
    {
      name: 'with filter by additionalInfo nested with dot notation with a command',
      url: `/export?_q=${JSON.stringify({ 'additionalInfo.notes.mynote': { $ne: 'good' } })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(
        f => !f.additionalInfo || !f.additionalInfo.notes || f.additionalInfo.notes.mynote !== 'good'
      ),
    },
    {
      name: '$exists: false',
      url: `/export?_q=${JSON.stringify({ 'additionalInfo.gg': { $exists: false } })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(
        f => !f.additionalInfo || !{}.hasOwnProperty.call(f.additionalInfo, 'gg')
      ),
    },
    {
      name: 'with filter by additionalInfo nested without dot notation (only one level)',
      url: `/export?_q=${JSON.stringify({ additionalInfo: { note: 'good' } })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.additionalInfo && f.additionalInfo.note === 'good'),
    },
    {
      name: 'with filter with geo search',
      url: `/export?_q=${JSON.stringify({ position: { $nearSphere: { from: [0, 0] } } })}&_p=_id`,
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
      url: `/export?_q=${JSON.stringify({ position: { $nearSphere: { from: [0, 0, 5] } } })}&_p=_id`,
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
      url: `/export?_q=${JSON.stringify({ position: { $nearSphere: { from: [0, 0], minDistance: 0, maxDistance: 10 } } })}&_p=_id`,
      acl_rows: undefined,
      found: [
        { _id: '111111111111111111111111' },
      ],
    },
    {
      name: 'with acl_rows',
      url: '/export',
      acl_rows: [{ price: { $gt: 20 } }],
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.price > 20),
    },
    {
      name: 'with acl_rows and query filter',
      url: '/export?isPromoted=true',
      acl_rows: [{ price: { $gt: 20 } }],
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.price > 20 && f.isPromoted === true),
    },
    {
      name: 'with acl_rows and filter',
      url: `/export?_q=${JSON.stringify({ isPromoted: true })}`,
      acl_rows: [{ price: { $gt: 20 } }],
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.price > 20 && f.isPromoted === true),
    },
    {
      name: 'with acl_read_columns',
      url: '/export',
      acl_rows: undefined,
      acl_read_columns: ['price', 'author'],
      found: HTTP_PUBLIC_FIXTURES.map(f => ({ _id: f._id, author: f.author, price: f.price })),
    },
    {
      name: 'with acl_read_columns > projection',
      url: '/export?_p=price',
      acl_rows: undefined,
      acl_read_columns: ['price', 'author'],
      found: HTTP_PUBLIC_FIXTURES.map(f => ({ _id: f._id, price: f.price })),
    },
    {
      name: 'with acl_read_columns < projection',
      url: '/export?_p=price,author,isbn',
      acl_rows: undefined,
      acl_read_columns: ['price', 'author'],
      found: HTTP_PUBLIC_FIXTURES.map(f => ({ _id: f._id, author: f.author, price: f.price })),
    },
    {
      name: 'with acl_read_columns intersect projection',
      url: '/export?_p=price,author,isbn',
      acl_rows: undefined,
      acl_read_columns: ['price', 'author', 'name'],
      found: HTTP_PUBLIC_FIXTURES.map(f => ({ _id: f._id, author: f.author, price: f.price })),
    },
    {
      name: 'with acl_read_columns not intersect projection',
      url: '/export?_p=price',
      acl_rows: undefined,
      acl_read_columns: ['author', 'name'],
      found: HTTP_PUBLIC_FIXTURES.map(f => ({ _id: f._id })),
    },
    {
      name: 'with state',
      url: `/export?_st=${STATES.PUBLIC}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: HTTP_PUBLIC_FIXTURES.concat([]),
    },
    {
      name: 'with state DRAFT',
      url: `/export?_p=name&_st=${STATES.DRAFT}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: fixtures.concat([]).filter(f => f[__STATE__] === STATES.DRAFT)
        .map(f => ({ _id: f._id.toString(), name: f.name })),
    },
    {
      name: 'with state DRAFT,PUBLIC',
      url: `/export?_p=name&_st=${STATES.DRAFT},${STATES.PUBLIC}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: fixtures.concat([]).filter(f => f[__STATE__] === STATES.DRAFT || f[__STATE__] === STATES.PUBLIC)
        .map(f => ({ _id: f._id.toString(), name: f.name })),
    },
    {
      name: '$elemMatch array rawobject array',
      url: `/export?_p=_id&_q=${JSON.stringify({ attachments: { $elemMatch: { neastedArr: { $in: [3] } } } })}`,
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
      url: `/export?_p=_id&_q=${JSON.stringify({ attachments: { $elemMatch: { name: { $in: ['my-name'] } } } })}`,
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
      url: '/export?_p=_id,isbn,metadata,attachments'
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
      url: '/export?_p=_id,isbn,metadata',
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
      url: '/export?_p=isbn,additionalInfo.foo,attachments.name',
      acl_rows: [{ 'metadata.somethingArrayOfNumbers.0': 5 }],
      acl_read_columns: undefined,
      found: [{
        _id: fixtures[0]._id.toString(),
        isbn: fixtures[0].isbn,
        additionalInfo: {
          foo: fixtures[0].additionalInfo.foo,
        },
        attachments: [
          {
            name: 'note',
          },
          {
            name: 'another-note',
          },
        ],
      }],
    },
    {
      name: 'correct project on inexistent field with _p',
      url: '/export?_p=isbn,additionalInfo.inexistentField',
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
      url: `/export?_q=${JSON.stringify({ 'attachments.name': 'another-note' })}&_p=attachments.$`,
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
      url: '/export?_p=a wrong projection',
      acl_rows: [{ 'metadata.somethingArrayOfNumbers.0': 5 }],
      acl_read_columns: undefined,
      found: [{
        _id: fixtures[0]._id.toString(),
      }],
    },
    {
      name: 'use of raw projection in url',
      url: `/export?_rawp=${JSON.stringify(RAW_PROJECTION_PLAIN_INCLUSIVE)}&_st=${STATES.DELETED},${STATES.PUBLIC},${STATES.TRASH},${STATES.DRAFT}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: EXPECTED_DOCS_FOR_INCLUSIVE_RAW_PROJECTION,
    },
    {
      name: 'use of raw projection in url with only PUBLIC documents',
      url: `/export?_rawp=${JSON.stringify(RAW_PROJECTION_PLAIN_INCLUSIVE)}&_st=${STATES.PUBLIC}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: EXPECTED_PUBLIC_DOCS_FOR_INCLUSIVE_RAW_PROJECTION,
    },
    {
      name: 'use of raw projection in url with _q',
      url: `/export?_q=${JSON.stringify({ name: 'Ulysses' })}&_rawp=${JSON.stringify(RAW_PROJECTION_PLAIN_INCLUSIVE)}&_st=${STATES.DELETED},${STATES.PUBLIC},${STATES.TRASH},${STATES.DRAFT}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: [EXPECTED_DOCS_FOR_INCLUSIVE_RAW_PROJECTION[0]],
    },
    {
      name: 'use of raw projection in url with _q with acl_columns',
      url: `/export?_q=${JSON.stringify({ name: 'Ulysses' })}&_rawp=${JSON.stringify(RAW_PROJECTION_PLAIN_INCLUSIVE)}&_st=${STATES.DELETED},${STATES.PUBLIC},${STATES.TRASH},${STATES.DRAFT}`,
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
      url: `/export?_rawp=${JSON.stringify(RAW_PROJECTION_PLAIN_EXCLUSIVE)}`,
      acl_rows: undefined,
      acl_read_columns: ['author'],
      found: publicFixtures.map((doc) => {
        return {
          _id: doc._id.toString(),
        }
      }),
    },
  ]

  /*
    rawProjection tests are added only if MongoDB version is 4.4 or above because
    they contain projection with aggregation expression not supported in older MongoDB version
  */

  if (process.env.MONGO_VERSION >= '4.4') {
    const rawProjectionWithAggregationTests = [
      {
        name: '[only in mongo 4.4+] use of raw projection in url',
        url: `/export?_rawp=${JSON.stringify(RAW_PROJECTION)}&_st=${STATES.DELETED},${STATES.PUBLIC},${STATES.TRASH},${STATES.DRAFT}`,
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
        url: `/export?_rawp=${JSON.stringify(RAW_PROJECTION)}&_st=${STATES.PUBLIC}`,
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
        url: `/export?_q=${JSON.stringify({ name: 'Ulysses' })}&_rawp=${JSON.stringify(RAW_PROJECTION)}&_st=${STATES.DELETED},${STATES.PUBLIC},${STATES.TRASH},${STATES.DRAFT}`,
        acl_rows: undefined,
        acl_read_columns: undefined,
        found: [{
          _id: fixtures[0]._id.toString(),
          attachments: fixtures[0].attachments.filter((attachment) => attachment.name === 'note'),
        }],
      },
      {
        name: '[only in mongo 4.4+] use of raw projection with $first operator',
        url: `/export?_q=${JSON.stringify({ name: 'Ulysses' })}&_rawp=${JSON.stringify(RAW_PROJECTION_FIRST_OP)}&_st=${STATES.DELETED},${STATES.PUBLIC},${STATES.TRASH},${STATES.DRAFT}`,
        acl_rows: undefined,
        acl_read_columns: undefined,
        found: [{
          _id: fixtures[0]._id.toString(),
          attachments: fixtures[0].attachments[0],
        }],
      },
      {
        name: '[only in mongo 4.4+] use of raw projection with $dateToString operator',
        url: `/export?_q=${JSON.stringify({ name: 'Ulysses' })}&_rawp=${encodeURIComponent(JSON.stringify({
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

  // t.plan(tests.length + testsConfToExport.length)
  // it is safe to instantiate the test once, since all
  // the tests only perform reads on the collection
  const { fastify, collection } = await setUpTest(t)

  tests.forEach(testConf => {
    const { name, found, ...conf } = testConf


    t.test(`EXPORT x-ndjson ${name}`, async t => {
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
        t.strictSame(documents, found, response.payload)
        t.end()
      })

      t.test('should keep the document as is in database', async t => {
        const documents = await collection.find().toArray()
        t.strictSame(documents, fixtures)
        t.end()
      })

      t.end()
    })

    t.test(`EXPORT json ${name}`, async t => {
      const accept = 'application/json'
      const response = await fastify.inject({
        method: 'GET',
        url: prefix + conf.url,
        headers: {
          ...getHeaders(conf),
          accept,
        },
      })

      t.test('should return 200', t => {
        t.strictSame(response.statusCode, 200)
        t.end()
      })

      t.test('should return "application/json"', t => {
        t.ok(/application\/json/.test(response.headers['content-type']))
        t.end()
      })

      t.test('should return the document', t => {
        const documents = JSON.parse(response.payload)
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

    t.test(`EXPORT csv ${name}`, async t => {
      const accept = 'text/csv'
      const response = await fastify.inject({
        method: 'GET',
        url: prefix + conf.url,
        headers: {
          ...getHeaders(conf),
          accept,
        },
      })

      t.test('should return 200', t => {
        t.strictSame(response.statusCode, 200)
        t.end()
      })

      t.test('should return "text/csv"', t => {
        t.ok(/text\/csv/.test(response.headers['content-type']))
        t.end()
      })

      t.test('should return the document', t => {
        const foundCsv = csvStringify.stringify(found, {
          encoding: 'utf8',
          delimiter: ',',
          escape: '\\',
          header: true,
          quote: false,
          cast: {
            object: (value) => {
              try {
                return { value: JSON.stringify(value), quote: true }
              } catch (errs) {
                return value
              }
            },
          },
        })
        t.strictSame(response.payload, foundCsv)
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
  t.end()
})

tap.test('HTTP GET /export - $text search', async t => {
  const textTests = [
    {
      name: 'with filter with $text search',
      url: `/export?_q=${JSON.stringify({ $text: { $search: 'Ulyss', $caseSensitive: true } })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.name === 'Ulysses'),
      textIndex: true,
      scores: { 'fake isbn 1': 1 },
    },
    {
      name: 'with filter with $text search with $or clause and indexed fields',
      url: `/export?_q=${JSON.stringify({ $or: [{ $text: { $search: 'Ulyss', $caseSensitive: true } }, { isbn: 'fake isbn 2' }] })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.name === 'Ulysses' || f.isbn === 'fake isbn 2'),
      textIndex: true,
      scores: removeZeroScoresBasedOnMongoVersion({ 'fake isbn 1': 1, 'fake isbn 2': 0 }, process.env.MONGO_VERSION),
    },
    {
      name: 'with filter with $text search with all options',
      url: `/export?_q=${JSON.stringify({ $text: { $search: 'Ulyss', $caseSensitive: true, $language: 'en', $diacriticSensitive: false } })}`,
      acl_rows: undefined,
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.name === 'Ulysses'),
      textIndex: true,
      scores: { 'fake isbn 1': 1 },
    },
    {
      name: 'with acl_rows and $text search filter',
      url: `/export?_q=${JSON.stringify({ $text: { $search: 'Ulyss' } })}`,
      acl_rows: [{ price: { $gt: 20 } }],
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.price > 20 && f.name === 'Ulysses'),
      textIndex: true,
      scores: { 'fake isbn 1': 1 },
    },
    {
      name: 'with acl_rows and $text search filter not matching documents',
      url: `/export?_q=${JSON.stringify({ $text: { $search: 'Ulyss' } })}`,
      acl_rows: [{ price: { $gt: 50 } }],
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.price > 50 && f.name === 'Ulysses'),
      textIndex: true,
      scores: { },
    },
    {
      name: 'with acl_read_columns and $text search filter',
      url: `/export?_q=${JSON.stringify({ $text: { $search: 'Ulyss' } })}&_p=price,isbn`,
      acl_rows: undefined,
      acl_read_columns: ['isbn', 'name'],
      found: HTTP_PUBLIC_FIXTURES.filter(f => f.name === 'Ulysses').map(f => ({ _id: f._id, isbn: f.isbn })),
      textIndex: true,
      scores: { 'fake isbn 1': 1 },
    },
  ]

  // it is safe to instantiate the test once, since all
  // the tests only perform reads on the collection
  const { fastify, collection } = await setUpTest(t)


  textTests.forEach(testConf => {
    const { name, found, scores, ...conf } = testConf
    const foundWithScores = found.map(val => ({
      ...val,
      ...{ ...(val.isbn in scores ? { score: scores[val.isbn] } : undefined) },
    }))

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

        t.strictSame(documents, foundWithScores)
        t.end()
      })
      t.test('should keep the document as is in database', async t => {
        const documents = await collection.find().toArray()
        t.strictSame(documents, fixtures)
        t.end()
      })

      t.end()
    })

    t.test(`EXPORT json ${name}`, async t => {
      const accept = 'application/json'
      const response = await fastify.inject({
        method: 'GET',
        url: prefix + conf.url,
        headers: {
          ...getHeaders(conf),
          accept,
        },
      })

      t.test('should return 200', t => {
        t.strictSame(response.statusCode, 200)
        t.end()
      })

      t.test('should return "application/json"', t => {
        t.ok(/application\/json/.test(response.headers['content-type']))
        t.end()
      })

      t.test('should return the document', t => {
        const documents = JSON.parse(response.payload)
        t.strictSame(documents, foundWithScores)
        t.end()
      })

      t.test('should keep the document as is in database', async t => {
        const documents = await collection.find().toArray()
        t.strictSame(documents, fixtures)
        t.end()
      })

      t.end()
    })

    t.test(`EXPORT csv ${name}`, async t => {
      const accept = 'text/csv'
      const response = await fastify.inject({
        method: 'GET',
        url: prefix + conf.url,
        headers: {
          ...getHeaders(conf),
          accept,
        },
      })

      t.test('should return 200', t => {
        t.strictSame(response.statusCode, 200)
        t.end()
      })

      t.test('should return "text/csv"', t => {
        t.ok(/text\/csv/.test(response.headers['content-type']))
        t.end()
      })

      t.test('should return the document', t => {
        const foundCsv = csvStringify.stringify(foundWithScores, {
          encoding: 'utf8',
          delimiter: ',',
          escape: '\\',
          header: true,
          quote: false,
          cast: {
            object: (value) => {
              try {
                return { value: JSON.stringify(value), quote: true }
              } catch (errs) {
                return value
              }
            },
          },
        })
        t.strictSame(response.payload, foundCsv)
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
  t.end()
})


tap.test('HTTP GET /export with _id in querystring', async t => {
  const tests = [
    {
      name: 'without filters',
      url: `/export?_id=${STATION_ID}`,
      acl_rows: undefined,
      found: [HTTP_STATION_DOC],
    },
  ]

  const { fastify, collection } = await setUpTest(t, stationFixtures, 'stations')

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

    t.test(`EXPORT json ${name}`, async t => {
      const accept = 'application/json'
      const response = await fastify.inject({
        method: 'GET',
        url: stationsPrefix + conf.url,
        headers: {
          ...getHeaders(conf),
          accept,
        },
      })

      t.test('should return 200', t => {
        t.strictSame(response.statusCode, 200, response.payload)
        t.end()
      })

      t.test('should return "application/json"', t => {
        t.ok(/application\/json/.test(response.headers['content-type']))
        t.end()
      })

      t.test('should return the document', t => {
        const documents = JSON.parse(response.payload)
        t.strictSame(documents, found)
        t.end()
      })

      t.test('should keep the document as is in database', async t => {
        const documents = await collection.find().toArray()
        t.strictSame(documents, stationFixtures)
        t.end()
      })

      t.end()
    })

    t.test(`EXPORT csv ${name}`, async t => {
      const accept = 'text/csv'
      const response = await fastify.inject({
        method: 'GET',
        url: stationsPrefix + conf.url,
        headers: {
          ...getHeaders(conf),
          accept,
        },
      })

      t.test('should return 200', t => {
        t.strictSame(response.statusCode, 200)
        t.end()
      })

      t.test('should return "text/csv"', t => {
        t.ok(/text\/csv/.test(response.headers['content-type']))
        t.end()
      })

      t.test('should return the document', t => {
        const foundCsv = csvStringify.stringify(found, {
          encoding: 'utf8',
          delimiter: ',',
          escape: '\\',
          header: true,
          quote: false,
          cast: {
            object: (value) => {
              try {
                return { value: JSON.stringify(value), quote: true }
              } catch (errs) {
                return value
              }
            },
          },
        })
        t.strictSame(response.payload, foundCsv)
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

function removeZeroScoresBasedOnMongoVersion(scores, mongoVersion) {
  // Update code to handle MongoDB version 4.4 change.
  // Previous versions accepted "score: 0" field in response on $text search,
  // but it is now removed
  if (mongoVersion >= '4.4') {
    return Object.fromEntries(Object.entries(scores).filter((_, value) => value === 0))
  }

  return scores
}
