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
const { STANDARD_FIELDS } = require('../lib/CrudService')

const { STATES, __STATE__, ARRAY_MERGE_ELEMENT_OPERATOR } = require('../lib/consts')
const { fixtures, newUpdaterId, checkDocumentsInDatabase } = require('./utils')
const { setUpTest, prefix, getHeaders } = require('./httpInterface.utils')
const collectionDefinition = require('./collectionDefinitions/books')

const [DOC] = fixtures
const HTTP_DOC = JSON.parse(JSON.stringify(DOC))
HTTP_DOC.position = HTTP_DOC.position.coordinates
const ID = DOC._id.toString()
const MATCHING_PRICE = DOC.price - 1
const NON_MATCHING_PRICE = DOC.price + 1

const NEW_PRICE = 44.0
const ATTACHMENT_MERGE = `attachments.$.${ARRAY_MERGE_ELEMENT_OPERATOR}`
const NEW_ATTACHMENTS = [{ name: 'name', stuff: 23 }, { other: 'stuff', name: 'name2' }]
const MATCHING_QUERY = { price: { $gt: MATCHING_PRICE } }
const NON_MATCHING_QUERY = { price: { $gt: NON_MATCHING_PRICE } }
const MATCHING_ATTACHMENT_QUERY = { 'attachments.name': { $in: ['note', 'my-name'] } }
const priceStateFilter = (price, states) => doc => (doc.price > price && states.includes(doc.__STATE__))
const UNKNOWN_ID = '000000000000000000000000'

const UPDATE_COMMAND = { $set: { price: NEW_PRICE, attachments: NEW_ATTACHMENTS } }
const applyUpdate = doc => ({ ...doc, ...UPDATE_COMMAND.$set })

