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
const path = require('path')
const { createReadStream } = require('fs')

const { expectedBooks, bookToUpdate } = require('./filesFixtures/expectedResults')
const { setUpTest, prefix } = require('./httpInterface.utils')
const { newUpdaterId } = require('./utils')
const FormData = require('form-data')
const lomit = require('lodash.omit')
const { CREATORID, UPDATERID, CREATEDAT, UPDATEDAT } = require('../lib/consts')

tap.test('HTTP PATCH /import', async t => {
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
          form.append('delimiter', ';')
          form.append('escape', '\\')
          return form
        },
      },
      {
        name: 'valid csv file with only one option',
        createForm: () => {
          const form = new FormData()
          form.append('file', CSVFileReader(), { contentType: 'text/csv' })
          form.append('delimiter', ';')
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
          t.strictSame(response.statusCode, 200, response.payload)
          t.end()
        })

        t.test('and return application/json', t => {
          t.ok(/application\/json/.test(response.headers['content-type']))
          t.end()
        })

        t.test('and return the right message', t => {
          const body = JSON.parse(response.payload)
          t.strictSame(body, { message: 'File uploaded successfully' })
          t.end()
        })

        t.test('and not create any document', async t => {
          const documents = await collection.find().toArray()
          t.same(documents, [])
          t.end()
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
          t.strictSame(response.statusCode, 400, response.payload)
          t.end()
        })

        t.test('and return application/json', t => {
          t.ok(/application\/json/.test(response.headers['content-type']))
          t.end()
        })

        t.test('and return the right message', t => {
          const body = JSON.parse(response.payload)
          t.strictSame(body, {
            'statusCode': 400,
            'error': 'Bad Request',
            'message': 'Invalid options',
          })
          t.end()
        })
      })
    }
  })

  t.test('should update already existing documents', async t => {
    await collection.insertMany(expectedBooks)

    const form = new FormData()
    form.append('books', createReadStream(path.join(__dirname, 'filesFixtures/bookToUpdate.json')), { contentType: 'application/json' })
    const response = await fastify.inject({
      method: 'PATCH',
      url: `${prefix}/import`,
      payload: form,
      headers: form.getHeaders(),
    })

    t.strictSame(response.statusCode, 200, response.payload)
    const body = JSON.parse(response.payload)
    t.strictSame(body, { message: 'File uploaded successfully' })

    const document = await collection.findOne({ _id: bookToUpdate._id })
    t.strictSame(lomit(document, [CREATORID, UPDATERID, CREATEDAT, UPDATEDAT]), bookToUpdate)
    t.end()
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

    t.strictSame(response.statusCode, 400, response.payload)
    t.ok(/application\/json/.test(response.headers['content-type']))
    const body = JSON.parse(response.payload)
    t.strictSame(body.statusCode, 400)
    t.strictSame(body.error, 'Bad Request')
    t.match(body.message, '(index: 0, /publishDate) must match pattern "^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$"')
    t.end()
  })

  t.test('should return an error if no _id is provided', async t => {
    const form = new FormData()
    form.append('books', createReadStream(path.join(__dirname, 'filesFixtures/booksNoId.json')), { contentType: 'application/json' })
    const response = await fastify.inject({
      method: 'PATCH',
      url: `${prefix}/import`,
      payload: form,
      headers: form.getHeaders(),
    })

    t.strictSame(response.statusCode, 400, response.payload)
    t.ok(/application\/json/.test(response.headers['content-type']))
    const body = JSON.parse(response.payload)
    t.strictSame(body.statusCode, 400)
    t.strictSame(body.error, 'Bad Request')
    t.match(body.message, '(index: 0) must have required property \'_id\'')
    t.end()
  })
})
