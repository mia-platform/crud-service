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

const { name, version } = require('../package.json')
const { setUpTest, setUpEmptyCollectionsTest } = require('./httpInterface.utils')

tap.test('status ok', async mainTest => {
  const { fastify } = await setUpTest(mainTest)

  mainTest.test('/-/ready', async test => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/-/ready',
    })

    test.strictSame(response.statusCode, 200)
    test.strictSame(JSON.parse(response.payload), {
      name,
      version,
      status: 'OK',
    })
    test.end()
  })

  mainTest.test('/-/check-up', async test => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/-/check-up',
    })

    test.strictSame(response.statusCode, 200)
    test.strictSame(JSON.parse(response.payload), {
      name,
      version,
      status: 'OK',
    })
    test.end()
  })

  mainTest.end()
})

tap.test('status ko', async mainTest => {
  const { fastify } = await setUpTest(mainTest)
  await fastify.mongo.client.close()
  mainTest.test('/-/ready', async test => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/-/ready',
    })

    test.strictSame(response.statusCode, 503)
    test.strictSame(JSON.parse(response.payload), {
      name,
      version,
      status: 'KO',
    })
    test.end()
  })

  mainTest.test('/-/check-up', async test => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/-/check-up',
    })

    test.strictSame(response.statusCode, 503)
    test.strictSame(JSON.parse(response.payload), {
      name,
      version,
      status: 'KO',
      message: 'MongoDB status is unhealthy',
    })
    test.end()
  })
  mainTest.end()
})

tap.test('without collection', async mainTest => {
  const { fastify } = await setUpEmptyCollectionsTest(mainTest)

  mainTest.test('/-/ready', async test => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/-/ready',
    })

    test.strictSame(response.statusCode, 200)
    test.strictSame(JSON.parse(response.payload), {
      name,
      version,
      status: 'OK',
    })
    test.end()
  })

  mainTest.test('/-/check-up', async test => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/-/check-up',
    })

    test.strictSame(response.statusCode, 200)
    test.strictSame(JSON.parse(response.payload), {
      name,
      version,
      status: 'OK',
    })
    test.end()
  })

  mainTest.end()
})
