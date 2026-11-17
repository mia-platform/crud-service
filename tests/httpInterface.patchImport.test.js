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

const { test } = require('node:test')
const path = require('path')
const { createReadStream } = require('fs')

const { bookToUpdate, expectedBooks } = require('./filesFixtures/expectedResults')
const { setUpTest, prefix } = require('./httpInterface.utils')
const { newUpdaterId } = require('./utils')
const FormData = require('form-data')
const { omit: lomit } = require('lodash')
const { CREATORID, UPDATERID, CREATEDAT, UPDATEDAT } = require('../lib/consts')
const { ObjectId } = require('mongodb')

test('HTTP PATCH /import', async t => {
  const jsonFileReader = () => createReadStream(path.join(__dirname, 'filesFixtures/books.json'))
  const ndjsonFileReader = () => createReadStream(path.join(__dirname, 'filesFixtures/books.ndjson'))
  const CSVFileReader = () => createReadStream(path.join(__dirname, 'filesFixtures/books.csv'))


  const emptyCollection = []
  const { fastify, collection, resetCollection } = await setUpTest(t, emptyCollection)

  t.test('should import', async t => {
    const tests = [
      {
        name: 'valid json file',
        createForm: () => {
          const form = new FormData()
          form.append('file', jsonFileReader(), { contentType: 'application/json' })
          return form
        },
      },
      {
        name: 'valid ndjson file',
        createForm: () => {
          const form = new FormData()
          form.append('file', ndjsonFileReader(), { contentType: 'application/x-ndjson' })
          return form
        },
      },
      {
        name: 'valid csv file',
        createForm: () => {
          const form = new FormData()
          form.append('file', CSVFileReader(), { contentType: 'text/csv' })
          return form
        },
      },
      {
        name: 'valid csv file with options',
        createForm: () => {
          const form = new FormData()
          form.append('file', CSVFileReader(), { contentType: 'text/csv' })
          form.append('encoding', 'utf8')
          form.append('delimiter', ',')
          form.append('escape', '\\')
          return form
        },
      },
      {
        name: 'valid csv file with only one option',
        createForm: () => {
          const form = new FormData()
          form.append('file', CSVFileReader(), { contentType: 'text/csv' })
          form.append('delimiter', ',')
          return form
        },
      },
    ]

    for (const test of tests) {
      const {
        name,
        createForm,
      } = test
      t.test(name, async t => {
        await resetCollection()
        const form = createForm()
        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/import`,
          payload: form,
          headers: {
            ...form.getHeaders(),
            userId: newUpdaterId,
          },
        })

        t.test('and return 200', t => {
          t.assert.deepStrictEqual(response.statusCode, 200, response.payload)
        })

        t.test('and return application/json', t => {
          t.assert.ok(/application\/json/.test(response.headers['content-type']))
        })

        t.test('and return the right message', t => {
          const body = JSON.parse(response.payload)
          t.assert.deepStrictEqual(body, { message: 'File uploaded successfully' })
        })
      })
    }
  })

  t.test('should return error on invalid options', async t => {
    const tests = [
      {
        name: 'with not existing propriety',
        createForm: () => {
          const form = new FormData()
          form.append('file', CSVFileReader(), { contentType: 'text/csv' })
          form.append('notExisitingPropriety', 'randomValue')
          return form
        },
      },
      {
        name: 'on invalid encoding',
        createForm: () => {
          const form = new FormData()
          form.append('file', CSVFileReader(), { contentType: 'text/csv' })
          form.append('encoding', 'invalid')
          return form
        },
      },
    ]

    for (const test of tests) {
      const {
        name,
        createForm,
      } = test
      t.test(name, async t => {
        const form = createForm()
        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/import`,
          payload: form,
          headers: {
            ...form.getHeaders(),
            userId: newUpdaterId,
          },
        })

        t.test('and return 400', t => {
          t.assert.deepStrictEqual(response.statusCode, 400, response.payload)
        })

        t.test('and return application/json', t => {
          t.assert.ok(/application\/json/.test(response.headers['content-type']))
        })

        t.test('and return the right message', t => {
          const body = JSON.parse(response.payload)
          t.assert.deepStrictEqual(body, {
            'statusCode': 400,
            'error': 'Bad Request',
            'message': 'Invalid options',
          })
        })
      })
    }
  })

  t.test('should update already existing documents', async t => {
    await collection.deleteMany({})
    await collection.insertMany(expectedBooks)

    const form = new FormData()
    form.append('books', createReadStream(path.join(__dirname, 'filesFixtures/bookToUpdate.json')), { contentType: 'application/json' })
    const response = await fastify.inject({
      method: 'PATCH',
      url: `${prefix}/import`,
      payload: form,
      headers: form.getHeaders(),
    })

    t.assert.deepStrictEqual(response.statusCode, 200, response.payload)
    const body = JSON.parse(response.payload)
    t.assert.deepStrictEqual(body, { message: 'File uploaded successfully' })

    const document = await collection.findOne({ _id: bookToUpdate._id })
    t.assert.deepStrictEqual(lomit(document, [CREATORID, UPDATERID, CREATEDAT, UPDATEDAT]), bookToUpdate)
  })

  t.test('should insert non existing documents', async t => {
    await collection.deleteMany({})

    const form = new FormData()
    form.append('books', createReadStream(path.join(__dirname, 'filesFixtures/books.json')), { contentType: 'application/json' })
    const response = await fastify.inject({
      method: 'PATCH',
      url: `${prefix}/import`,
      payload: form,
      headers: form.getHeaders(),
    })

    t.assert.deepStrictEqual(response.statusCode, 200, response.payload)
    const body = JSON.parse(response.payload)
    t.assert.deepStrictEqual(body, { message: 'File uploaded successfully' })

    const documentsCount = await collection.countDocuments()
    t.assert.deepStrictEqual(documentsCount, 3)
  })

  t.test('should update the state of a deleted document', async t => {
    await collection.deleteMany({})
    await collection.insertOne({
      _id: new ObjectId('64940bd37955234169667b47'),
      __STATE__: 'TRASH',
    })

    const form = new FormData()
    form.append('books', createReadStream(path.join(__dirname, 'filesFixtures/bookToUpdateWithoutState.json')), { contentType: 'application/json' })
    const response = await fastify.inject({
      method: 'PATCH',
      url: `${prefix}/import`,
      payload: form,
      headers: form.getHeaders(),
    })

    t.assert.deepStrictEqual(response.statusCode, 200, response.payload)
    const body = JSON.parse(response.payload)
    t.assert.deepStrictEqual(body, { message: 'File uploaded successfully' })

    const document = await collection.findOne({
      _id: new ObjectId('64940bd37955234169667b47'),

      // default state
      __STATE__: 'DRAFT',
    })
    t.assert.ok(document)
  })

  t.test('should insert if no _id is provided', async t => {
    await collection.deleteMany({})

    const form = new FormData()
    form.append('books', createReadStream(path.join(__dirname, 'filesFixtures/booksNoId.json')), { contentType: 'application/json' })
    const response = await fastify.inject({
      method: 'PATCH',
      url: `${prefix}/import`,
      payload: form,
      headers: form.getHeaders(),
    })

    t.assert.deepStrictEqual(response.statusCode, 200, response.payload)
    const body = JSON.parse(response.payload)
    t.assert.deepStrictEqual(body, { message: 'File uploaded successfully' })

    const documentsCount = await collection.countDocuments()
    t.assert.deepStrictEqual(documentsCount, 2)

    // Make sure we're inserting documents with valid defaults
    const firstDocument = await collection.findOne({})
    t.assert.ok(firstDocument._id instanceof ObjectId)
    t.assert.ok(firstDocument.createdAt instanceof Date)
    t.assert.ok(firstDocument.updatedAt instanceof Date)
    t.assert.deepStrictEqual(firstDocument.creatorId, 'public')
    t.assert.deepStrictEqual(firstDocument.updaterId, 'public')
  })

  t.test('should not duplicate when the same records witout _id are imported', async t => {
    await collection.deleteMany({})

    // Import 3 times
    for (let index = 0; index < 3; index++) {
      const form = new FormData()
      form.append('books', createReadStream(path.join(__dirname, 'filesFixtures/booksNoId.json')), { contentType: 'application/json' })
      const response = await fastify.inject({
        method: 'PATCH',
        url: `${prefix}/import`,
        payload: form,
        headers: form.getHeaders(),
      })

      t.assert.deepStrictEqual(response.statusCode, 200, response.payload)
      const body = JSON.parse(response.payload)
      t.assert.deepStrictEqual(body, { message: 'File uploaded successfully' })
    }

    const documentsCount = await collection.countDocuments()
    t.assert.deepStrictEqual(documentsCount, 2)
  })

  t.test('should return the correct error if a row is invalid', async t => {
    const form = new FormData()
    form.append('books', createReadStream(path.join(__dirname, 'filesFixtures/booksError.json')), { contentType: 'application/json' })
    const response = await fastify.inject({
      method: 'PATCH',
      url: `${prefix}/import`,
      payload: form,
      headers: form.getHeaders(),
    })

    t.assert.deepStrictEqual(response.statusCode, 400, response.payload)
    t.assert.ok(/application\/json/.test(response.headers['content-type']))
    const body = JSON.parse(response.payload)
    t.assert.deepStrictEqual(body.statusCode, 400)
    t.assert.deepStrictEqual(body.error, 'Bad Request')
    t.assert.ok(body.message.includes('(index: 0, /publishDate) must match pattern "^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$"'))
  })
})