tap.test('HTTP PATCH /', async t => {
  const tests = [
    {
      name: 'update all (public)',
      url: '/',
      acl_rows: undefined,
      expectedUpdatedDocuments: fixtures.filter(doc => doc.__STATE__ === STATES.PUBLIC).map(applyUpdate),
    },
    {
      name: 'update all',
      url: `/?_st=${Object.keys(STATES).join(',')}`,
      acl_rows: undefined,
      expectedUpdatedDocuments: fixtures.map(applyUpdate),
    },
    {
      name: 'one document',
      url: `/?_id=${ID}`,
      acl_rows: undefined,
      expectedUpdatedDocuments: fixtures.filter(doc => doc._id.toString() === ID).map(applyUpdate),
    },
    {
      name: 'unknown document',
      url: `/?_id=${UNKNOWN_ID}`,
      acl_rows: undefined,
      expectedUpdatedDocuments: [],
    },
    {
      name: 'with matching filter',
      url: `/?_q=${JSON.stringify(MATCHING_QUERY)}`,
      acl_rows: undefined,
      expectedUpdatedDocuments: fixtures.filter(priceStateFilter(MATCHING_PRICE, [STATES.PUBLIC])).map(applyUpdate),
    },
    {
      name: 'match multiple documents (only public)',
      url: `/?_q=${JSON.stringify({ price: { $gt: 20 } })}`,
      acl_rows: undefined,
      expectedUpdatedDocuments: fixtures.filter(priceStateFilter(20, [STATES.PUBLIC])).map(applyUpdate),
    },
    {
      name: 'match multiple documents',
      url: `/?_q=${JSON.stringify({ price: { $gt: 20 } })}&_st=${Object.keys(STATES).join(',')}`,
      acl_rows: undefined,
      expectedUpdatedDocuments: fixtures.filter(priceStateFilter(20, Object.keys(STATES))).map(applyUpdate),
    },
    {
      name: 'with non-matching filter',
      url: `/?_q=${JSON.stringify(NON_MATCHING_QUERY)}`,
      acl_rows: undefined,
      expectedUpdatedDocuments: [],
    },
    {
      name: 'with matching acl_rows',
      url: '/',
      acl_rows: [MATCHING_QUERY],
      expectedUpdatedDocuments: fixtures.filter(priceStateFilter(MATCHING_PRICE, [STATES.PUBLIC])).map(applyUpdate),
    },
    {
      name: 'with non-matching acl_rows',
      url: '/',
      acl_rows: [NON_MATCHING_QUERY],
      expectedUpdatedDocuments: [],
    },
    {
      name: 'with matching query and matching query filter',
      url: `/?_q=${JSON.stringify(MATCHING_QUERY)}&price=${DOC.price}`,
      acl_rows: undefined,
      expectedUpdatedDocuments: fixtures.filter(doc => doc.price > MATCHING_PRICE
        && doc.price === DOC.price
        && doc.__STATE__ === STATES.PUBLIC).map(applyUpdate),
    },
    {
      name: 'with non-matching query and matching query filter',
      url: `/?_q=${JSON.stringify(NON_MATCHING_QUERY)}&price=${DOC.price}`,
      acl_rows: undefined,
      expectedUpdatedDocuments: [],
    },
    {
      name: 'with matching query and non-matching query filter',
      url: `/?_q=${JSON.stringify(MATCHING_QUERY)}&price=${NON_MATCHING_PRICE}`,
      acl_rows: undefined,
      expectedUpdatedDocuments: [],
    },
    {
      name: 'with non-matching query and non-matching query filter',
      url: `/?_q=${JSON.stringify(NON_MATCHING_QUERY)}&price=${NON_MATCHING_PRICE}`,
      acl_rows: undefined,
      expectedUpdatedDocuments: [],
    },
    {
      name: 'with matching query and matching acl_rows',
      url: `/?price=${DOC.price}`,
      acl_rows: [MATCHING_QUERY],
      expectedUpdatedDocuments: fixtures.filter(doc => doc.price === DOC.price
        && doc.price > MATCHING_PRICE
        && doc.__STATE__ === STATES.PUBLIC).map(applyUpdate),
    },
    {
      name: 'with state DRAFT',
      url: `/?_st=${STATES.DRAFT}`,
      acl_rows: undefined,
      expectedUpdatedDocuments: fixtures.filter(doc => doc.__STATE__ === STATES.DRAFT).map(applyUpdate),
    },
    {
      name: 'update array: merge two array elements by matching query',
      url: `/?_q=${JSON.stringify(MATCHING_ATTACHMENT_QUERY)}`,
      acl_rows: undefined,
      command: { $set: { [ATTACHMENT_MERGE]: { name: 'renamed' } } },
      expectedUpdatedDocuments: [{
        ...fixtures[0],
        attachments: [
          {
            name: 'renamed',
            neastedArr: [1, 2, 3],
            detail: { size: 9 },
          },
          {
            name: 'another-note',
            other: 'stuff',
          }],
      }, {
        ...fixtures[7],
        attachments: [
          {
            name: 'renamed',
            neastedArr: [1, 2, 66],
          }],
      }],
    },
    {
      name: 'support $unset on ObjectId properties',
      url: `/?_id=${ID}`,
      acl_rows: undefined,
      command: { $unset: { authorAddressId: 'true' } },
      expectedUpdatedDocuments: fixtures.filter(doc => doc._id.toString() === ID)
        .map(doc => {
          // eslint-disable-next-line no-unused-vars
          const { authorAddressId, ...rest } = doc
          return rest
        }),
    },
    {
      name: 'support $pull on array properties',
      url: `/?_id=${ID}`,
      acl_rows: undefined,
      command: { $pull: { tags: 'tag2' } },
      expectedUpdatedDocuments: fixtures
        .filter(doc => doc._id.toString() === ID)
        .map(doc => ({ ...doc, tags: ['tag1'] })),
    },
    {
      name: 'support $pull on nested array properties',
      url: `/?_id=${ID}`,
      acl_rows: undefined,
      command: { $pull: { 'metadata.somethingArrayOfNumbers': 5 } },
      expectedUpdatedDocuments: fixtures
        .filter(doc => doc._id.toString() === ID)
        .map(doc => ({
          ...doc,
          metadata: { ...doc.metadata, somethingArrayOfNumbers: [] },
        })),
    },
    {
      name: 'support $pull on array of objects',
      url: `/?_id=${ID}`,
      acl_rows: undefined,
      command: { $pull: {
        attachments: { name: 'another-note', other: 'stuff' },
        'metadata.somethingArrayObject': { arrayItemObjectChildNumber: 4 },
      } },
      expectedUpdatedDocuments: fixtures
        .filter(doc => doc._id.toString() === ID)
        .map(doc => ({
          ...doc,
          metadata: { ...doc.metadata, somethingArrayObject: [] },
          attachments: [{ name: 'note', neastedArr: [1, 2, 3], detail: { size: 9 } }],
        })),
    },
  ]

  const { fastify, collection, resetCollection } = await setUpTest(t)

  tests.forEach(testConf => {
    const { name, url, command, expectedUpdatedDocuments } = testConf

    t.test(name, async t => {
      await resetCollection()

      const response = await fastify.inject({
        method: 'PATCH',
        url: prefix + url,
        payload: command || UPDATE_COMMAND,
        headers: {
          userId: newUpdaterId,
          ...getHeaders(testConf),
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

      t.test('should return the number of modified documents', t => {
        t.strictSame(JSON.parse(response.payload), expectedUpdatedDocuments.length)
        t.end()
      })

      t.test('on database', async t => {
        const updatedDocs = await collection.find(
          {
            _id: { $in: expectedUpdatedDocuments.map(doc => doc._id) },
          }
        ).toArray()

        for (let i = 0; i < updatedDocs.length; i++) {
          const actual = omit(['_id', 'updaterId', 'updatedAt'], updatedDocs[i])
          const expected = omit(['_id', 'updaterId', 'updatedAt'], expectedUpdatedDocuments[i])
          t.strictSame(actual, expected)
        }

        t.end()
      })

      t.end()
    })
  })

  t.test('- update Date', async t => {
    await resetCollection()

    const expectedUpdatedDocument = fixtures.find(doc => doc._id.toString() === ID)
    const response = await fastify.inject({
      method: 'PATCH',
      url: `${prefix}/?_id=${ID}`,
      payload: { $currentDate: { publishDate: 'true' } },
      headers: {
        userId: newUpdaterId,
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

    t.test('should return the number of modified documents', t => {
      t.strictSame(JSON.parse(response.payload), 1)
      t.end()
    })

    t.test('on database', async t => {
      const updatedDoc = await collection.findOne({ _id: DOC._id })

      t.ok(updatedDoc.publishDate > expectedUpdatedDocument.publishDate)

      const actual = omit(['_id', 'updaterId', 'updatedAt', 'publishDate'], updatedDoc)
      const expected = omit(['_id', 'updaterId', 'updatedAt', 'publishDate'], expectedUpdatedDocument)
      t.strictSame(actual, expected)
      t.end()
    })

    t.end()
  })

  t.test('- nested object', async t => {
    const DOC_TEST1 = {
      ...fixtures[0],
      author: 'James Joyce',
      metadata: {
        somethingNumber: 3,
        somethingString: 'a',
        somethingArrayObject: [{
          arrayItemObjectChildNumber: 4,
        }],
        somethingArrayOfNumbers: [2, 5],
      },
      attachments: [{
        name: 'note-a',
        neastedArr: [111],
      }],
    }
    const DOC_TEST2 = {
      ...fixtures[1],
      author: 'James Joyce',
      metadata: {
        somethingNumber: 4,
        somethingString: 'b',
        somethingArrayObject: [{
          arrayItemObjectChildNumber: 4,
        }],
        somethingArrayOfNumbers: [5],
      },
      attachments: [{
        name: 'note-b',
        neastedArr: [222, 333],
      }],
    }
    const DOC_TEST3 = {
      ...fixtures[2],
      author: 'Paul Auster',
      metadata: {
        somethingNumber: 5,
        somethingString: 'c',
        somethingArrayObject: [{
          arrayItemObjectChildNumber: 4,
        }],
        somethingArrayOfNumbers: [4],
      },
      attachments: [{
        name: 'note-c',
        neastedArr: [444],
      }],
    }

    const VALUE_AS_NUMBER = 5555
    const VALUE_AS_STRING = `${VALUE_AS_NUMBER}`

    t.test('$set', async t => {
      const matchingQuery = JSON.stringify({ author: 'James Joyce' })

      const UPDATE_COMMAND = {
        $set: {
          'metadata.somethingNumber': VALUE_AS_STRING,
        },
      }

      const EXPECTED_NUMBER_DOCUMENT_TO_UPDATE = 2

      await resetCollection([DOC_TEST1, DOC_TEST2, DOC_TEST3])

      const response = await fastify.inject({
        method: 'PATCH',
        url: `${prefix}/?_q=${matchingQuery}`,
        payload: UPDATE_COMMAND,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.test('should update the document', async t => {
        t.equal(JSON.parse(response.payload), EXPECTED_NUMBER_DOCUMENT_TO_UPDATE)

        const docsOnDb = await collection.find({ author: 'James Joyce' }).toArray()
        t.equal(docsOnDb.length, EXPECTED_NUMBER_DOCUMENT_TO_UPDATE)
        for (const item of docsOnDb) {
          t.strictSame(item.metadata.somethingNumber, VALUE_AS_NUMBER)
        }
        const unchanged = await collection.find({ author: { $ne: 'James Joyce' } }).toArray()
        t.equal(unchanged.length, 1)
        t.strictSame(unchanged, [DOC_TEST3])
      })

      t.end()
    })

    t.test('$set with positional operator', async t => {
      const EXPECTED_UPDATE = {
        [DOC_TEST1._id.toString()]: [2, VALUE_AS_NUMBER],
        [DOC_TEST2._id.toString()]: [VALUE_AS_NUMBER],
      }

      const UPDATE_COMMAND = {
        $set: {
          'metadata.somethingArrayOfNumbers.$.replace': VALUE_AS_STRING,
        },
      }

      const QUERY = {
        'metadata.somethingArrayOfNumbers': '5',
      }

      const EXPECTED_NUMBER_DOCUMENT_TO_UPDATE = Object.keys(EXPECTED_UPDATE).length

      await resetCollection([DOC_TEST1, DOC_TEST2, DOC_TEST3])

      const response = await fastify.inject({
        method: 'PATCH',
        url: `${prefix}/`,
        query: QUERY,
        payload: UPDATE_COMMAND,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.equal(response.payload, `${EXPECTED_NUMBER_DOCUMENT_TO_UPDATE}`)
      const docsOnDb = await collection.find({ 'metadata.somethingArrayOfNumbers': VALUE_AS_NUMBER }).toArray()
      t.equal(docsOnDb.length, EXPECTED_NUMBER_DOCUMENT_TO_UPDATE)

      for (const item of docsOnDb) {
        t.strictSame(item.metadata.somethingArrayOfNumbers, EXPECTED_UPDATE[item._id.toString()])
      }

      t.end()
    })

    t.test('$push', async t => {
      const matchingQuery = JSON.stringify({ author: 'James Joyce' })

      t.test('ok with casting', async t => {
        const UPDATE_COMMAND = {
          $push: {
            attachments: { detail: { size: VALUE_AS_STRING }, name: 'pushed' },
            'metadata.somethingArrayObject': { arrayItemObjectChildNumber: VALUE_AS_STRING },
            'metadata.somethingArrayOfNumbers': VALUE_AS_STRING,
          },
        }

        await resetCollection([DOC_TEST1, DOC_TEST2, DOC_TEST3])

        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/?_q=${matchingQuery}`,
          payload: UPDATE_COMMAND,
          headers: {
            userId: newUpdaterId,
          },
        })

        const EXPECTED_DOCUMENTS_TO_UPDATE = [DOC_TEST1, DOC_TEST2]
        t.equal(JSON.parse(response.payload), EXPECTED_DOCUMENTS_TO_UPDATE.length)

        const docsOnDb = await collection.find({ author: 'James Joyce' }).toArray()
        t.equal(docsOnDb.length, EXPECTED_DOCUMENTS_TO_UPDATE.length)

        for (const itemOnDb of docsOnDb) {
          const originalDoc = EXPECTED_DOCUMENTS_TO_UPDATE.find(doc => doc._id.toString() === itemOnDb._id.toString())
          t.strictSame(
            itemOnDb.attachments,
            originalDoc.attachments.concat({ detail: { size: VALUE_AS_NUMBER }, name: 'pushed' })
          )

          const originalMetadata = originalDoc.metadata
          const metadataOnDb = itemOnDb.metadata
          t.strictSame(
            metadataOnDb.somethingArrayObject,
            originalMetadata.somethingArrayObject.concat({ arrayItemObjectChildNumber: VALUE_AS_NUMBER })
          )
          t.strictSame(
            metadataOnDb.somethingArrayOfNumbers,
            originalMetadata.somethingArrayOfNumbers.concat(VALUE_AS_NUMBER)
          )
        }

        const unchanged = await collection.find({ author: { $ne: 'James Joyce' } }).toArray()
        t.equal(unchanged.length, 1)
        t.strictSame(unchanged, [DOC_TEST3])
      })

      t.test('ok with casting of array in array', async t => {
        const UPDATE_COMMAND = {
          $push: {
            'attachments.0.neastedArr': VALUE_AS_STRING,
          },
        }

        await resetCollection([DOC_TEST1, DOC_TEST2, DOC_TEST3])

        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/?_q=${matchingQuery}`,
          payload: UPDATE_COMMAND,
          headers: {
            userId: newUpdaterId,
          },
        })

        const EXPECTED_DOCUMENTS_TO_UPDATE = [DOC_TEST1, DOC_TEST2]

        t.equal(JSON.parse(response.payload), EXPECTED_DOCUMENTS_TO_UPDATE.length)

        const docsOnDb = await collection.find({ author: 'James Joyce' }).toArray()
        t.equal(docsOnDb.length, EXPECTED_DOCUMENTS_TO_UPDATE.length)

        for (const itemOnDb of docsOnDb) {
          const originalDoc = EXPECTED_DOCUMENTS_TO_UPDATE.find(doc => doc._id.toString() === itemOnDb._id.toString())
          t.strictSame(itemOnDb.attachments, [{
            ...originalDoc.attachments[0],
            neastedArr: originalDoc.attachments[0].neastedArr.concat(VALUE_AS_NUMBER),
          }])
        }

        const unchanged = await collection.find({ author: { $ne: 'James Joyce' } }).toArray()
        t.equal(unchanged.length, 1)
        t.strictSame(unchanged, [DOC_TEST3])
      })

      t.end()
    })

    t.test('$addToSet', async t => {
      const matchingQuery = JSON.stringify({ author: 'James Joyce' })

      t.test('ok with casting', async t => {
        const [duplicateValue] = DOC_TEST1.metadata.somethingArrayOfNumbers
        const UPDATE_COMMAND = {
          $addToSet: {
            attachments: { detail: { size: VALUE_AS_STRING }, name: 'pushed' },
            'metadata.somethingArrayObject': { arrayItemObjectChildNumber: VALUE_AS_STRING },
            'metadata.somethingArrayOfNumbers': duplicateValue,
          },
        }

        await resetCollection([DOC_TEST1, DOC_TEST2, DOC_TEST3])

        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/?_q=${matchingQuery}`,
          payload: UPDATE_COMMAND,
          headers: {
            userId: newUpdaterId,
          },
        })

        const EXPECTED_DOCUMENTS_TO_UPDATE = [DOC_TEST1, DOC_TEST2]
        t.equal(JSON.parse(response.payload), EXPECTED_DOCUMENTS_TO_UPDATE.length)

        const docsOnDb = await collection.find({ author: 'James Joyce' }).toArray()
        t.equal(docsOnDb.length, EXPECTED_DOCUMENTS_TO_UPDATE.length)

        for (const itemOnDb of docsOnDb) {
          const originalDoc = EXPECTED_DOCUMENTS_TO_UPDATE.find(doc => doc._id.toString() === itemOnDb._id.toString())
          t.strictSame(
            itemOnDb.attachments,
            originalDoc.attachments.concat({ detail: { size: VALUE_AS_NUMBER }, name: 'pushed' })
          )

          const originalMetadata = originalDoc.metadata
          const metadataOnDb = itemOnDb.metadata
          t.strictSame(
            metadataOnDb.somethingArrayObject,
            originalMetadata.somethingArrayObject.concat({ arrayItemObjectChildNumber: VALUE_AS_NUMBER })
          )

          const uniqueArray = [...new Set(originalMetadata.somethingArrayOfNumbers.concat(duplicateValue))]
          t.strictSame(
            metadataOnDb.somethingArrayOfNumbers,
            uniqueArray
          )
        }

        const unchanged = await collection.find({ author: { $ne: 'James Joyce' } }).toArray()
        t.equal(unchanged.length, 1)
        t.strictSame(unchanged, [DOC_TEST3])
      })

      t.test('ok with casting of array in array', async t => {
        const UPDATE_COMMAND = {
          $addToSet: {
            'attachments.0.neastedArr': VALUE_AS_STRING,
          },
        }

        await resetCollection([DOC_TEST1, DOC_TEST2, DOC_TEST3])

        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/?_q=${matchingQuery}`,
          payload: UPDATE_COMMAND,
          headers: {
            userId: newUpdaterId,
          },
        })

        const EXPECTED_DOCUMENTS_TO_UPDATE = [DOC_TEST1, DOC_TEST2]

        t.equal(JSON.parse(response.payload), EXPECTED_DOCUMENTS_TO_UPDATE.length)

        const docsOnDb = await collection.find({ author: 'James Joyce' }).toArray()
        t.equal(docsOnDb.length, EXPECTED_DOCUMENTS_TO_UPDATE.length)

        for (const itemOnDb of docsOnDb) {
          const originalDoc = EXPECTED_DOCUMENTS_TO_UPDATE.find(doc => doc._id.toString() === itemOnDb._id.toString())
          t.strictSame(itemOnDb.attachments, [{
            ...originalDoc.attachments[0],
            neastedArr: originalDoc.attachments[0].neastedArr.concat(VALUE_AS_NUMBER),
          }])
        }

        const unchanged = await collection.find({ author: { $ne: 'James Joyce' } }).toArray()
        t.equal(unchanged.length, 1)
        t.strictSame(unchanged, [DOC_TEST3])
      })

      t.end()
    })

    t.end()
  })

  t.test('- standard fields', t => {
    const requiredFieldNames = collectionDefinition
      .fields
      .filter(field => field.required)
      .map(field => field.name)
    t.plan(STANDARD_FIELDS.length + 1 + requiredFieldNames.length)

    function makeCheck(t, standardField, update) {
      t.test(`${standardField} cannot be updated`, async t => {
        await resetCollection()

        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/`,
          payload: update,
        })

        t.test('should return 400', t => {
          t.strictSame(response.statusCode, 400)
          t.end()
        })
        t.test('should return JSON', t => {
          t.ok(/application\/json/.test(response.headers['content-type']))
          t.end()
        })
        checkDocumentsInDatabase(t, collection, [], fixtures)

        t.end()
      })
    }

    STANDARD_FIELDS.forEach(
      standardField => makeCheck(t, standardField, { $set: { [standardField]: 'gg' } })
    )
    makeCheck(t, __STATE__, { $set: { [__STATE__]: 'gg' } })
    requiredFieldNames.map(
      name => makeCheck(t, name, { $unset: { [name]: true } })
    )
  })

  t.end()
})
