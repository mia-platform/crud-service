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
const { getMongoDatabaseName, getMongoURL } = require('./utils')
const path = require('path')
const lc39 = require('@mia-platform/lc39')

tap.test('getSchemas', async t => {
  t.test('return json', async t => {
    const fastify = await startFastify(t)
    const response = await fastify.inject({
      method: 'GET',
      url: '/-/schemas',
    })

    t.strictSame(response.statusCode, 200)
    t.matchSnapshot(response.payload)
  })

  t.test('return ndjson', async t => {
    const fastify = await startFastify(t)
    const response = await fastify.inject({
      method: 'GET',
      url: '/-/schemas',
      headers: {
        accept: 'application/x-ndjson',
      },
    })

    t.strictSame(response.statusCode, 200)
    t.matchSnapshot(response.payload)
  })

  t.test('return ndjson', async t => {
    const fastify = await startFastify(t, {
      HELPERS_PREFIX: '/_/',
    })

    const wrongUrlResponse = await fastify.inject({
      method: 'GET',
      url: '/-/schemas',
    })
    t.strictSame(wrongUrlResponse.statusCode, 404)

    const rightUrlResponse = await fastify.inject({
      method: 'GET',
      url: '/_/schemas',
    })
    t.strictSame(rightUrlResponse.statusCode, 200)
  })
})

async function startFastify(t, envs = {}) {
  const databaseName = getMongoDatabaseName()
  const mongoURL = getMongoURL(databaseName)

  const fastify = await lc39('./index.js', {
    envVariables: {
      MONGODB_URL: mongoURL,
      COLLECTION_DEFINITION_FOLDER: path.join(__dirname, 'collectionDefinitions'),
      USER_ID_HEADER_KEY: 'userid',
      ...envs,
    },
    logLevel: 'silent',
  })

  t.teardown(async() => {
    await fastify.close()
  })

  return fastify
}
