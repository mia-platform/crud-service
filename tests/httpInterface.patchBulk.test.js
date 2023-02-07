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

const { STATES, ARRAY_MERGE_ELEMENT_OPERATOR } = require('../lib/consts')
const { fixtures, draftFixture } = require('./utils')
const { setUpTest, prefix, getHeaders } = require('./httpInterface.utils')

const [DOC] = fixtures
const HTTP_DOC = JSON.parse(JSON.stringify(DOC))
HTTP_DOC.position = HTTP_DOC.position.coordinates
const ID = DOC._id.toString()
const MATCHING_PRICE = DOC.price - 1
const NON_MATCHING_PRICE = DOC.price + 1

const ATTACHMENT_MERGE = `attachments.$.${ARRAY_MERGE_ELEMENT_OPERATOR}`

const NEW_PRICE = 44.0
const MATCHING_QUERY = { price: { $gt: MATCHING_PRICE } }
const NON_MATCHING_QUERY = { price: { $gt: NON_MATCHING_PRICE } }
const UPDATE_COMMAND = { $set: { price: NEW_PRICE } }

tap.test('HTTP PATCH /bulk', t => {
  const tests = [
    {
      name: 'without filter - one',
      url: '/bulk',
      acl_rows: undefined,
      payload: [
        {
          filter: {
            _id: ID,
          },
          update: UPDATE_COMMAND,
        },
      ],
      updatedDocumentNumber: 1,
      updatedDocumentIds: [DOC._id],
    },
    {
      name: 'without filter - two',
      url: '/bulk',
      acl_rows: undefined,
      payload: [
        {
          filter: {
            _id: ID,
          },
          update: UPDATE_COMMAND,
        },
        {
          filter: {
            _id: fixtures[1]._id,
          },
          update: UPDATE_COMMAND,
        },
      ],
      updatedDocumentNumber: 2,
      updatedDocumentIds: [DOC._id, fixtures[1]._id],
    },
    {
      name: 'without filter - two - only the first match',
      url: '/bulk',
      acl_rows: undefined,
      payload: [
        {
          filter: {
            _id: ID,
          },
          update: UPDATE_COMMAND,
        },
        {
          filter: {
            _id: fixtures[1]._id,
            price: 0,
          },
          update: UPDATE_COMMAND,
        },
      ],
      updatedDocumentNumber: 1,
      updatedDocumentIds: [DOC._id],
    },
    {
      name: 'without filter - two - only the second match',
      url: '/bulk',
      acl_rows: undefined,
      payload: [
        {
          filter: {
            _id: ID,
            price: 0,
          },
          update: UPDATE_COMMAND,
        },
        {
          filter: {
            _id: fixtures[1]._id,
          },
          update: UPDATE_COMMAND,
        },
      ],
      updatedDocumentNumber: 1,
      updatedDocumentIds: [fixtures[1]._id],
    },
    {
      name: 'without filter - two - no one match',
      url: '/bulk',
      acl_rows: undefined,
      payload: [
        {
          filter: {
            _id: ID,
            price: 0,
          },
          update: UPDATE_COMMAND,
        },
        {
          filter: {
            _id: fixtures[1]._id,
            price: 0,
          },
          update: UPDATE_COMMAND,
        },
      ],
      updatedDocumentNumber: 0,
      updatedDocumentIds: [],
    },
    {
      name: 'with matching acl_rows',
      url: '/bulk',
      acl_rows: [MATCHING_QUERY],
      payload: [
        {
          filter: {
            _id: ID,
          },
          update: UPDATE_COMMAND,
        },
      ],
      updatedDocumentNumber: 1,
      updatedDocumentIds: [DOC._id],
    },
    {
      name: 'with non-matching acl_rows',
      url: '/bulk',
      acl_rows: [NON_MATCHING_QUERY],
      payload: [
        {
          filter: {
            _id: ID,
          },
          update: UPDATE_COMMAND,
        },
      ],
      updatedDocumentNumber: 0,
      updatedDocumentIds: [],
    },
    {
      name: 'with only one matching acl_rows - first',
      url: '/bulk',
      acl_rows: [MATCHING_QUERY],
      payload: [
        {
          filter: {
            _id: ID,
          },
          update: UPDATE_COMMAND,
        },
        {
          filter: {
            _id: fixtures[1]._id,
          },
          update: UPDATE_COMMAND,
        },
      ],
      updatedDocumentNumber: 1,
      updatedDocumentIds: [DOC._id],
    },
    {
      name: 'with only one matching acl_rows - second',
      url: '/bulk',
      acl_rows: [MATCHING_QUERY],
      payload: [
        {
          filter: {
            _id: fixtures[1]._id,
          },
          update: UPDATE_COMMAND,
        },
        {
          filter: {
            _id: ID,
          },
          update: UPDATE_COMMAND,
        },
      ],
      updatedDocumentNumber: 1,
      updatedDocumentIds: [DOC._id],
    },
    {
      name: 'with draft - not found',
      url: '/bulk',
      acl_rows: [MATCHING_QUERY],
      payload: [
        {
          filter: {
            _id: draftFixture._id,
          },
          update: UPDATE_COMMAND,
        },
      ],
      updatedDocumentNumber: 0,
      updatedDocumentIds: [],
    },
    {
      name: 'with draft - found',
      url: '/bulk',
      acl_rows: [MATCHING_QUERY],
      payload: [
        {
          filter: {
            _id: draftFixture._id,
          },
          _st: `${STATES.DRAFT},${STATES.TRASH}`,
          update: UPDATE_COMMAND,
        },
      ],
      updatedDocumentNumber: 0,
      updatedDocumentIds: [],
    },
    {
      name: 'without _id',
      url: '/bulk',
      acl_rows: [MATCHING_QUERY],
      payload: [
        {
          filter: {
            isbn: 'fake isbn 1',
          },
          update: UPDATE_COMMAND,
        },
      ],
      updatedDocumentNumber: 1,
      updatedDocumentIds: [DOC._id],
    },
    {
      name: 'update array: merge two elements of array by filter matching query',
      url: '/bulk',
      acl_rows: undefined,
      payload: [
        {
          filter: {
            _q: JSON.stringify({ 'attachments.name': 'note' }),
          },
          update: { $set: { [ATTACHMENT_MERGE]: { name: 'renamed' }, ...UPDATE_COMMAND.$set } },
        },
        {
          filter: {
            _q: JSON.stringify({ 'attachments.name': 'my-name' }),
          },
          update: { $set: { [ATTACHMENT_MERGE]: { name: 'second-renamed' }, ...UPDATE_COMMAND.$set } },
        },
      ],
      updatedDocumentNumber: 2,
      updatedDocumentIds: [fixtures[0]._id, fixtures[7]._id],
      new_attachments_name: ['renamed', 'second-renamed'],
    },
  ]

  t.plan(tests.length + 5)

  tests.forEach(testConf => {
    const { name, ...conf } = testConf

    t.test(name, async t => {
      t.plan(4)
      const { fastify, collection } = await setUpTest(t)

      const response = await fastify.inject({
        method: 'PATCH',
        url: prefix + conf.url,
        payload: conf.payload,
        headers: getHeaders(conf),
      })

      t.test('should return 200', t => {
        t.plan(1)
        t.strictSame(response.statusCode, 200)
      })

      t.test('should return "application/json"', t => {
        t.plan(1)
        t.ok(/application\/json/.test(response.headers['content-type']))
      })

      t.test(`should return ${conf.updatedDocumentNumber}`, t => {
        t.plan(1)
        t.strictSame(JSON.parse(response.payload), conf.updatedDocumentNumber)
      })

      t.test('on database', t => {
        t.plan(2)

        t.test('should update the documents', async t => {
          const testsNum = conf.new_attachments_name ? conf.updatedDocumentNumber * 2 : conf.updatedDocumentNumber
          t.plan(testsNum)

          const docs = await collection.find({ _id: { $in: conf.updatedDocumentIds } }).toArray()
          docs.forEach(d => t.strictSame(d.price, NEW_PRICE))
          if (conf.new_attachments_name) {
            docs.forEach((d, i) => t.strictSame(d.attachments[0].name, conf.new_attachments_name[i]))
          }
        })

        t.test('should keep the other documents as is', async t => {
          t.plan(1)
          const documents = await collection.find({ _id: { $nin: conf.updatedDocumentIds } }).toArray()
          t.strictSame(documents, fixtures.filter(d => conf.updatedDocumentIds.indexOf(d._id) < 0))
        })
      })
    })
  })

  t.test('HTTP PATCH /bulk - nested object', async t => {
    const VALUE_AS_NUMBER = 123456
    const VALUE_AS_STRING = `${VALUE_AS_NUMBER}`

    t.test('can filter array', async t => {
      const DOC_FILTER_TEST = {
        ...fixtures[0],
        metadata: {
          ...fixtures[0].metadata,
          somethingArrayOfNumbers: [3, 5, 6],
        },
      }

      const UPDATE_COMMAND = { $set: { price: 999 } }

      t.test('for item value', async t => {
        const { fastify, collection } = await setUpTest(t, [DOC_FILTER_TEST])
        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/bulk`,
          payload: [
            {
              filter: {
                _id: DOC_FILTER_TEST._id,
                'metadata.somethingArrayOfNumbers': '5',
              },
              update: UPDATE_COMMAND,
            },
          ],
        })

        t.equal(JSON.parse(response.payload), 1)
        const docOnDb = await collection.findOne({ _id: DOC_FILTER_TEST._id })

        t.equal(docOnDb.price, 999)

        t.end()
      })

      t.test('for array value', async t => {
        const { fastify, collection } = await setUpTest(t, [DOC_FILTER_TEST])

        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/bulk`,
          payload: [
            {
              filter: {
                _id: DOC_FILTER_TEST._id,
                'metadata.somethingArrayOfNumbers': ['3', '5', '6'],
              },
              update: UPDATE_COMMAND,
            },
          ],
        })

        t.equal(JSON.parse(response.payload), 1)
        const docOnDb = await collection.findOne({ _id: DOC_FILTER_TEST._id })
        t.equal(docOnDb.price, 999)
        t.end()
      })

      t.test('unmatching', async t => {
        const { fastify, collection } = await setUpTest(t, [DOC_FILTER_TEST])

        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/bulk`,
          payload: [
            {
              filter: {
                _id: DOC_FILTER_TEST._id,
                'metadata.somethingArrayOfNumbers': [8888],
              },
              update: UPDATE_COMMAND,
            },
          ],
        })

        t.equal(JSON.parse(response.payload), 0)
        const docOnDb = await collection.findOne({ _id: DOC_FILTER_TEST._id })
        t.equal(docOnDb.price, DOC_FILTER_TEST.price)
        t.end()
      })

      t.end()
    })

    t.test('$set', async t => {
      const [DOC_TEST] = fixtures

      const UPDATE_COMMAND = {
        $set: {
          'metadata.somethingNumber': VALUE_AS_STRING,
          'metadata.somethingArrayObject.0.arrayItemObjectChildNumber': VALUE_AS_STRING,
          'metadata.somethingArrayOfNumbers.0': VALUE_AS_STRING,
        },
      }

      const { fastify, collection } = await setUpTest(t)

      const response = await fastify.inject({
        method: 'PATCH',
        url: `${prefix}/bulk`,
        payload: [
          {
            filter: {
              _id: DOC_TEST._id,
            },
            update: UPDATE_COMMAND,
          },
        ],
      })

      t.test('should update one document', t => {
        t.plan(1)
        t.equal(JSON.parse(response.payload), 1)
      })

      t.test('should update the document', async t => {
        const docOnDb = await collection.findOne({ _id: DOC_TEST._id })
        t.strictSame(docOnDb.metadata, {
          somethingNumber: VALUE_AS_NUMBER,
          somethingString: 'the-saved-string',
          somethingArrayObject: [{
            arrayItemObjectChildNumber: VALUE_AS_NUMBER,
          }],
          somethingArrayOfNumbers: [VALUE_AS_NUMBER],
        })
        t.end()
      })

      t.end()
    })

    t.test('$set - with replace operator', async t => {
      const OLD_VALUE = 2

      const DOC_REPLACE_TEST = {
        ...fixtures[0],
        metadata: {
          ...fixtures[0].metadata,
          somethingArrayOfNumbers: [3, OLD_VALUE, 6],
        },
      }

      const UPDATE_COMMAND = {
        $set: {
          'metadata.somethingArrayOfNumbers.$.replace': VALUE_AS_STRING,
        },
      }

      const { fastify, collection } = await setUpTest(t, [DOC_REPLACE_TEST])

      const response = await fastify.inject({
        method: 'PATCH',
        url: `${prefix}/bulk`,
        payload: [
          {
            filter: {
              _id: DOC_REPLACE_TEST._id,
              'metadata.somethingArrayOfNumbers': `${OLD_VALUE}`,
            },
            update: UPDATE_COMMAND,
          },
        ],
      })

      t.test('should update the document', async t => {
        t.equal(JSON.parse(response.payload), 1)

        const docOnDb = await collection.findOne({ _id: DOC_REPLACE_TEST._id })
        t.strictSame(docOnDb.metadata.somethingArrayOfNumbers, [3, VALUE_AS_NUMBER, 6])
        t.end()
      })

      t.end()
    })

    t.test('$push', async t => {
      const DOC_TEST = {
        ...fixtures[0],
        metadata: {
          somethingString: 'the-saved-string',
          somethingArrayOfNumbers: [3],
        },
        attachments: [{
          name: 'note',
          neastedArr: [123],
        }],
      }
      const UPDATE_COMMAND = {
        $push: {
          'attachments.0.neastedArr': VALUE_AS_STRING,
          'metadata.somethingArrayOfNumbers': VALUE_AS_STRING,
        },
      }

      const { fastify, collection } = await setUpTest(t, [DOC_TEST])

      const response = await fastify.inject({
        method: 'PATCH',
        url: `${prefix}/bulk`,
        payload: [
          {
            filter: {
              _id: DOC_TEST._id,
            },
            update: UPDATE_COMMAND,
          },
        ],
      })

      t.test('should update one document', t => {
        t.plan(1)
        t.equal(JSON.parse(response.payload), 1)
      })

      t.test('should update the document', async t => {
        const docOnDb = await collection.findOne({ _id: DOC_TEST._id })

        t.strictSame(docOnDb.metadata, {
          somethingString: 'the-saved-string',
          somethingArrayOfNumbers: [3, VALUE_AS_NUMBER],
        })

        t.strictSame(docOnDb.attachments, [{
          name: 'note',
          neastedArr: [123, VALUE_AS_NUMBER],
        }])

        t.end()
      })

      t.end()
    })

    t.test('$unset', async t => {
      const DOC_TO_UNSET = {
        ...fixtures[0],
        metadata: {
          somethingNumber: 3,
          somethingObject: {
            childNumber: 4,
          },
          somethingString: 'unsetme',
          somethingArrayObject: [{
            arrayItemObjectChildNumber: 4,
            anotherNumber: 99,
          }],
        },
        attachments: [
          {
            name: 'note-1',
            neastedArr: [1, 2, 3],
            detail: {
              size: 9,
            },
          },
        ],
      }
      const UPDATE_COMMAND = {
        $unset: {
          'metadata.somethingString': true,
          'metadata.somethingObject.childNumber': true,
          'metadata.somethingArrayObject.0.anotherNumber': true,
          'attachments.0.neastedArr': true,
          'attachments.0.detail': true,
        },
      }

      const { fastify, collection } = await setUpTest(t, [DOC_TO_UNSET, fixtures[1]])

      const response = await fastify.inject({
        method: 'PATCH',
        url: `${prefix}/bulk`,
        payload: [
          {
            filter: {
              _id: DOC_TO_UNSET._id,
            },
            update: UPDATE_COMMAND,
          },
        ],
      })

      t.test('should update one document', t => {
        t.plan(1)
        t.equal(JSON.parse(response.payload), 1)
      })

      t.test('should update the document', async t => {
        const docOnDb = await collection.findOne({ _id: DOC_TO_UNSET._id })
        t.strictSame(docOnDb.metadata, {
          somethingNumber: 3,
          somethingObject: {},
          somethingArrayObject: [{
            arrayItemObjectChildNumber: 4,
          }],
        })
        t.strictSame(docOnDb.attachments, [
          {
            name: 'note-1',
          },
        ])
        t.end()
      })

      t.end()
    })

    t.end()
  })

  t.test('with empty list', async t => {
    t.plan(2)
    const { fastify } = await setUpTest(t)

    const response = await fastify.inject({
      method: 'PATCH',
      url: `${prefix}/bulk`,
      payload: [],
      headers: {},
    })

    t.test('should return 400', t => {
      t.plan(1)
      t.strictSame(response.statusCode, 400)
    })

    t.test('should return "application/json"', t => {
      t.plan(1)
      t.ok(/application\/json/.test(response.headers['content-type']))
    })
  })

  t.test('unset ObjectId property', async t => {
    t.plan(4)
    const { fastify, collection } = await setUpTest(t)

    const response = await fastify.inject({
      method: 'PATCH',
      url: `${prefix}/bulk`,
      payload: [
        {
          filter: {
            _id: ID,
          },
          update: { $unset: { authorAddressId: 'true' } },
        },
      ],
      headers: {},
    })

    t.test('should return 200', t => {
      t.plan(1)
      t.strictSame(response.statusCode, 200)
    })

    t.test('should return "application/json"', t => {
      t.plan(1)
      t.ok(/application\/json/.test(response.headers['content-type']))
    })

    t.test('should return 1', t => {
      t.plan(1)
      t.strictSame(JSON.parse(response.payload), 1)
    })

    t.test('on database', t => {
      t.plan(2)

      t.test('should update the document', async t => {
        t.plan(1)

        const doc = await collection.findOne({ _id: DOC._id })
        t.strictSame(doc.authorAddressId, undefined)
      })

      t.test('should keep the other documents as is', async t => {
        t.plan(1)
        const documents = await collection.find({ _id: { $ne: DOC._id } }).toArray()
        t.strictSame(documents, fixtures.filter(d => d._id !== DOC._id))
      })
    })
  })

  t.test('unset required property', async t => {
    t.plan(2)
    const { fastify } = await setUpTest(t)

    const response = await fastify.inject({
      method: 'PATCH',
      url: `${prefix}/bulk`,
      payload: [
        {
          filter: {
            _id: ID,
          },
          update: { $unset: { name: true } },
        },
      ],
      headers: {},
    })

    t.test('should return 400', t => {
      t.plan(1)
      t.strictSame(response.statusCode, 400)
    })

    t.test('should return "application/json"', t => {
      t.plan(1)
      t.ok(/application\/json/.test(response.headers['content-type']))
    })
  })

  t.test('patch bulk bigger than 1 MB', async t => {
    t.plan(2)
    const { fastify } = await setUpTest(t)
    const n = 20000

    function dummyPatchBulk(n) {
      return Array.from({ length: n }, (v, k) => ({
        filter: {
          _id: ID,
        },
        update: {
          $set: {
            name: k.toString(),
          },
        },
      }))
    }

    const response = await fastify.inject({
      method: 'PATCH',
      url: `${prefix}/bulk`,
      payload: dummyPatchBulk(n),
      headers: {},
    })

    t.test('should return 200', t => {
      t.plan(1)
      t.strictSame(response.statusCode, 200)
    })

    t.test('should return "application/json"', t => {
      t.plan(1)
      t.ok(/application\/json/.test(response.headers['content-type']))
    })
  })
})

tap.test('HTTP PATCH /bulk - allow nullable field', t => {
  t.plan(1)

  const nowDate = new Date()
  const DOCS = [
    {
      name: 'Name0',
      isbn: 'aaaaa',
      price: 10.0,
      publishDate: nowDate,
      __STATE__: 'PUBLIC',
      position: [0, 0], /* [ lon, lat ] */
    },
    {
      name: 'Name1',
      isbn: 'bbbbb',
      price: 20.0,
      publishDate: nowDate,
      __STATE__: 'PUBLIC',
      position: [0, 0], /* [ lon, lat ] */
    },
    {
      name: 'Name2',
      isbn: 'ccccc  ',
      price: 10.0,
      publishDate: nowDate,
      __STATE__: 'PUBLIC',
      position: [0, 0], /* [ lon, lat ] */
    },
  ]

  t.test('ok', async t => {
    t.plan(4)

    const { fastify } = await setUpTest(t)
    const postResponse = await fastify.inject({
      method: 'POST',
      url: `${prefix}/bulk`,
      payload: DOCS,
    })
    t.test('should return 200', t => {
      t.plan(1)
      t.strictSame(postResponse.statusCode, 200, postResponse.payload)
    })
    t.test('should return application/json', t => {
      t.plan(1)
      t.ok(/application\/json/.test(postResponse.headers['content-type']))
    })
    t.test('should return the inserted ids', t => {
      t.plan(DOCS.length + 1)
      const postResult = JSON.parse(postResponse.payload)
      t.strictSame(postResult.length, DOCS.length)
      postResult.forEach(el => t.ok(el._id))
    })
    t.test('PATCH', async t => {
      t.plan(4)

      const postResult = JSON.parse(postResponse.payload)
      const update = { $set: { name: null } }
      const payload = postResult.map(el => ({
        filter: {
          _id: el._id,
        },
        update,
      }))

      const patchResponse = await fastify.inject({
        method: 'PATCH',
        url: `${prefix}/bulk`,
        payload,
      })

      t.test('should return 200', t => {
        t.plan(1)
        t.strictSame(patchResponse.statusCode, 200)
      })
      t.test('should return application/json', t => {
        t.plan(1)
        t.ok(/application\/json/.test(patchResponse.headers['content-type']))
      })
      t.test('should return the number of updated elements', t => {
        t.plan(1)
        const patchResult = JSON.parse(patchResponse.payload)
        t.strictSame(patchResult, DOCS.length)
      })
      t.test('should have null name', t => {
        t.plan(DOCS.length * 2)
        postResult.forEach(async el => {
          const getResponse = await fastify.inject({
            method: 'GET',
            url: `${prefix}/${el._id}`,
          })
          t.strictSame(getResponse.statusCode, 200)
          const getResult = JSON.parse(getResponse.payload)
          t.equal(getResult.name, null)
        })
      })
    })
  })
})
