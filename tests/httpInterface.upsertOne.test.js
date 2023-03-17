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
const { omit } = require('ramda')

const { fixtures, newUpdaterId } = require('./utils')
const { setUpTest, prefix, getHeaders } = require('./httpInterface.utils')

const [DOC] = fixtures
const HTTP_DOC = JSON.parse(JSON.stringify(DOC))
HTTP_DOC.position = HTTP_DOC.position.coordinates
const MATCHING_PRICE = DOC.price - 1

const NEW_PRICE = 44.0
const NEW_ATTACHMENTS = [{ name: 'name', stuff: 23 }, { name: 'name2', other: 'stuff' }]
const MATCHING_QUERY = { price: { $gt: MATCHING_PRICE } }

const UPDATES = { price: NEW_PRICE, attachments: NEW_ATTACHMENTS }
const NULL_NAME_UPDATES = { name: null, price: NEW_PRICE, attachments: NEW_ATTACHMENTS }
const UPDATE_COMMAND = { $set: UPDATES }
const UPDATE_NULL_NAME_COMMAND = { $set: NULL_NAME_UPDATES }
const UPDATED_HTTP_DOC = { ...HTTP_DOC,
  price: NEW_PRICE,
  attachments: NEW_ATTACHMENTS,
  updaterId: newUpdaterId }
const UPDATED_NULL_NAME_HTTP_DOC = { ...HTTP_DOC,
  name: null,
  price: NEW_PRICE,
  attachments: NEW_ATTACHMENTS,
  updaterId: newUpdaterId }
const SET_ON_INSERT_COMMAND = { $setOnInsert: UPDATES }
const baseQuery = '/upsert-one'

