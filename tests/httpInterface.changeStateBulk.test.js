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
  newUpdaterId,
  oldUpdaterId,
  trashFixture,
  deletedFixture,
} = require('./utils')
const { setUpTest, prefix, getHeaders } = require('./httpInterface.utils')

const [DOC] = publicFixtures
const HTTP_DOC = JSON.parse(JSON.stringify(DOC))
HTTP_DOC.position = HTTP_DOC.position.coordinates
const MATCHING_PRICE = DOC.price - 1

const MATCHING_QUERY = { price: { $gt: MATCHING_PRICE } }

tap.test('HTTP POST /state', async t => {
  const tests = [
    {
      name: 'filter by _id',
      url: '/state',
      acl_rows: undefined,
      payload: [
        {
          filter: {
            _id: publicFixtures[0]._id,
          },
          stateTo: STATES.DRAFT,
        },
        {
          filter: {
            _id: publicFixtures[1]._id,
          },
          stateTo: STATES.DRAFT,
        },
      ],
      editedDocumentIds: [
        { _id: publicFixtures[0]._id, state: STATES.DRAFT, updaterId: newUpdaterId },
        { _id: publicFixtures[1]._id, state: STATES.DRAFT, updaterId: newUpdaterId },
      ],
      count: 2,
    },
    {
      name: 'with acl_rows',
      url: '/state',
      acl_rows: MATCHING_QUERY,
      payload: [
        {
          filter: {
            _id: publicFixtures[0]._id,
          },
          stateTo: STATES.DRAFT,
        },
        {
          filter: {
            _id: publicFixtures[1]._id,
          },
          stateTo: STATES.DRAFT,
        },
      ],
      editedDocumentIds: [
        { _id: publicFixtures[0]._id, state: STATES.DRAFT, updaterId: newUpdaterId },
        { _id: publicFixtures[1]._id, state: STATES.PUBLIC, updaterId: oldUpdaterId },
      ],
      count: 1,
    },
    {
      name: 'with acl_rows',
      url: '/state',
      acl_rows: MATCHING_QUERY,
      payload: [
        {
          filter: {
            _id: publicFixtures[1]._id,
          },
          stateTo: STATES.DRAFT,
        },
        {
          filter: {
            _id: publicFixtures[0]._id,
          },
          stateTo: STATES.DRAFT,
        },
      ],
      editedDocumentIds: [
        { _id: publicFixtures[0]._id, state: STATES.DRAFT, updaterId: newUpdaterId },
        { _id: publicFixtures[1]._id, state: STATES.PUBLIC, updaterId: oldUpdaterId },
      ],
      count: 1,
    },
    {
      name: 'with query filter - should update only matching items',
      url: '/state',
      acl_rows: undefined,
      payload: [
        {
          filter: {
            _id: publicFixtures[0]._id,
            price: publicFixtures[0].price,
          },
          stateTo: STATES.DRAFT,
        },
        {
          filter: {
            _id: publicFixtures[1]._id,
            price: publicFixtures[1].price - 1,
          },
          stateTo: STATES.DRAFT,
        },
      ],
      editedDocumentIds: [
        { _id: publicFixtures[0]._id, state: STATES.DRAFT, updaterId: newUpdaterId },
        // this have not to be updated because price !== publicFixtures[1].price - 1
        { _id: publicFixtures[1]._id, state: STATES.PUBLIC, updaterId: oldUpdaterId },
      ],
      count: 1,
    },
    {
      name: 'with unmatching filter on nested object with object notation',
      url: '/state',
      acl_rows: undefined,
      payload: [
        {
          filter: {
            _id: publicFixtures[0]._id,
            metadata: {
              somethingNumber: 999,
              somethingString: 'unmatching',
              somethingArrayObject: [{
                arrayItemObjectChildNumber: 4,
              }],
              somethingArrayOfNumbers: [5],
            },
          },
          stateTo: STATES.DRAFT,
        },
      ],
      editedDocumentIds: [
        // have to be unchanged
        { _id: publicFixtures[0]._id, state: STATES.PUBLIC, updaterId: oldUpdaterId },
      ],
      count: 0,
    },
    {
      name: 'with matching filter on nested object with object notation',
      url: '/state',
      acl_rows: undefined,
      payload: [
        {
          filter: {
            _id: publicFixtures[0]._id,
            metadata: {
              somethingNumber: '2',
              somethingString: 'the-saved-string',
              somethingArrayObject: [{
                arrayItemObjectChildNumber: '4',
              }],
              somethingArrayOfNumbers: ['5'],
            },
          },
          stateTo: STATES.DRAFT,
        },
      ],
      editedDocumentIds: [
        { _id: publicFixtures[0]._id, state: STATES.DRAFT, updaterId: newUpdaterId },
      ],
      count: 1,
    },
    {
      name: 'with unmatching filter on nested object with dot-notation',
      url: '/state',
      acl_rows: undefined,
      payload: [
        {
          filter: {
            _id: publicFixtures[0]._id,
            'metadata.somethingNumber': 999,
            'metadata.somethingString': 'unmatching',
            'metadata.somethingArrayObject.0.arrayItemObjectChildNumber': 4,
            'metadata.somethingArrayOfNumbers.0': 5,
          },
          stateTo: STATES.DRAFT,
        },
      ],
      editedDocumentIds: [
        // have to be unchanged
        { _id: publicFixtures[0]._id, state: STATES.PUBLIC, updaterId: oldUpdaterId },
      ],
      count: 0,
    },
    {
      name: 'with matching filter on nested object with dot-notation',
      url: '/state',
      acl_rows: undefined,
      payload: [
        {
          filter: {
            _id: publicFixtures[0]._id,
            'metadata.somethingNumber': '2',
            'metadata.somethingString': 'the-saved-string',
            'metadata.somethingArrayObject.0.arrayItemObjectChildNumber': '4',
            'metadata.somethingArrayOfNumbers.0': '5',
            'attachments.0.detail.size': '9',
          },
          stateTo: STATES.DRAFT,
        },
      ],
      editedDocumentIds: [
        { _id: publicFixtures[0]._id, state: STATES.DRAFT, updaterId: newUpdaterId },
      ],
      count: 1,
    },
    {
      name: 'with matching filter on nested object with dot-notation and array as values',
      url: '/state',
      acl_rows: undefined,
      payload: [
        {
          filter: {
            _id: publicFixtures[0]._id,
            'metadata.somethingArrayOfNumbers': ['5'],
          },
          stateTo: STATES.DRAFT,
        },
      ],
      editedDocumentIds: [
        { _id: publicFixtures[0]._id, state: STATES.DRAFT, updaterId: newUpdaterId },
      ],
      count: 1,
    },
    {
      name: 'with unmatching filter on nested object with dot-notation and array as values',
      url: '/state',
      acl_rows: undefined,
      payload: [
        {
          filter: {
            _id: publicFixtures[0]._id,
            'metadata.somethingArrayOfNumbers': ['99999999999'],
          },
          stateTo: STATES.DRAFT,
        },
      ],
      editedDocumentIds: [
        // have to be unchanged
        { _id: publicFixtures[0]._id, state: STATES.PUBLIC, updaterId: oldUpdaterId },
      ],
      count: 0,
    },
    {
      name: 'with unmatching filter on nested array of object with object notation',
      url: '/state',
      acl_rows: undefined,
      payload: [
        {
          filter: {
            _id: publicFixtures[0]._id,
            attachments: [
              {
                name: 'unmatching',
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
          },
          stateTo: STATES.DRAFT,
        },
      ],
      editedDocumentIds: [
        // have to be unchanged
        { _id: publicFixtures[0]._id, state: STATES.PUBLIC, updaterId: oldUpdaterId },
      ],
      count: 0,
    },
    {
      name: 'with matching filter on nested array of object with object notation',
      url: '/state',
      acl_rows: undefined,
      payload: [
        {
          filter: {
            _id: publicFixtures[0]._id,
            attachments: [
              {
                name: 'note',
                neastedArr: ['1', '2', '3'],
                detail: {
                  size: '9',
                },
              },
              {
                name: 'another-note',
                other: 'stuff',
              },
            ],
          },
          stateTo: STATES.DRAFT,
        },
      ],
      editedDocumentIds: [
        // have to be unchanged
        { _id: publicFixtures[0]._id, state: STATES.DRAFT, updaterId: newUpdaterId },
      ],
      count: 1,
    },
    {
      name: 'without _id - with query filter - should update only matching items',
      url: '/state',
      acl_rows: undefined,
      payload: [{
        filter: {
          tags: 'tag1',
        },
        stateTo: STATES.DRAFT,
      }],
      editedDocumentIds: [
        { _id: publicFixtures[0]._id, state: STATES.DRAFT, updaterId: newUpdaterId },
        { _id: publicFixtures[2]._id, state: STATES.DRAFT, updaterId: newUpdaterId },
        { _id: publicFixtures[3]._id, state: STATES.DRAFT, updaterId: newUpdaterId },
        { _id: trashFixture._id, state: STATES.DRAFT, updaterId: newUpdaterId },
        // has to be unchanged: DELETED -> DRAFT is not possible
        { _id: deletedFixture._id, state: STATES.DELETED, updaterId: oldUpdaterId },
      ],
      count: 4,
    },
    {
      name: 'without _id - with matching filter on nested object with object notation',
      url: '/state',
      acl_rows: undefined,
      payload: [
        {
          filter: {
            metadata: {
              somethingNumber: '2',
              somethingString: 'the-saved-string',
              somethingArrayObject: [{
                arrayItemObjectChildNumber: '4',
              }],
              somethingArrayOfNumbers: ['5'],
            },
          },
          stateTo: STATES.DRAFT,
        },
      ],
      editedDocumentIds: [
        { _id: publicFixtures[0]._id, state: STATES.DRAFT, updaterId: newUpdaterId },
      ],
      count: 1,
    },
    {
      name: 'without _id - with matching filter on nested object with dot-notation and array as values',
      url: '/state',
      acl_rows: undefined,
      payload: [
        {
          filter: {
            'metadata.somethingArrayOfNumbers': ['5'],
          },
          stateTo: STATES.DRAFT,
        },
      ],
      editedDocumentIds: [
        { _id: publicFixtures[0]._id, state: STATES.DRAFT, updaterId: newUpdaterId },
      ],
      count: 1,
    },
    {
      name: 'without _id - with unmatching filter on nested object with dot-notation and array as values',
      url: '/state',
      acl_rows: undefined,
      payload: [
        {
          filter: {
            'metadata.somethingArrayOfNumbers': ['99999999999'],
          },
          stateTo: STATES.DRAFT,
        },
      ],
      editedDocumentIds: [
        // have to be unchanged
        { _id: publicFixtures[0]._id, state: STATES.PUBLIC, updaterId: oldUpdaterId },
      ],
      count: 0,
    },
  ]

  t.plan(tests.length + 1)
  const { fastify, collection, resetCollection } = await setUpTest(t)

  tests.forEach(testConf => {
    const { name, count, payload, url, editedDocumentIds } = testConf

    t.test(name, async t => {
      await resetCollection()

      const response = await fastify.inject({
        method: 'POST',
        url: prefix + url,
        payload,
        headers: {
          userId: newUpdaterId,
          ...getHeaders(testConf),
        },
      })

      t.test('should return 200', t => {
        t.strictSame(response.statusCode, 200)
        t.end()
      })
      t.test('should return application/json', t => {
        t.ok(/application\/json/.test(response.headers['content-type']))
        t.end()
      })
      t.test('should return the right count', t => {
        t.strictSame(JSON.parse(response.payload), count)
        t.end()
      })

      t.test('on database', t => {
        t.test('should update the documents', async t => {
          const docs = await collection.find({ _id: { $in: editedDocumentIds.map(d => d._id) } }).toArray()

          docs.forEach((doc, index) => {
            t.test(`doc${index}`, t => {
              t.strictSame(doc[__STATE__], editedDocumentIds[index].state)
              t.strictSame(doc.updaterId, editedDocumentIds[index].updaterId)
              if (editedDocumentIds[index].updaterId !== oldUpdaterId) {
                t.ok(Math.abs(Date.now() - doc.updatedAt.getTime()) < 5000, '`updatedAt` should be updated')
              }
              t.end()
            })
          })

          t.end()
        })

        t.test('should keep the other documents as is', async t => {
          const documents = await collection.find({ _id: { $nin: editedDocumentIds.map(d => d._id) } }).toArray()
          t.strictSame(documents, fixtures.filter(f => !editedDocumentIds.some(d => d._id === f._id)))
          t.end()
        })

        t.end()
      })

      t.end()
    })
  })

  t.test('filter on RawObject', t => {
    t.test('should have required fields if set', async t => {
      await resetCollection()

      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/state`,
        payload: [{
          filter: {
            _id: publicFixtures[0]._id,
            metadata: {
              somethingString: 'foo',
              // somethingNumber is required
            },
          },
          stateTo: STATES.DRAFT,
        }],
        headers: {
          userId: newUpdaterId,
        },
      })

      t.equal(response.statusCode, 400)
      t.strictSame(JSON.parse(response.payload), {
        statusCode: 400,
        error: 'Bad Request',
        message: "body must have required property 'somethingNumber'",
      })

      t.end()
    })

    t.test('should have additionalProperties false if set', async t => {
      await resetCollection()

      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/state`,
        payload: [{
          filter: {
            _id: publicFixtures[0]._id,
            metadata: {
              somethingNumber: '3',
              uknownField: 2,
            },
          },
          stateTo: STATES.DRAFT,
        }],
        headers: {
          userId: newUpdaterId,
        },
      })

      t.equal(response.statusCode, 400)
      t.strictSame(JSON.parse(response.payload), {
        statusCode: 400,
        error: 'Bad Request',
        message: 'body must NOT have additional properties',
      })

      t.end()
    })

    t.end()
  })
})
