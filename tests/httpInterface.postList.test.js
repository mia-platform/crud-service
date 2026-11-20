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
const { ObjectId } = require('mongodb')
const { STANDARD_FIELDS } = require('../lib/CrudService')

const { STATES, __STATE__ } = require('../lib/consts')
const { newUpdaterId, fixtures, stationFixtures } = require('./utils')
const { setUpTest, prefix, stationsPrefix } = require('./httpInterface.utils')

test('HTTP POST /', async t => {
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
  const STATION_DOC = {
    Cap: 25040,
    CodiceMIR: 'S01788',
    Comune: 'Borgonato',
    Direttrici: [
      'D028',
    ],
    Indirizzo: 'Via Stazione, 24',
    country: 'it',
  }

  const { fastify, collection, resetCollection } = await setUpTest(t)

  t.test('ok', async t => {
    await resetCollection()

    const response = await fastify.inject({
      method: 'POST',
      url: `${prefix}/`,
      payload: DOC,
      headers: {
        userId: newUpdaterId,
      },
    })

    t.test('should return 200', t => {
      t.assert.deepStrictEqual(response.statusCode, 200)
    })
    t.test('should return application/json', t => {
      t.assert.ok(/application\/json/.test(response.headers['content-type']))
    })
    t.test('should return the inserted id', t => {
      const body = JSON.parse(response.payload)
      t.assert.ok(body._id)
    })
    t.test('GET /<id> should return 200', async t => {
      const body = JSON.parse(response.payload)

      const getResponse = await fastify.inject({
        method: 'GET',
        url: `${prefix}/${body._id}?_st=${STATES.DRAFT}`,
      })
      t.assert.deepStrictEqual(getResponse.statusCode, 200)
    })

    t.test('on database', async t => {
      const body = JSON.parse(response.payload)

      const doc = await collection.findOne({ _id: new ObjectId(body._id) })

      t.test('doc', t => {
        const docKeys = Object.keys(DOC)

        docKeys.forEach(k => {
          if (k === 'position') { return }
          t.test(`should have ${k}`, t => {
            t.assert.deepStrictEqual(doc[k], DOC[k])
          })
        })

        t.test('should have position', t => {
          t.assert.deepStrictEqual(doc.position, { type: 'Point', coordinates: [0, 0] })
        })
        t.test('should have creatorId', t => {
          t.assert.deepStrictEqual(doc.creatorId, newUpdaterId)
        })
        t.test('should have updaterId', t => {
          t.assert.deepStrictEqual(doc.updaterId, newUpdaterId)
        })
        t.test('should have createdAt', t => {
          t.assert.ok(Date.now() - doc.createdAt < 5000, '`createdAt` should be set')
        })
        t.test('should have updatedAt', t => {
          t.assert.ok(Date.now() - doc.updatedAt < 5000, '`updatedAt` should be set')
        })
        t.test('should have __STATE__ in DRAFT', t => {
          t.assert.deepStrictEqual(doc[__STATE__], STATES.DRAFT)
        })
      })
    })

    t.test('should return an ObjectId', async t => {
      const body = JSON.parse(response.payload)

      t.assert.doesNotThrow(() => new ObjectId(body._id))
    })
  })

  t.test('violate index uniqueness', async t => {
    await resetCollection()

    await fastify.inject({
      method: 'POST',
      url: `${prefix}/`,
      payload: DOC,
      headers: {
        userId: newUpdaterId,
      },
    })
    const response = await fastify.inject({
      method: 'POST',
      url: `${prefix}/`,
      payload: DOC,
      headers: {
        userId: newUpdaterId,
      },
    })

    t.assert.deepStrictEqual(response.statusCode, 409)
    t.assert.ok(/application\/json/.test(response.headers['content-type']))
    t.assert.strictEqual(await collection.countDocuments(), fixtures.length + 1, 'only one was inserted')
  })

  t.test('violate required constraints (no isbn)', async t => {
    await resetCollection()

    const response = await fastify.inject({
      method: 'POST',
      url: `${prefix}/`,
      payload: {
        name: 'name1',
        price: 23.1,
      },
      headers: {
        userId: newUpdaterId,
      },
    })
    t.assert.deepStrictEqual(response.statusCode, 400)
    t.assert.ok(/application\/json/.test(response.headers['content-type']))
    t.assert.strictEqual(await collection.countDocuments(), fixtures.length, 'the document was not inserted in the database')
  })

  t.test('ok with string id', async t => {
    const {
      fastify: stationInstance,
      collection: stationCollection,
    } = await setUpTest(t, stationFixtures, 'stations')

    const response = await stationInstance.inject({
      method: 'POST',
      url: `${stationsPrefix}/`,
      payload: STATION_DOC,
      headers: {
        userId: newUpdaterId,
      },
    })

    t.test('should return 200', t => {
      t.assert.deepStrictEqual(response.statusCode, 200)
    })
    t.test('should return application/json', t => {
      t.assert.ok(/application\/json/.test(response.headers['content-type']))
    })
    t.test('should return the inserted id', t => {
      const body = JSON.parse(response.payload)
      t.assert.ok(body._id)
    })
    t.test('GET /<id> should return 200', async t => {
      const body = JSON.parse(response.payload)

      const getResponse = await stationInstance.inject({
        method: 'GET',
        url: `${stationsPrefix}/${body._id}?_st=${STATES.DRAFT}`,
      })
      t.assert.deepStrictEqual(getResponse.statusCode, 200)
    })

    t.test('on database', async t => {
      const body = JSON.parse(response.payload)
      const doc = await stationCollection.findOne({ _id: body._id })

      t.test('doc', t => {
        const docKeys = Object.keys(STATION_DOC)

        docKeys.forEach(k => {
          if (k === 'position') { return }
          t.test(`should have ${k}`, t => {
            t.assert.deepStrictEqual(doc[k], STATION_DOC[k])
          })
        })

        t.test('should have creatorId', t => {
          t.assert.deepStrictEqual(doc.creatorId, newUpdaterId)
        })
        t.test('should have updaterId', t => {
          t.assert.deepStrictEqual(doc.updaterId, newUpdaterId)
        })
        t.test('should have createdAt', t => {
          t.assert.ok(Date.now() - doc.createdAt < 5000, '`createdAt` should be set')
        })
        t.test('should have updatedAt', t => {
          t.assert.ok(Date.now() - doc.updatedAt < 5000, '`updatedAt` should be set')
        })
        t.test('should have __STATE__ in DRAFT', t => {
          t.assert.deepStrictEqual(doc[__STATE__], STATES.DRAFT)
        })
      })
    })

    t.test('should return a string', async t => {
      const body = JSON.parse(response.payload)

      t.assert.throws(() => new ObjectId(body._id))
    })
  })

  t.test('with nested object with schema defined should cast correctly the values', async t => {
    await resetCollection()

    const response = await fastify.inject({
      method: 'POST',
      url: `${prefix}/`,
      payload: {
        ...DOC,
        metadata: {
          somethingString: 'something-string',
          somethingNumber: '3000',
        },
        attachments: [{
          name: 'the-attachement',
          detail: { size: '10' },
        }],
      },
      headers: {
        userId: newUpdaterId,
      },
    })

    t.test('should return 200', t => {
      t.assert.deepStrictEqual(response.statusCode, 200)
    })

    t.test('on database', async t => {
      const body = JSON.parse(response.payload)

      const doc = await collection.findOne({ _id: new ObjectId(body._id) })
      t.assert.deepStrictEqual(doc.metadata, {
        somethingString: 'something-string',
        somethingNumber: 3000,
      })
      t.assert.deepStrictEqual(doc.attachments, [{
        name: 'the-attachement',
        detail: { size: 10 },
      }])
    })
  })

  t.test('nested object field can have required properties', async t => {
    await resetCollection()

    const response = await fastify.inject({
      method: 'POST',
      url: `${prefix}/`,
      payload: {
        ...DOC,
        metadata: {
          somethingString: 'the-new-field',
          // somethingNumber is required
          somethingNumber: undefined,
        },
      },
      headers: {
        userId: newUpdaterId,
      },
    })

    t.test('should fail due to validation', t => {
      t.assert.deepStrictEqual(response.statusCode, 400)
      t.assert.deepStrictEqual(JSON.parse(response.payload), {
        statusCode: 400,
        error: 'Bad Request',
        message: "body/metadata must have required property 'somethingNumber'",
        code: 'FST_ERR_VALIDATION',
      })
    })

    t.test('on database it is not created', async t => {
      const docOnDb = await collection.findOne({ 'metadata.somethingString': 'the-new-field' })
      t.assert.strictEqual(docOnDb, null)
    })
  })

  t.test('nested object can have additionalProperties false', async t => {
    await resetCollection()

    const response = await fastify.inject({
      method: 'POST',
      url: `${prefix}/`,
      payload: {
        ...DOC,
        metadata: {
          somethingNumber: 2,
          somethingString: 'the-new-field',
          unexpectedField: 4,
        },
      },
      headers: {
        userId: newUpdaterId,
      },
    })

    t.test('should fail due to validation', t => {
      t.assert.deepStrictEqual(response.statusCode, 400)
      t.assert.deepStrictEqual(JSON.parse(response.payload), {
        statusCode: 400,
        error: 'Bad Request',
        message: 'body/metadata must NOT have additional properties. Property "unexpectedField" is not defined in validation schema',
      })
    })

    t.test('on database it is not created', async t => {
      const docOnDb = await collection.findOne({ 'metadata.somethingString': 'the-new-field' })
      t.assert.strictEqual(docOnDb, null)
    })
  })

  t.test('array of object items can have required properties', async t => {
    await resetCollection()

    const response = await fastify.inject({
      method: 'POST',
      url: `${prefix}/`,
      payload: {
        ...DOC,
        isbn: 'the-new',
        attachments: [{
          // name is required
          other: 'stuff',
        }],
      },
      headers: {
        userId: newUpdaterId,
      },
    })

    t.test('should fail due to validation', t => {
      t.assert.deepStrictEqual(response.statusCode, 400)
      t.assert.deepStrictEqual(JSON.parse(response.payload), {
        statusCode: 400,
        error: 'Bad Request',
        message: "body/attachments/0 must have required property 'name', body/attachments must be object, body/attachments must match a schema in anyOf",
        code: 'FST_ERR_VALIDATION',
      })
    })

    t.test('on database it is not created', async t => {
      const docOnDb = await collection.findOne({ isbn: 'the-new' })
      t.assert.strictEqual(docOnDb, null)
    })
  })

  t.test('array of object items can have additionalProperties false', async t => {
    await resetCollection()

    const response = await fastify.inject({
      method: 'POST',
      url: `${prefix}/`,
      payload: {
        ...DOC,
        isbn: 'the-new',
        attachments: [{
          name: 'the-name',
          unexpectedField: 99,
        }],
      },
      headers: {
        userId: newUpdaterId,
      },
    })

    t.test('should fail due to validation', t => {
      t.assert.deepStrictEqual(response.statusCode, 400)
      t.assert.deepStrictEqual(JSON.parse(response.payload), {
        statusCode: 400,
        error: 'Bad Request',
        message: 'body/attachments/0 must NOT have additional properties, body/attachments must be object, body/attachments must match a schema in anyOf. Property "unexpectedField" is not defined in validation schema',
      })
    })

    t.test('on database it is not created', async t => {
      const docOnDb = await collection.findOne({ isbn: 'the-new' })
      t.assert.strictEqual(docOnDb, null)
    })
  })

  t.test('allow nullable field', async t => {
    const nowDate = new Date()
    const DOC = {
      name: null,
      isbn: 'aaaaa',
      price: null,
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
      __STATE__: 'PUBLIC',
      position: [0, 0], /* [ lon, lat ] */
    }

    t.test('ok', async t => {
      await resetCollection()

      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/`,
        payload: DOC,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.test('should return 200', t => {
        t.assert.deepStrictEqual(response.statusCode, 200)
      })
      t.test('should return application/json', async t => {
        t.assert.ok(/application\/json/.test(response.headers['content-type']))
      })

      t.test('should return the inserted id', async t => {
        const body = JSON.parse(response.payload)
        t.assert.ok(body._id)

        const getResponse = await fastify.inject({
          method: 'GET',
          url: `${prefix}/${body._id}`,
          headers: {
            userId: newUpdaterId,
          },
        })
        t.assert.deepStrictEqual(getResponse.statusCode, 200)
        const result = JSON.parse(getResponse.payload)

        t.test('should have null name', async t => {
          t.assert.strictEqual(result.name, null)
        })

        t.test('should have not null price', async t => {
          t.assert.strictEqual(result.price, 0.0)
        })
      })
    })

    t.test('ok - object without schema with property set to null', async t => {
      await resetCollection()

      const DOC_RAW_OBJ_NULL = {
        name: 'Lord of the Rings',
        isbn: 'abcde-31',
        price: 37.91,
        publishDate: nowDate,
        additionalInfo: null,
        __STATE__: 'PUBLIC',
      }
      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/`,
        payload: DOC_RAW_OBJ_NULL,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.assert.deepStrictEqual(response.statusCode, 200)
      t.assert.ok(/application\/json/.test(response.headers['content-type']))

      const body = JSON.parse(response.payload)
      t.assert.ok(body._id)

      t.test('additionalInfo field is set to null as expected', async t => {
        const response = await fastify.inject({
          method: 'GET',
          url: `${prefix}/${body._id}`,
          headers: {
            userId: newUpdaterId,
          },
        })

        t.assert.deepStrictEqual(response.statusCode, 200)
        const result = JSON.parse(response.payload)
        t.assert.deepStrictEqual(result.additionalInfo, null)
      })
    })

    t.test('ok - object with schema with property set to null', async t => {
      await resetCollection()

      const DOC_RAW_OBJ_NULL = {
        name: 'Lord of the Rings',
        isbn: 'abcde-31',
        price: 37.91,
        publishDate: nowDate,
        signature: null,
        __STATE__: 'PUBLIC',
      }
      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/`,
        payload: DOC_RAW_OBJ_NULL,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.assert.deepStrictEqual(response.statusCode, 200)
      t.assert.ok(/application\/json/.test(response.headers['content-type']))

      const body = JSON.parse(response.payload)
      t.assert.ok(body._id)

      t.test('signature field is set to null as expected', async t => {
        const response = await fastify.inject({
          method: 'GET',
          url: `${prefix}/${body._id}`,
          headers: {
            userId: newUpdaterId,
          },
        })

        t.assert.deepStrictEqual(response.statusCode, 200)
        const result = JSON.parse(response.payload)
        t.assert.deepStrictEqual(result.signature, null)
      })
    })

    t.test('ok - array with property set to null', async t => {
      await resetCollection()

      const DOC_RAW_OBJ_NULL = {
        name: 'Lord of the Rings',
        isbn: 'abcde-31',
        price: 37.91,
        publishDate: nowDate,
        editionsDates: null,
        __STATE__: 'PUBLIC',
      }
      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/`,
        payload: DOC_RAW_OBJ_NULL,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.assert.deepStrictEqual(response.statusCode, 200)
      t.assert.ok(/application\/json/.test(response.headers['content-type']))

      const body = JSON.parse(response.payload)
      t.assert.ok(body._id)

      t.test('editionsDates field is set to null as expected', async t => {
        const response = await fastify.inject({
          method: 'GET',
          url: `${prefix}/${body._id}`,
          headers: {
            userId: newUpdaterId,
          },
        })

        t.assert.deepStrictEqual(response.statusCode, 200)
        const result = JSON.parse(response.payload)
        t.assert.deepStrictEqual(result.editionsDates, null)
      })
    })

    t.test('ok - field of an object within an array can be set to null', async t => {
      await resetCollection()

      const DOC_RAW_OBJ_NULL = {
        name: 'Lord of the Rings',
        isbn: 'abcde-31',
        price: 37.91,
        publishDate: nowDate,
        metadata: {
          somethingNumber: 3,
          somethingArrayObject: [
            {
              arrayItemObjectChildNumber: 1,
              anotherObject: null,
            },
          ],
        },
        __STATE__: 'PUBLIC',
      }
      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/`,
        payload: DOC_RAW_OBJ_NULL,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.assert.deepStrictEqual(response.statusCode, 200)
      t.assert.ok(/application\/json/.test(response.headers['content-type']))

      const body = JSON.parse(response.payload)
      t.assert.ok(body._id)

      t.test('metadata field is set to null as expected', async t => {
        const response = await fastify.inject({
          method: 'GET',
          url: `${prefix}/${body._id}`,
          headers: {
            userId: newUpdaterId,
          },
        })

        t.assert.deepStrictEqual(response.statusCode, 200)
        const result = JSON.parse(response.payload)
        t.assert.deepStrictEqual(result.metadata, DOC_RAW_OBJ_NULL.metadata)
      })
    })

    t.test('ok - date can be set to null', async t => {
      await resetCollection()

      const DOC_RAW_OBJ_NULL = {
        name: 'Lord of the Rings',
        isbn: 'abcde-42',
        publishDate: null,
        __STATE__: 'PUBLIC',
      }
      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/`,
        payload: DOC_RAW_OBJ_NULL,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.assert.deepStrictEqual(response.statusCode, 200)
      t.assert.ok(/application\/json/.test(response.headers['content-type']))

      const body = JSON.parse(response.payload)
      t.assert.ok(body._id)

      t.test('publishDate field is set to null as expected', async t => {
        const response = await fastify.inject({
          method: 'GET',
          url: `${prefix}/${body._id}`,
          headers: {
            userId: newUpdaterId,
          },
        })

        t.assert.deepStrictEqual(response.statusCode, 200)
        const result = JSON.parse(response.payload)
        t.assert.deepStrictEqual(result.publishDate, null)
      })
    })

    t.test('ok - object without schema with property set to null', async t => {
      await resetCollection()

      const DOC_RAW_OBJ_NULL = {
        name: 'Lord of the Rings',
        isbn: 'abcde-31',
        price: 37.91,
        publishDate: nowDate,
        additionalInfo: null,
        __STATE__: 'PUBLIC',
      }
      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/`,
        payload: DOC_RAW_OBJ_NULL,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.assert.deepStrictEqual(response.statusCode, 200)
      t.assert.ok(/application\/json/.test(response.headers['content-type']))

      const body = JSON.parse(response.payload)
      t.assert.ok(body._id)

      t.test('additionalInfo field is set to null as expected', async t => {
        const response = await fastify.inject({
          method: 'GET',
          url: `${prefix}/${body._id}`,
          headers: {
            userId: newUpdaterId,
          },
        })

        t.assert.deepStrictEqual(response.statusCode, 200)
        const result = JSON.parse(response.payload)
        t.assert.deepStrictEqual(result.additionalInfo, null)
      })
    })

    t.test('ok - object with schema with property set to null', async t => {
      await resetCollection()

      const DOC_RAW_OBJ_NULL = {
        name: 'Lord of the Rings',
        isbn: 'abcde-31',
        price: 37.91,
        publishDate: nowDate,
        signature: null,
        __STATE__: 'PUBLIC',
      }
      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/`,
        payload: DOC_RAW_OBJ_NULL,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.assert.deepStrictEqual(response.statusCode, 200)
      t.assert.ok(/application\/json/.test(response.headers['content-type']))

      const body = JSON.parse(response.payload)
      t.assert.ok(body._id)

      t.test('signature field is set to null as expected', async t => {
        const response = await fastify.inject({
          method: 'GET',
          url: `${prefix}/${body._id}`,
          headers: {
            userId: newUpdaterId,
          },
        })

        t.assert.deepStrictEqual(response.statusCode, 200)
        const result = JSON.parse(response.payload)
        t.assert.deepStrictEqual(result.signature, null)
      })
    })

    t.test('ok - array with property set to null', async t => {
      await resetCollection()

      const DOC_RAW_OBJ_NULL = {
        name: 'Lord of the Rings',
        isbn: 'abcde-31',
        price: 37.91,
        publishDate: nowDate,
        editionsDates: null,
        __STATE__: 'PUBLIC',
      }
      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/`,
        payload: DOC_RAW_OBJ_NULL,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.assert.deepStrictEqual(response.statusCode, 200)
      t.assert.ok(/application\/json/.test(response.headers['content-type']))

      const body = JSON.parse(response.payload)
      t.assert.ok(body._id)

      t.test('editionsDates field is set to null as expected', async t => {
        const response = await fastify.inject({
          method: 'GET',
          url: `${prefix}/${body._id}`,
          headers: {
            userId: newUpdaterId,
          },
        })

        t.assert.deepStrictEqual(response.statusCode, 200)
        const result = JSON.parse(response.payload)
        t.assert.deepStrictEqual(result.editionsDates, null)
      })
    })

    t.test('ok - field of an object within an array can be set to null', async t => {
      await resetCollection()

      const DOC_RAW_OBJ_NULL = {
        name: 'Lord of the Rings',
        isbn: 'abcde-31',
        price: 37.91,
        publishDate: nowDate,
        metadata: {
          somethingNumber: 3,
          somethingArrayObject: [
            {
              arrayItemObjectChildNumber: 1,
              anotherObject: null,
            },
          ],
        },
        __STATE__: 'PUBLIC',
      }
      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/`,
        payload: DOC_RAW_OBJ_NULL,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.assert.deepStrictEqual(response.statusCode, 200)
      t.assert.ok(/application\/json/.test(response.headers['content-type']))

      const body = JSON.parse(response.payload)
      t.assert.ok(body._id)

      t.test('metadata field is set to null as expected', async t => {
        const response = await fastify.inject({
          method: 'GET',
          url: `${prefix}/${body._id}`,
          headers: {
            userId: newUpdaterId,
          },
        })

        t.assert.deepStrictEqual(response.statusCode, 200)
        const result = JSON.parse(response.payload)
        t.assert.deepStrictEqual(result.metadata, DOC_RAW_OBJ_NULL.metadata)
      })
    })

    t.test('ok - date can be set to null', async t => {
      await resetCollection()

      const DOC_RAW_OBJ_NULL = {
        name: 'Lord of the Rings',
        isbn: 'abcde-42',
        publishDate: null,
        __STATE__: 'PUBLIC',
      }
      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/`,
        payload: DOC_RAW_OBJ_NULL,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.assert.deepStrictEqual(response.statusCode, 200)
      t.assert.ok(/application\/json/.test(response.headers['content-type']))

      const body = JSON.parse(response.payload)
      t.assert.ok(body._id)

      t.test('publishDate field is set to null as expected', async t => {
        const response = await fastify.inject({
          method: 'GET',
          url: `${prefix}/${body._id}`,
          headers: {
            userId: newUpdaterId,
          },
        })

        t.assert.deepStrictEqual(response.statusCode, 200)
        const result = JSON.parse(response.payload)
        t.assert.deepStrictEqual(result.publishDate, null)
      })
    })

    t.test('ok - array with property set to null', async t => {
      await resetCollection()

      const DOC_RAW_OBJ_NULL = {
        name: 'Lord of the Rings',
        isbn: 'abcde-31',
        price: 37.91,
        publishDate: nowDate,
        editionsDates: null,
        __STATE__: 'PUBLIC',
      }
      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/`,
        payload: DOC_RAW_OBJ_NULL,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.assert.deepStrictEqual(response.statusCode, 200)
      t.assert.ok(/application\/json/.test(response.headers['content-type']))

      const body = JSON.parse(response.payload)
      t.assert.ok(body._id)

      t.test('editionsDates field is set to null as expected', async t => {
        const response = await fastify.inject({
          method: 'GET',
          url: `${prefix}/${body._id}`,
          headers: {
            userId: newUpdaterId,
          },
        })

        t.assert.deepStrictEqual(response.statusCode, 200)
        const result = JSON.parse(response.payload)
        t.assert.strictEqual(result.editionsDates, null)
      })
    })

    t.test('ok - field of an object within an array can be set to null', async t => {
      await resetCollection()

      const DOC_RAW_OBJ_NULL = {
        name: 'Lord of the Rings',
        isbn: 'abcde-31',
        price: 37.91,
        publishDate: nowDate,
        metadata: {
          somethingNumber: 3,
          somethingArrayObject: [
            {
              arrayItemObjectChildNumber: 1,
              anotherObject: null,
            },
          ],
        },
        __STATE__: 'PUBLIC',
      }
      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/`,
        payload: DOC_RAW_OBJ_NULL,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.assert.deepStrictEqual(response.statusCode, 200)
      t.assert.ok(/application\/json/.test(response.headers['content-type']))

      const body = JSON.parse(response.payload)
      t.assert.ok(body._id)

      t.test('editionsDates field is set to null as expected', async t => {
        const response = await fastify.inject({
          method: 'GET',
          url: `${prefix}/${body._id}`,
          headers: {
            userId: newUpdaterId,
          },
        })

        t.assert.deepStrictEqual(response.statusCode, 200)
        const result = JSON.parse(response.payload)
        t.assert.deepStrictEqual(result.metadata, DOC_RAW_OBJ_NULL.metadata)
      })
    })
  })

  t.test('invalid position', async t => {
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
      await resetCollection()

      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/`,
        payload: DOC,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.test('should return 400', async t => {
        t.assert.deepStrictEqual(response.statusCode, 400)
      })
      t.test('should return application/json', t => {
        t.assert.ok(/application\/json/.test(response.headers['content-type']))
      })
      t.test('should not insert the document in the database', async t => {
        const count = await collection.countDocuments()
        t.assert.deepStrictEqual(count, fixtures.length)
      })
    })
  })

  t.test('standard fields', async t => {
    function makeCheck(t, standardField) {
      t.test(`${standardField} cannot be updated`, async t => {
        await resetCollection()

        const response = await fastify.inject({
          method: 'POST',
          url: `${prefix}/`,
          payload: { $set: { [standardField]: 'gg' } },
        })

        t.test('should return 400', t => {
          t.assert.deepStrictEqual(response.statusCode, 400)
        })
        t.test('should return JSON', t => {
          t.assert.ok(/application\/json/.test(response.headers['content-type']))
        })
      })
    }

    STANDARD_FIELDS.forEach(standardField => makeCheck(t, standardField))
    makeCheck(t, __STATE__)
  })

  t.test('PUBLIC as defaultState', async t => {
    const DOC = {
      name: 'foo',
      price: 33.33,
      position: [4.1, 4.3, 2.1],
      additionalInfo: {
        footnotePages: [2, 3, 5, 23, 3],
        notes: {
          mynote: 'good',
        },
      },
    }

    t.test('ok', async t => {
      await resetCollection()

      const prefix = '/cars-endpoint'

      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/`,
        payload: DOC,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.test('should return 200', t => {
        t.assert.deepStrictEqual(response.statusCode, 200)
      })
      t.test('should return application/json', t => {
        t.assert.ok(/application\/json/.test(response.headers['content-type']))
      })
      t.test('should return the inserted id', t => {
        const body = JSON.parse(response.payload)
        t.assert.ok(body._id)
      })

      t.test('GET /<id> should return 200', async t => {
        const body = JSON.parse(response.payload)

        const getResponse = await fastify.inject({
          method: 'GET',
          url: `${prefix}/${body._id}`,
        })

        t.test('should return 200', t => {
          t.assert.deepStrictEqual(getResponse.statusCode, 200)
        })

        t.test('should have __STATE__ in PUBLIC', t => {
          const body = JSON.parse(getResponse.payload)
          t.assert.deepStrictEqual(body[__STATE__], STATES.PUBLIC)
        })
      })
    })
  })

  t.test('PUBLIC as defaultState, insert in DRAFT', async t => {
    const DOC = {
      name: 'foo',
      price: 33.33,
      position: [4.1, 4.3, 2.1],
      additionalInfo: {
        footnotePages: [2, 3, 5, 23, 3],
        notes: {
          mynote: 'good',
        },
      },
      __STATE__: STATES.DRAFT,
    }

    t.test('ok', async t => {
      await resetCollection()

      const prefix = '/cars-endpoint'

      const response = await fastify.inject({
        method: 'POST',
        url: `${prefix}/`,
        payload: DOC,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.test('should return 200', t => {
        t.assert.deepStrictEqual(response.statusCode, 200)
      })
      t.test('should return application/json', t => {
        t.assert.ok(/application\/json/.test(response.headers['content-type']))
      })
      t.test('should return the inserted id', t => {
        const body = JSON.parse(response.payload)
        t.assert.ok(body._id)
      })

      t.test('GET /<id> should return 200 (specifying DRAFT state)', async t => {
        const body = JSON.parse(response.payload)

        const getResponse = await fastify.inject({
          method: 'GET',
          url: `${prefix}/${body._id}?_st=${STATES.DRAFT}`,
        })

        t.test('should return 200', t => {
          t.assert.deepStrictEqual(getResponse.statusCode, 200)
        })

        t.test('should have __STATE__ in DRAFT', t => {
          const body = JSON.parse(getResponse.payload)
          t.assert.deepStrictEqual(body[__STATE__], STATES.DRAFT)
        })
      })
    })
  })
})