tap.test('HTTP POST /upsert-one', async t => {
  const tests = [
    {
      name: 'on document found',
      url: `${baseQuery}?name=${DOC.name}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      retrieveDocumentQuery: { _id: DOC._id },
      returnDoc: UPDATED_HTTP_DOC,
    },
    {
      name: 'unknown document, insert new one',
      url: `${baseQuery}?name=Muahahahahahah`,
      acl_rows: undefined,
      acl_read_columns: ['_id', 'name', 'price', 'attachments'],
      found: false,
      id: DOC._id,
      retrieveDocumentQuery: { name: 'Muahahahahahah' },
      returnDoc: UPDATED_HTTP_DOC,
    },
    {
      name: 'unknown document, insert new one with setOnInsert',
      url: `${baseQuery}?name=Muahahahahahah`,
      acl_rows: undefined,
      acl_read_columns: ['_id', 'name', 'price', 'attachments'],
      found: false,
      setOnInsert: true,
      id: DOC._id,
      retrieveDocumentQuery: { name: 'Muahahahahahah' },
      returnDoc: UPDATED_HTTP_DOC,
    },
    {
      name: 'with matching filter',
      url: `${baseQuery}?_q=${JSON.stringify({ ...MATCHING_QUERY, name: DOC.name })}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      retrieveDocumentQuery: { _id: DOC._id },
      returnDoc: UPDATED_HTTP_DOC,
    },
    {
      name: 'with matching acl_rows',
      url: `${baseQuery}?_q=${JSON.stringify({ ...MATCHING_QUERY, name: DOC.name })}`,
      acl_rows: [MATCHING_QUERY],
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      retrieveDocumentQuery: { _id: DOC._id },
      returnDoc: UPDATED_HTTP_DOC,
    },
    {
      name: 'with matching query and matching query filter',
      url: `${baseQuery}?_q=${JSON.stringify({ ...MATCHING_QUERY, name: DOC.name })}&price=${DOC.price}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      retrieveDocumentQuery: { _id: DOC._id },
      returnDoc: UPDATED_HTTP_DOC,
    },
    {
      name: 'with matching query and matching query filter',
      url: `${baseQuery}?`
        + `metadata.somethingNumber=2`
        + `&metadata.somethingString=the-saved-string`
        + `&metadata.somethingArrayObject.0.arrayItemObjectChildNumber=4`
        + `&metadata.somethingArrayOfNumbers.0=5`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      retrieveDocumentQuery: { _id: DOC._id },
      returnDoc: UPDATED_HTTP_DOC,
    },
  ]

  const { fastify, collection, resetCollection } = await setUpTest(t)

  tests.forEach(testConf => {
    const { name, found, ...conf } = testConf

    t.test(name, async t => {
      await resetCollection()

      const response = await fastify.inject({
        method: 'POST',
        url: prefix + conf.url,
        payload: conf.setOnInsert ? SET_ON_INSERT_COMMAND : UPDATE_COMMAND,
        headers: {
          userId: newUpdaterId,
          ...getHeaders(conf),
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

      t.test(`should return ${found ? 'the id' : 'the inserted document'}`, t => {
        const responseDocument = JSON.parse(response.payload)
        if (found) {
          const expected = { ...conf.returnDoc }
          delete expected.updatedAt
          const actual = { ...responseDocument }
          t.ok(Number.isFinite(new Date(actual.updatedAt).getTime()))
          delete actual.updatedAt
          t.strictSame(actual, expected)
        } else {
          const otherProperties = omit(['_id', 'name'], responseDocument)
          t.strictSame(otherProperties, UPDATES)
        }
        t.end()
      })

      t.test('on database', async t => {
        t.test(`should ${found ? 'update' : 'insert'} the document`, async t => {
          const doc = await collection.findOne(conf.retrieveDocumentQuery)
          t.strictSame(doc.price, NEW_PRICE)
          t.strictSame(doc.attachments, NEW_ATTACHMENTS)
          t.strictSame(doc.updaterId, newUpdaterId)
          t.ok(doc.creatorId)
          t.ok(doc.createdAt)
          t.ok(doc.__STATE__)
          t.ok(Math.abs(Date.now() - doc.updatedAt.getTime()) < 5000, '`updatedAt` should be updated')
          t.end()
        })
      })
    })
  })

  t.test('unset ObjectId property on document found', async t => {
    await resetCollection()

    const response = await fastify.inject({
      method: 'POST',
      url: `${prefix + baseQuery}?name=${DOC.name}`,
      payload: { $unset: { authorAddressId: 'true' } },
      headers: { userId: newUpdaterId },
    })

    t.test('should return 200', t => {
      t.strictSame(response.statusCode, 200)
      t.end()
    })

    t.test('should return "application/json"', t => {
      t.ok(/application\/json/.test(response.headers['content-type']))
      t.end()
    })

    t.test('should return the id', t => {
      const responseDocument = JSON.parse(response.payload)
      const actual = { ...responseDocument }
      t.ok(Number.isFinite(new Date(actual.updatedAt).getTime()))
      delete actual.updatedAt

      const expected = omit(
        ['authorAddressId', 'updatedAt'],
        { ...HTTP_DOC, updaterId: newUpdaterId }
      )

      t.strictSame(actual, expected)
      t.end()
    })

    t.test('on database', async t => {
      t.test('should update the document', async t => {
        const doc = await collection.findOne({ _id: DOC._id })
        t.strictSame(doc.authorAddressId, undefined)
        t.ok(doc.creatorId)
        t.ok(doc.createdAt)
        t.ok(doc.__STATE__)
        t.ok(Math.abs(Date.now() - doc.updatedAt.getTime()) < 5000, '`updatedAt` should be updated')
        t.end()
      })
    })
  })

  t.test('HTTP POST /upsert-one - allow nullable field', async t => {
    const tests = [
      {
        name: 'on document found',
        url: `${baseQuery}?name=${DOC.name}`,
        acl_rows: undefined,
        acl_read_columns: undefined,
        found: true,
        id: DOC._id,
        retrieveDocumentQuery: { _id: DOC._id },
        returnDoc: UPDATED_NULL_NAME_HTTP_DOC,
      },
      {
        name: 'unknown document, insert new one',
        url: `${baseQuery}?price=44.0`,
        acl_rows: undefined,
        acl_read_columns: ['_id', 'name', 'price', 'attachments'],
        found: false,
        id: DOC._id,
        retrieveDocumentQuery: { price: NEW_PRICE },
        returnDoc: UPDATED_NULL_NAME_HTTP_DOC,
      },
      {
        name: 'unknown document, insert new one with setOnInsert',
        url: `${baseQuery}?price=44.0`,
        acl_rows: undefined,
        acl_read_columns: ['_id', 'name', 'price', 'attachments'],
        found: false,
        updateCommand: { $setOnInsert: NULL_NAME_UPDATES },
        id: DOC._id,
        retrieveDocumentQuery: { price: NEW_PRICE },
        returnDoc: UPDATED_NULL_NAME_HTTP_DOC,
      },
      {
        name: 'with matching filter',
        url: `${baseQuery}?_q=${JSON.stringify({ ...MATCHING_QUERY })}`,
        acl_rows: undefined,
        acl_read_columns: undefined,
        found: true,
        id: DOC._id,
        retrieveDocumentQuery: { _id: DOC._id },
        returnDoc: UPDATED_NULL_NAME_HTTP_DOC,
      },
      {
        name: 'with matching acl_rows',
        url: `${baseQuery}?_q=${JSON.stringify({ ...MATCHING_QUERY })}`,
        acl_rows: [MATCHING_QUERY],
        acl_read_columns: undefined,
        found: true,
        id: DOC._id,
        retrieveDocumentQuery: { _id: DOC._id },
        returnDoc: UPDATED_NULL_NAME_HTTP_DOC,
      },
      {
        name: 'with matching query and matching query filter',
        url: `${baseQuery}?_q=${JSON.stringify({ ...MATCHING_QUERY })}&price=${DOC.price}`,
        acl_rows: undefined,
        acl_read_columns: undefined,
        found: true,
        id: DOC._id,
        retrieveDocumentQuery: { _id: DOC._id },
        returnDoc: UPDATED_NULL_NAME_HTTP_DOC,
      },
      {
        name: 'date id nullable',
        url: `${baseQuery}?_q=${JSON.stringify({ ...MATCHING_QUERY })}&price=${DOC.price}`,
        acl_rows: undefined,
        acl_read_columns: undefined,
        found: true,
        updateCommand: { $set: { publishDate: null } },
        id: DOC._id,
        retrieveDocumentQuery: { _id: DOC._id },
        checkOnlySubset: true,
        docOnDatabase: {
          publishDate: null,
        },
        returnDoc: {
          publishDate: null,
        },
      },
    ]

    tests.forEach(testConf => {
      const { name, found, ...conf } = testConf

      t.test(name, async t => {
        await resetCollection()

        const response = await fastify.inject({
          method: 'POST',
          url: prefix + conf.url,
          payload: conf.updateCommand ? conf.updateCommand : UPDATE_NULL_NAME_COMMAND,
          headers: {
            userId: newUpdaterId,
            ...getHeaders(conf),
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

        t.test(`should return ${found ? 'the id' : 'the inserted document'}`, t => {
          // t.plan(1 + (found ? 1 : 0))
          const responseDocument = JSON.parse(response.payload)
          if (found) {
            if (conf.checkOnlySubset) {
              Object.keys(conf.returnDoc).forEach(key => {
                t.strictSame(responseDocument[key], conf.returnDoc[key])
              })
            } else {
              const expected = { ...conf.returnDoc }
              delete expected.updatedAt
              const actual = { ...responseDocument }
              t.ok(Number.isFinite(new Date(actual.updatedAt).getTime()))
              delete actual.updatedAt
              t.strictSame(actual, expected)
            }
          } else {
            const otherProperties = omit(['_id'], responseDocument)
            t.strictSame(otherProperties, NULL_NAME_UPDATES)
          }
          t.end()
        })

        t.test('on database', async t => {
          if (conf.docOnDatabase) {
            t.test(`should ${found ? 'update' : 'insert'} the document`, async t => {
              const doc = await collection.findOne(conf.retrieveDocumentQuery)
              Object.keys(conf.docOnDatabase).forEach(key => {
                t.strictSame(doc[key], conf.docOnDatabase[key])
              })
            })
          } else {
            t.test(`should ${found ? 'update' : 'insert'} the document`, async t => {
              const doc = await collection.findOne(conf.retrieveDocumentQuery)
              t.equal(doc.name, null)
              t.strictSame(doc.price, NEW_PRICE)
              t.strictSame(doc.attachments, NEW_ATTACHMENTS)
              t.strictSame(doc.updaterId, newUpdaterId)
              t.ok(doc.creatorId)
              t.ok(doc.createdAt)
              t.ok(doc.__STATE__)
              t.ok(Math.abs(Date.now() - doc.updatedAt.getTime()) < 5000, '`updatedAt` should be updated')

              t.end()
            })
          }
          t.end()
        })
      })
    })
  })

  t.test('MP4-472: updaterId null on insert', async t => {
    t.test('using $set in body', async t => {
      await resetCollection()

      const command = {
        $set: {
          name: 'doc1',
          isbn: 'isbn0000001',
          price: 100,
        },
      }

      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix + baseQuery}?name=i-dont-exisist`,
        payload: command,
        headers: {
          userId: 'my-totally-new-user',
        },
      })

      const parsedResponse = JSON.parse(response.payload)

      t.ok(parsedResponse.updatedAt)
      t.ok(parsedResponse.updaterId)
      t.equal(parsedResponse.updaterId, 'my-totally-new-user')
    })

    t.test('using $setOnInsert in body', async t => {
      await resetCollection()

      const command = {
        $setOnInsert: {
          name: 'doc2',
          isbn: 'isbn0000002',
          price: 100,
        },
      }

      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix + baseQuery}?name=i-dont-exisist`,
        payload: command,
        headers: {
          userId: 'my-totally-new-user',
        },
      })

      const parsedResponse = JSON.parse(response.payload)

      t.ok(parsedResponse.updatedAt)
      t.ok(parsedResponse.updaterId)
      t.equal(parsedResponse.updaterId, 'my-totally-new-user')
    })

    t.test('using $set and $setOnInsert in body', async t => {
      await resetCollection()

      const command = {
        $setOnInsert: {
          name: 'doc3',
          isbn: 'isbn0000003',
        },
        $set: {
          price: 100,
        },
      }

      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix + baseQuery}?name=i-dont-exisist`,
        payload: command,
        headers: {
          userId: 'my-totally-new-user',
        },
      })

      const parsedResponse = JSON.parse(response.payload)

      t.ok(parsedResponse.updatedAt)
      t.ok(parsedResponse.updaterId)
      t.equal(parsedResponse.updaterId, 'my-totally-new-user')
    })

    t.test('upsert without userId', async t => {
      await resetCollection()

      const command = {
        $setOnInsert: {
          name: 'doc3',
          isbn: 'isbn0000003',
        },
        $set: {
          price: 100,
        },
      }

      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix + baseQuery}?name=i-dont-exisist`,
        payload: command,
        headers: {
          // userId: 'my-totally-new-user'
        },
      })

      const parsedResponse = JSON.parse(response.payload)

      t.ok(parsedResponse.updatedAt)
      t.ok(parsedResponse.updaterId)
      t.equal(parsedResponse.updaterId, 'public')
    })

    t.test('upsert with empty userId', async t => {
      await resetCollection()

      const command = {
        $setOnInsert: {
          name: 'doc3',
          isbn: 'isbn0000003',
        },
        $set: {
          price: 100,
        },
      }

      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix + baseQuery}?name=i-dont-exisist`,
        payload: command,
        headers: {
          userId: '',
        },
      })

      const parsedResponse = JSON.parse(response.payload)

      t.ok(parsedResponse.updatedAt)
      t.ok(parsedResponse.updaterId)
      t.equal(parsedResponse.updaterId, 'public')
    })

    t.test('upsert with userId "null"', async t => {
      await resetCollection()

      const command = {
        $setOnInsert: {
          name: 'doc3',
          isbn: 'isbn0000003',
        },
        $set: {
          price: 100,
        },
      }

      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix + baseQuery}?name=i-dont-exisist`,
        payload: command,
        headers: {
          userId: 'null',
        },
      })

      const parsedResponse = JSON.parse(response.payload)

      t.ok(parsedResponse.updatedAt)
      t.ok(parsedResponse.updaterId)
      t.equal(parsedResponse.updaterId, 'public')
    })

    t.test('upsert with userId "undefined"', async t => {
      await resetCollection()

      const command = {
        $setOnInsert: {
          name: 'doc3',
          isbn: 'isbn0000003',
        },
        $set: {
          price: 100,
        },
      }

      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix + baseQuery}?name=i-dont-exisist`,
        payload: command,
        headers: {
          userId: 'null',
        },
      })

      const parsedResponse = JSON.parse(response.payload)

      t.ok(parsedResponse.updatedAt)
      t.ok(parsedResponse.updaterId)
      t.equal(parsedResponse.updaterId, 'public')
    })
  })
})
