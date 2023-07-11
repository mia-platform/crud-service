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
const FormData = require('form-data')
const { omit } = require('ramda')
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
          form.append('books', jsonFileReader(), { contentType: 'application/json' })
          return form
        },
      },
      {
        name: 'valid ndjson file',
        createForm: () => {
          const form = new FormData()
          form.append('books', ndjsonFileReader(), { contentType: 'application/x-ndjson' })
          return form
        },
      },
      {
        name: 'valid csv file',
        createForm: () => {
          const form = new FormData()
          form.append('books', CSVFileReader(), { contentType: 'text/csv' })
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
          headers: form.getHeaders(),
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
    t.strictSame(omit([CREATORID, UPDATERID, CREATEDAT, UPDATEDAT], document), bookToUpdate)
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
})
