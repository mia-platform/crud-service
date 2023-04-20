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

const {
  STATES,
  ARRAY_MERGE_ELEMENT_OPERATOR,
  ARRAY_REPLACE_ELEMENT_OPERATOR,
} = require('../lib/consts')
const { fixtures, newUpdaterId, oldUpdaterId } = require('./utils')
const { setUpTest, prefix, NOT_FOUND_BODY, getHeaders } = require('./httpInterface.utils')

const [DOC] = fixtures
const HTTP_DOC = JSON.parse(JSON.stringify(DOC))
HTTP_DOC.position = HTTP_DOC.position.coordinates
const ID = DOC._id.toString()
const MATCHING_PRICE = DOC.price - 1
const NON_MATCHING_PRICE = DOC.price + 1

const NEW_PRICE = 44.0
const NEW_ATTACHMENTS = [{ name: 'name', stuff: 23 }, { name: 'name', other: 'stuff' }]
const MATCHING_QUERY = { price: { $gt: MATCHING_PRICE } }
const MATCHING_ATTACHMENT_QUERY = { 'attachments.name': 'note' }
const MATCHING_TAGIDS_QUERY = { tagIds: 1 }
const NON_MATCHING_QUERY = { price: { $gt: NON_MATCHING_PRICE } }
const RENAMED_ATTACHMENTS = [{ name: 'renamed', neastedArr: [1, 2, 3], detail: { size: 9 } }, { name: 'another-note', other: 'stuff' }]
const ATTACHMENT_MERGE = `attachments.$.${ARRAY_MERGE_ELEMENT_OPERATOR}`
const ATTACHMENT_REPLACE_ELEMENT = `attachments.$.${ARRAY_REPLACE_ELEMENT_OPERATOR}`
const TAGIDS_ELEMENT = `tagIds.$.${ARRAY_REPLACE_ELEMENT_OPERATOR}`

const UPDATE_COMMAND = {
  $set: {
    price: NEW_PRICE,
    attachments: NEW_ATTACHMENTS,
  },
}
const UPDATE_REPLACE_ARRAY_ELEMENT_COMMAND = {
  $set: {
    [ATTACHMENT_REPLACE_ELEMENT]: RENAMED_ATTACHMENTS[0],
  },
}
const UPDATE_ARRAY_MERGE_ELEMENT_COMMAND = {
  $set: {
    [ATTACHMENT_MERGE]: { name: 'renamed' },
  },
}
const UPDATE_ARRAY_ELEMENT_MERGE_MULTIPLE_FIELDS_COMMAND = {
  $set: {
    [ATTACHMENT_MERGE]: { name: 'renamed', neastedArr: [4, 5, 6, 0] },
  },
}
const UPDATE_REPLACE_NUMBER_ARRAY_ELEMENT_COMMAND = { $set: { [TAGIDS_ELEMENT]: 2 } }
const UPDATED_HTTP_DOC = {
  ...HTTP_DOC,
  price: NEW_PRICE,
  attachments: NEW_ATTACHMENTS,
  updaterId: newUpdaterId,
}

/**
 * NOTE: This file includes almost 300 test cases, which can cause Timeout problems during the CI pipelines in
 * cloud environments that might not be reproduced in a local environment
 *
 * In case you want to add more test cases, please be aware that a failure in CI pipelines
 * might be resolved splitting this file in two
 */

