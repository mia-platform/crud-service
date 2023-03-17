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
const SwaggerParser = require('swagger-parser')

const { setUpTest } = require('./httpInterface.utils')
const { SCHEMA_CUSTOM_KEYWORDS } = require('../lib/consts')

tap.test('HTTP swagger', t => {
  t.test('ok', async t => {
    const { fastify } = await setUpTest(t)

    const response = await fastify.inject({
      method: 'GET',
      url: '/documentation/json',
    })

    t.test('should return 200', t => {
      t.strictSame(response.statusCode, 200)
      t.end()
    })
    t.test('should return application/json', t => {
      t.ok(/application\/json/.test(response.headers['content-type']))
      t.end()
    })
    t.skip('should return a valid swagger', async t => {
      const swagger = await SwaggerParser.validate(JSON.parse(response.payload))
      t.ok(swagger)
      t.end()
    })

    t.test('should not contain unique id of schema', t => {
      const swagger = response.payload
      const regex = new RegExp(`"${SCHEMA_CUSTOM_KEYWORDS.UNIQUE_OPERATION_ID}"`, 'g')
      t.notOk(swagger.match(regex))
      t.end()
    })
  })

  t.end()
})
