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

const { setUpTest, prefix } = require('./httpInterface.utils')

const DOC = {
  name: null,
  isbn: 'aaaaa',
}

tap.test('HTTP GET /-/metrics', async t => {
  const { fastify } = await setUpTest(t, undefined, undefined, true)

  let response
  response = await fastify.inject({
    method: 'GET',
    url: `${prefix}/count`,
  })
  t.strictSame(response.statusCode, 200)

  response = await fastify.inject({
    method: 'GET',
    url: `${prefix}/`,
  })
  t.strictSame(response.statusCode, 200)

  response = await fastify.inject({
    method: 'POST',
    url: `${prefix}/`,
    payload: DOC,
  })
  t.strictSame(response.statusCode, 200)

  const metricsResponse = await fastify.inject({
    method: 'GET',
    url: '/-/metrics',
  })
  t.strictSame(metricsResponse.statusCode, 200)

  t.ok(/mia_platform_crud_service_collection_invocation{collection_name="books-endpoint",type="fetch"} 2/.test(metricsResponse.payload))
  t.ok(/mia_platform_crud_service_collection_invocation{collection_name="books-endpoint",type="insert_or_update"} 1/.test(metricsResponse.payload))

  t.end()
})