tap.test('HTTP PATCH /<id>', async t => {
  const tests = [
    {
      name: 'on document found',
      url: `/${ID}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      returnDoc: UPDATED_HTTP_DOC,
    },
    {
      name: 'unknown document',
      url: '/000000000000000000000000',
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: false,
      id: DOC._id,
    },
    {
      name: 'with matching filter',
      url: `/${ID}?_q=${JSON.stringify(MATCHING_QUERY)}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      returnDoc: UPDATED_HTTP_DOC,
    },
    {
      name: 'with matching query filter',
      url: `/${ID}?price=${DOC.price}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      returnDoc: UPDATED_HTTP_DOC,
    },
    {
      name: 'with non-matching filter',
      url: `/${ID}?_q=${JSON.stringify(NON_MATCHING_QUERY)}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: false,
      id: DOC._id,
    },
    {
      name: 'with matching acl_rows',
      url: `/${ID}`,
      acl_rows: [MATCHING_QUERY],
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      returnDoc: UPDATED_HTTP_DOC,
    },
    {
      name: 'with non-matching acl_rows',
      url: `/${ID}`,
      acl_rows: [NON_MATCHING_QUERY],
      acl_read_columns: undefined,
      found: false,
      id: DOC._id,
    },
    {
      name: 'with matching query and matching query filter',
      url: `/${ID}?_q=${JSON.stringify(MATCHING_QUERY)}&price=${DOC.price}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      returnDoc: UPDATED_HTTP_DOC,
    },
    {
      name: 'with non-matching query and matching query filter',
      url: `/${ID}?_q=${JSON.stringify(NON_MATCHING_QUERY)}&price=${DOC.price}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: false,
      id: DOC._id,
    },
    {
      name: 'with matching query and non-matching query filter',
      url: `/${ID}?_q=${JSON.stringify(MATCHING_QUERY)}&price=${NON_MATCHING_PRICE}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: false,
      id: DOC._id,
    },
    {
      name: 'with non-matching query and non-matching query filter',
      url: `/${ID}?_q=${JSON.stringify(NON_MATCHING_QUERY)}&price=${NON_MATCHING_PRICE}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: false,
      id: DOC._id,
    },
    {
      name: 'with matching query and matching acl_rows',
      url: `/${ID}?price=${DOC.price}`,
      acl_rows: [MATCHING_QUERY],
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      returnDoc: UPDATED_HTTP_DOC,
    },
    {
      name: 'with non-matching query and matching acl_rows',
      url: `/${ID}?price=${NON_MATCHING_PRICE}`,
      acl_rows: [MATCHING_QUERY],
      acl_read_columns: undefined,
      found: false,
      id: DOC._id,
    },
    {
      name: 'with matching query and non-matching acl_rows',
      url: `/${ID}?price=${MATCHING_PRICE}`,
      acl_rows: [NON_MATCHING_QUERY],
      acl_read_columns: undefined,
      found: false,
      id: DOC._id,
    },
    {
      name: 'with non-matching query and non-matching acl_rows',
      url: `/${ID}?price=${NON_MATCHING_PRICE}`,
      acl_rows: [NON_MATCHING_QUERY],
      acl_read_columns: undefined,
      found: false,
      id: DOC._id,
    },
    {
      name: 'with matching filter and matching acl_rows',
      url: `/${ID}?_q=${JSON.stringify(MATCHING_QUERY)}`,
      acl_rows: [MATCHING_QUERY],
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      returnDoc: UPDATED_HTTP_DOC,
    },
    {
      name: 'with non-matching filter and matching acl_rows',
      url: `/${ID}?_q=${JSON.stringify(NON_MATCHING_QUERY)}`,
      acl_rows: [MATCHING_QUERY],
      acl_read_columns: undefined,
      found: false,
      id: DOC._id,
    },
    {
      name: 'with matching filter and non-matching acl_rows',
      url: `/${ID}?_q=${JSON.stringify(MATCHING_QUERY)}`,
      acl_rows: [NON_MATCHING_QUERY],
      acl_read_columns: undefined,
      found: false,
      id: DOC._id,
    },
    {
      name: 'with non-matching filter and non-matching acl_rows',
      url: `/${ID}?_q=${JSON.stringify(NON_MATCHING_QUERY)}`,
      acl_rows: [NON_MATCHING_QUERY],
      acl_read_columns: undefined,
      found: false,
      id: DOC._id,
    },
    {
      name: 'with matching filter, matching query filter and matching acl_rows',
      url: `/${ID}?_q=${JSON.stringify(MATCHING_QUERY)}&price=${DOC.price}`,
      acl_rows: [MATCHING_QUERY],
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      returnDoc: UPDATED_HTTP_DOC,
    },
    {
      name: 'with non-matching filter, matching query filter and matching acl_rows',
      url: `/${ID}?_q=${JSON.stringify(NON_MATCHING_QUERY)}&price=${DOC.price}`,
      acl_rows: [MATCHING_QUERY],
      acl_read_columns: undefined,
      found: false,
      id: DOC._id,
    },
    {
      name: 'with matching filter, non-matching query filter and matching acl_rows',
      url: `/${ID}?_q=${JSON.stringify(MATCHING_QUERY)}&price=${NON_MATCHING_PRICE}`,
      acl_rows: [MATCHING_QUERY],
      acl_read_columns: undefined,
      found: false,
      id: DOC._id,
    },
    {
      name: 'with matching filter, matching query filter and non-matching acl_rows',
      url: `/${ID}?_q=${JSON.stringify(MATCHING_QUERY)}&price=${MATCHING_PRICE}`,
      acl_rows: [NON_MATCHING_QUERY],
      acl_read_columns: undefined,
      found: false,
      id: DOC._id,
    },
    {
      name: 'with state',
      url: `/${ID}?_st=${STATES.PUBLIC}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      returnDoc: UPDATED_HTTP_DOC,
    },
    {
      name: 'with state DRAFT',
      url: `/${ID}?_st=${STATES.DRAFT}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: false,
      id: DOC._id,
    },
    {
      name: 'with state DRAFT and found',
      url: `/${fixtures[4]._id}?_st=${STATES.DRAFT}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: fixtures[4]._id,
      returnDoc: (() => {
        const doc = JSON.parse(JSON.stringify(fixtures[4]))
        return { ...doc, price: NEW_PRICE, attachments: NEW_ATTACHMENTS, updaterId: newUpdaterId }
      })(),
    },
    {
      name: 'support $unset on ObjectId properties',
      url: `/${ID}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: { $unset: { authorAddressId: 'true' } },
      returnDoc: { ...((() => {
        // eslint-disable-next-line no-unused-vars
        const { authorAddressId, ...rest } = HTTP_DOC
        return rest
      })()),
      updaterId: newUpdaterId },
    },
    {
      name: 'support $push',
      url: `/${ID}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: { $push: { tags: 'new-tag', tagIds: 44 } },
      returnDoc: { ...HTTP_DOC,
        tagIds: HTTP_DOC.tagIds.concat([44]),
        tags: HTTP_DOC.tags.concat(['new-tag']),
        updaterId: newUpdaterId },
    },
    {
      name: 'support $push on Array of RawObject with properties jsonSchema defined',
      url: `/${ID}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: { $push: { attachments: { name: 'new-note', detail: { size: '9999' } } } },
      returnDoc: { ...HTTP_DOC,
        attachments: HTTP_DOC.attachments.concat([{ name: 'new-note', detail: { size: 9999 } }]),
        updaterId: newUpdaterId },
    },
    {
      name: 'support $addToSet',
      url: `/${ID}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: { $addToSet: { attachments: { name: 'new-note', detail: { size: '9999' } } } },
      returnDoc: { ...HTTP_DOC,
        attachments: HTTP_DOC.attachments.concat([{ name: 'new-note', detail: { size: 9999 } }]),
        updaterId: newUpdaterId },
    },
    {
      name: 'support $addToSet multiple items',
      url: `/${ID}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: { $addToSet: { tags: { $each: ['tag23', 'tag24'] } } },
      returnDoc: { ...HTTP_DOC,
        tags: HTTP_DOC.tags.concat(['tag23', 'tag24']),
        updaterId: newUpdaterId },
    },
    {
      name: 'support $addToSet no duplicates',
      url: `/${ID}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: { $addToSet: { tags: HTTP_DOC.tags[0], tagIds: HTTP_DOC.tagIds[0] } },
      returnDoc: { ...HTTP_DOC,
        updaterId: newUpdaterId },
    },
    {
      name: 'support $addToSet on Array of RawObject with properties jsonSchema defined',
      url: `/${ID}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: { $addToSet: { attachments: { name: 'new-note', detail: { size: '9999' } } } },
      returnDoc: { ...HTTP_DOC,
        attachments: HTTP_DOC.attachments.concat([{ name: 'new-note', detail: { size: 9999 } }]),
        updaterId: newUpdaterId },
    },
    {
      name: 'support $pull on array of objects',
      url: `/${ID}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: {
        $pull: { attachments: { name: 'note', neastedArr: [1, 2, 3], detail: { size: 9 } } },
      },
      returnDoc: {
        ...HTTP_DOC,
        attachments: [{
          name: 'another-note',
          other: 'stuff',
        }],
        updaterId: newUpdaterId,
      },
    },
    {
      name: 'support $pull on simple arrays',
      url: `/${ID}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: { $pull: { tags: 'tag1', tagIds: 1 } },
      returnDoc: {
        ...HTTP_DOC,
        tags: ['tag2'],
        tagIds: [5],
        updaterId: newUpdaterId,
      },
    },
    {
      name: 'support $pull with mongo operators',
      url: `/${ID}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: { $pull: { tags: { $in: ['tag1', 'tag2'] }, tagIds: 1 } },
      returnDoc: {
        ...HTTP_DOC,
        tags: [],
        tagIds: [5],
        updaterId: newUpdaterId,
      },
    },
    {
      name: 'on document found with acl_read_columns',
      url: `/${ID}`,
      acl_rows: undefined,
      acl_read_columns: ['_id', 'name', 'author', 'isbn', 'updatedAt'],
      found: true,
      id: DOC._id,
      returnDoc: { _id: DOC._id.toString(), name: DOC.name, author: DOC.author, isbn: DOC.isbn },
    },
    {
      name: 'update array: replace array element by matching query',
      url: `/${ID}?_q=${JSON.stringify(MATCHING_ATTACHMENT_QUERY)}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: UPDATE_REPLACE_ARRAY_ELEMENT_COMMAND,
      returnDoc: { ...HTTP_DOC,
        attachments: RENAMED_ATTACHMENTS,
        updaterId: newUpdaterId },
    },
    {
      name: 'update numbers array: replace array element by matching query',
      url: `/${ID}?_q=${JSON.stringify(MATCHING_TAGIDS_QUERY)}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: UPDATE_REPLACE_NUMBER_ARRAY_ELEMENT_COMMAND,
      returnDoc: { ...HTTP_DOC,
        tagIds: [2, 5],
        updaterId: newUpdaterId },
    },
    {
      name: 'update array: merge array element by matching query',
      url: `/${ID}?_q=${JSON.stringify(MATCHING_ATTACHMENT_QUERY)}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: UPDATE_ARRAY_MERGE_ELEMENT_COMMAND,
      returnDoc: { ...HTTP_DOC,
        attachments: RENAMED_ATTACHMENTS,
        updaterId: newUpdaterId },
    },
    {
      name: 'update array:  merge multiple fields of array object element by matching query',
      url: `/${ID}?_q=${JSON.stringify(MATCHING_ATTACHMENT_QUERY)}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: UPDATE_ARRAY_ELEMENT_MERGE_MULTIPLE_FIELDS_COMMAND,
      returnDoc: { ...HTTP_DOC,
        attachments: [{ name: 'renamed', neastedArr: [4, 5, 6, 0], detail: { size: 9 } }, { name: 'another-note', other: 'stuff' }],
        updaterId: newUpdaterId },
    },
    {
      name: 'update numbers array: replace array number element to number string by matching query',
      url: `/${ID}?_q=${JSON.stringify(MATCHING_TAGIDS_QUERY)}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: { $set: { 'tagIds.$.replace': '2' } },
      returnDoc: { ...HTTP_DOC,
        tagIds: [2, 5],
        updaterId: newUpdaterId },
    },
    {
      name: 'update strings array: replace array string element to string number by matching query',
      url: `/${ID}?_q=${JSON.stringify({ tags: 'tag1' })}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: { $set: { 'tags.$.replace': 2 } },
      returnDoc: { ...HTTP_DOC,
        tags: ['2', 'tag2'],
        updaterId: newUpdaterId },
    },
    {
      name: 'patch sub property of raw object - $inc',
      url: `/${ID}?_q=${JSON.stringify({ 'additionalInfo.foo': { $gt: 5 } })}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: { $inc: { 'additionalInfo.foo': 2 } },
      returnDoc: { ...HTTP_DOC,
        additionalInfo: {
          ...HTTP_DOC.additionalInfo,
          foo: HTTP_DOC.additionalInfo.foo + 2,
        },
        updaterId: newUpdaterId },
    },
    {
      name: 'patch sub property of raw object - $set',
      url: `/${ID}?_q=${JSON.stringify({ 'additionalInfo.foo': { $gt: 5 } })}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: { $set: { 'additionalInfo.foo': 77 } },
      returnDoc: { ...HTTP_DOC,
        additionalInfo: {
          ...HTTP_DOC.additionalInfo,
          foo: 77,
        },
        updaterId: newUpdaterId },
    },
    {
      name: 'patch sub property of raw object - $set',
      url: `/${ID}?_q=${JSON.stringify({ 'additionalInfo.foo': { $gt: 5 } })}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: { $set: { 'metadata.somethingNumber': 77, 'metadata.somethingString': 'the-string' } },
      returnDoc: { ...HTTP_DOC,
        metadata: {
          ...HTTP_DOC.metadata,
          somethingNumber: 77,
          somethingString: 'the-string',
        },
        updaterId: newUpdaterId },
    },
    {
      name: 'patch sub property of raw object - $unset',
      url: `/${ID}?_q=${JSON.stringify({ 'additionalInfo.foo': { $gt: 5 } })}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: { $unset: { 'additionalInfo.foo': true } },
      returnDoc: { ...HTTP_DOC,
        additionalInfo: ((() => {
          const additionalInfo = JSON.parse(JSON.stringify(HTTP_DOC.additionalInfo))
          delete additionalInfo.foo
          return additionalInfo
        })()),
        updaterId: newUpdaterId },
    },
    {
      name: 'patch sub property of raw object with raw schema - $inc',
      url: `/${ID}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: {
        $inc: {
          'metadata.somethingNumber': 4,
          'metadata.somethingArrayOfNumbers.0': 2,
        },
      },
      returnDoc: { ...HTTP_DOC,
        metadata: {
          ...HTTP_DOC.metadata,
          somethingNumber: HTTP_DOC.metadata.somethingNumber + 4,
          somethingArrayOfNumbers: [HTTP_DOC.metadata.somethingArrayOfNumbers[0] + 2],
        },
        updaterId: newUpdaterId },
    },
    {
      name: 'patch sub property of raw object with raw schema - $mul',
      url: `/${ID}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: DOC._id,
      command: {
        $mul: {
          'metadata.somethingNumber': 2,
          'metadata.somethingArrayOfNumbers.0': 3,
        },
      },
      returnDoc: { ...HTTP_DOC,
        metadata: {
          ...HTTP_DOC.metadata,
          somethingNumber: HTTP_DOC.metadata.somethingNumber * 2,
          somethingArrayOfNumbers: [HTTP_DOC.metadata.somethingArrayOfNumbers[0] * 3],
        },
        updaterId: newUpdaterId },
    },
  ]

  t.plan(tests.length)
  const { fastify, collection, resetCollection } = await setUpTest(t)

  tests.forEach(testConf => {
    const { name, found, ...conf } = testConf
    t.test(name, async t => {
      await resetCollection()

      const response = await fastify.inject({
        method: 'PATCH',
        url: prefix + conf.url,
        payload: conf.command || UPDATE_COMMAND,
        headers: {
          userId: newUpdaterId,
          ...getHeaders(conf),
        },
      })

      t.test(`should return ${found ? 200 : 404}`, t => {
        t.strictSame(response.statusCode, found ? 200 : 404, response.payload)
        t.end()
      })

      t.test('should return "application/json"', t => {
        t.ok(/application\/json/.test(response.headers['content-type']))
        t.end()
      })

      t.test(`should return ${found ? 'the id' : 'the not NOT_FOUND_BODY'}`, t => {
        if (conf.returnDoc) {
          const expected = { ...conf.returnDoc }
          delete expected.updatedAt
          const actual = JSON.parse(response.payload)
          t.ok(Number.isFinite(new Date(actual.updatedAt).getTime()))
          delete actual.updatedAt
          t.strictSame(actual, expected)
        } else {
          t.strictSame(JSON.parse(response.payload), found ? { _id: conf.id.toString() } : NOT_FOUND_BODY)
        }
        t.end()
      })

      t.test('on database', t => {
        if (!conf.command) {
          t.test(`should ${found ? '' : 'not'} update the document`, async t => {
            const doc = await collection.findOne({ _id: conf.id })
            if (found) {
              t.strictSame(doc.price, NEW_PRICE)
              t.strictSame(doc.attachments, NEW_ATTACHMENTS)
              t.strictSame(doc.updaterId, newUpdaterId)
              t.ok(Math.abs(Date.now() - doc.updatedAt.getTime()) < 5000, '`updatedAt` should be updated')
            } else {
              t.strictSame(doc.price, DOC.price)
              t.strictSame(doc.attachments, HTTP_DOC.attachments)
              t.strictSame(doc.updaterId, oldUpdaterId)
              t.ok(Math.abs(Date.now() - doc.updatedAt.getTime()) > 5000, '`updatedAt` should not be updated')
            }
            t.end()
          })
        }

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
