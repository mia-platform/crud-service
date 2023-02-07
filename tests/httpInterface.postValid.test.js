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
const { STANDARD_FIELDS } = require('../lib/CrudService')

const { __STATE__ } = require('../lib/consts')
const { newUpdaterId, fixtures } = require('./utils')
const { setUpTest, prefix } = require('./httpInterface.utils')

tap.test('HTTP POST /validate', t => {
  t.plan(1)

  const nowDate = new Date()
  const DOC = {
    name: 'foo',
    isbn: 'aaaaa',
    price: 33.33,
    publishDate: nowDate,
    additionalInfo: {
      stuff: [2, 3, 4, 5, 'hei'],
      morestuff: {
        hi: 'ciao',
      },
    },
    attachments: [
      {
        name: 'me',
      },
      {
        name: 'another',
        other: 'stuff',
      },
    ],
    position: [0, 0], /* [ lon, lat ] */
  }

  t.test('ok', async t => {
    t.plan(2)

    const { fastify, collection } = await setUpTest(t)

    const response = await fastify.inject({
      method: 'POST',
      url: `${prefix}/validate`,
      payload: DOC,
      headers: {
        userId: newUpdaterId,
      },
    })

    t.test('should return 200', t => {
      t.plan(1)
      t.strictSame(response.statusCode, 200)
    })
    t.test('should not insert the document in the database', async t => {
      t.plan(1)
      const count = await collection.countDocuments()
      t.strictSame(count, fixtures.length)
    })
  })
})

tap.test('HTTP POST /validate additionalProperty', t => {
  t.plan(1)

  const DOC = {
    name: 'foo',
    isbn: 'aaaaa',
    anAdditionalProperty: 'notInTheModelDefinition',
  }

  t.test('not ok', async t => {
    t.plan(3)

    const { fastify, collection } = await setUpTest(t)

    const response = await fastify.inject({
      method: 'POST',
      url: `${prefix}/validate`,
      payload: DOC,
      headers: {
        userId: newUpdaterId,
      },
    })

    t.test('should return 400', t => {
      t.plan(1)
      t.strictSame(response.statusCode, 400)
    })
    t.test('should return application/json', t => {
      t.plan(1)
      t.ok(/application\/json/.test(response.headers['content-type']))
    })
    t.test('should not insert the document in the database', async t => {
      t.plan(1)
      const count = await collection.countDocuments()
      t.strictSame(count, fixtures.length)
    })
  })
})

tap.test('violate required constraints (no isbn)', async t => {
  t.plan(3)
  const { fastify, collection } = await setUpTest(t)

  const response = await fastify.inject({
    method: 'POST',
    url: `${prefix}/validate`,
    payload: {
      name: 'name1',
      price: 23.1,
    },
    headers: {
      userId: newUpdaterId,
    },
  })
  t.strictSame(response.statusCode, 400)
  t.ok(/application\/json/.test(response.headers['content-type']))
  t.equal(await collection.countDocuments(), fixtures.length, 'the document was not inserted in the database')
})

tap.test('HTTP POST /validate invalid position', t => {
  t.plan(1)

  const nowDate = new Date()
  const DOC = {
    name: 'foo',
    price: 33.33,
    publishDate: nowDate,
    additionalInfo: {
      stuff: [2, 3, 4, 5, 'hei'],
      morestuff: {
        hi: 'ciao',
      },
    },
    position: [0], /* [ lon, lat ] */
  }

  t.test('not ok', async t => {
    t.plan(3)

    const { fastify, collection } = await setUpTest(t)

    const response = await fastify.inject({
      method: 'POST',
      url: `${prefix}/validate`,
      payload: DOC,
      headers: {
        userId: newUpdaterId,
      },
    })

    t.test('should return 400', async t => {
      t.plan(1)
      t.strictSame(response.statusCode, 400)
    })
    t.test('should return application/json', t => {
      t.plan(1)
      t.ok(/application\/json/.test(response.headers['content-type']))
    })
    t.test('should not insert the document in the database', async t => {
      t.plan(1)
      const count = await collection.countDocuments()
      t.strictSame(count, fixtures.length)
    })
  })
})

tap.test('HTTP POST / - standard fields', t => {
  t.plan(STANDARD_FIELDS.length + 1)

  function makeCheck(t, standardField) {
    t.test(`${standardField} cannot be updated`, async t => {
      t.plan(2)
      const { fastify } = await setUpTest(t)

      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/validate`,
        payload: { [standardField]: 'gg' },
      })

      t.test('should return 400', t => {
        t.plan(1)
        t.strictSame(response.statusCode, 400)
      })
      t.test('should return JSON', t => {
        t.plan(1)
        t.ok(/application\/json/.test(response.headers['content-type']))
      })
    })
  }

  STANDARD_FIELDS.forEach(standardField => makeCheck(t, standardField))
  makeCheck(t, __STATE__)
})
