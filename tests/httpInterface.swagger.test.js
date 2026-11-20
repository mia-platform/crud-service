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

const { setUpTest } = require('./httpInterface.utils')
const { SCHEMA_CUSTOM_KEYWORDS } = require('../lib/consts')
const { fixtures, BOOKS_COLLECTION_NAME } = require('./utils')

test('HTTP swagger', t => {
  t.test('ok - Swagger 2.0', async t => {
    const { fastify } = await setUpTest(t)

    const response = await fastify.inject({
      method: 'GET',
      url: '/documentation/json',
    })

    t.test('should return 200', t => {
      t.assert.deepStrictEqual(response.statusCode, 200)
    })
    t.test('should return application/json', t => {
      t.assert.ok(/application\/json/.test(response.headers['content-type']))
    })
    t.test('should return a valid Swagger 2.0', async t => {
      const swagger = JSON.parse(response.payload)
      t.assert.match(swagger.swagger, /2\.0/)
    })
    t.test('should not contain unique id of schema', t => {
      const swagger = response.payload
      const regex = new RegExp(`"${SCHEMA_CUSTOM_KEYWORDS.UNIQUE_OPERATION_ID}"`, 'g')
      t.assert.ok(!(swagger.match(regex)))
    })
  })

  t.test('ok - OpenAPI 3.0', async t => {
    const { fastify } = await setUpTest(t, fixtures, BOOKS_COLLECTION_NAME, false, false, 'openapi')

    const response = await fastify.inject({
      method: 'GET',
      url: '/documentation/json',
    })

    t.test('should return 200', t => {
      t.assert.deepStrictEqual(response.statusCode, 200)
    })
    t.test('should return application/json', t => {
      t.assert.ok(/application\/json/.test(response.headers['content-type']))
    })
    t.test('should return a valid OpenAPI 3.0', async t => {
      const swagger = JSON.parse(response.payload)
      t.assert.match(swagger.openapi, /3\.0/)
    })
    t.test('should not contain unique id of schema', t => {
      const swagger = response.payload
      const regex = new RegExp(`"${SCHEMA_CUSTOM_KEYWORDS.UNIQUE_OPERATION_ID}"`, 'g')
      t.assert.ok(!(swagger.match(regex)))
    })
  })
})
