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
const { ObjectId } = require('mongodb')
const R = require('ramda')
const { STANDARD_FIELDS } = require('../lib/CrudService')

const {
  STATES,
  __STATE__,
  ARRAY_REPLACE_ELEMENT_OPERATOR,
  UPDATERID,
  UPDATEDAT,
  CREATORID,
  CREATEDAT,
} = require('../lib/consts')
const { fixtures, stationFixtures, newUpdaterId, oldUpdaterId, checkDocumentsInDatabase } = require('./utils')
const { setUpTest, prefix, stationsPrefix, NOT_FOUND_BODY, getHeaders } = require('./httpInterface.utils')
const collectionDefinition = require('./collectionDefinitions/books')

const [DOC] = fixtures
const HTTP_DOC = JSON.parse(JSON.stringify(DOC))
HTTP_DOC.position = HTTP_DOC.position.coordinates

const [STATION_DOC] = stationFixtures
const STATION_HTTP_DOC = JSON.parse(JSON.stringify(STATION_DOC))
const STATION_ID = STATION_DOC._id.toString()
const MATCHING_MIR_CODE = STATION_DOC.CodiceMIR
const MATCHING_STATION_QUERY = { CodiceMIR: MATCHING_MIR_CODE }
const NEW_COMUNE = 'Milano'
const STATION_UPDATE_COMMAND = { $set: { Comune: NEW_COMUNE } }
const UPDATED_STATION_HTTP_DOC = { ...STATION_HTTP_DOC,
  Comune: NEW_COMUNE,
  updaterId: newUpdaterId }

const MATCHING_TAGIDS_QUERY = { tagIds: 1 }
const RENAMED_ATTACHMENTS = [{ name: 'renamed', neastedArr: [1, 2, 3], detail: { size: 9 } }, { name: 'another-note', other: 'stuff' }]
const ATTACHMENT_REPLACE_ELEMENT = `attachments.$.${ARRAY_REPLACE_ELEMENT_OPERATOR}`

const UPDATE_REPLACE_ARRAY_ELEMENT_COMMAND = {
  $set: {
    [ATTACHMENT_REPLACE_ELEMENT]: RENAMED_ATTACHMENTS[0],
  },
}

tap.test('HTTP PATCH /<id> - nested object', async t => {
  const [DOC_TEST] = fixtures

  const VALUE_AS_NUMBER = 5555
  const VALUE_AS_STRING = `${VALUE_AS_NUMBER}`

  t.test('$set', async t => {
    const { fastify, collection, resetCollection } = await setUpTest(t)

    t.test('with dot notation in $set', async t => {
      t.test('ok', async t => {
        await resetCollection()

        const UPDATE_COMMAND = {
          $set: {
            'metadata.somethingNumber': VALUE_AS_NUMBER,
          },
        }
        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/${DOC_TEST._id.toHexString()}`,
          payload: UPDATE_COMMAND,
          headers: {
            userId: newUpdaterId,
          },
        })

        t.strictSame(response.statusCode, 200)
        t.equal(JSON.parse(response.payload).metadata.somethingNumber, VALUE_AS_NUMBER)

        const docOnDb = await collection.findOne({ _id: DOC_TEST._id })
        t.strictSame(docOnDb.metadata.somethingNumber, VALUE_AS_NUMBER)
        t.end()
      })

      t.test('number as string is casted', async t => {
        await resetCollection()

        const UPDATE_COMMAND = {
          $set: {
            'metadata.somethingNumber': VALUE_AS_STRING,
            'metadata.somethingArrayObject.0.arrayItemObjectChildNumber': VALUE_AS_STRING,
            'metadata.somethingArrayOfNumbers.0': VALUE_AS_STRING,
          },
        }
        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/${DOC_TEST._id.toHexString()}`,
          payload: UPDATE_COMMAND,
          headers: {
            userId: newUpdaterId,
          },
        })
        t.strictSame(response.statusCode, 200)

        const EXPECTED_CASTED_OBJECT = {
          somethingNumber: VALUE_AS_NUMBER,
          somethingString: 'the-saved-string',
          somethingArrayObject: [{
            arrayItemObjectChildNumber: VALUE_AS_NUMBER,
          }],
          somethingArrayOfNumbers: [VALUE_AS_NUMBER],
        }

        t.strictSame(JSON.parse(response.payload).metadata, EXPECTED_CASTED_OBJECT)

        const docOnDb = await collection.findOne({ _id: DOC_TEST._id })
        t.strictSame(docOnDb.metadata, EXPECTED_CASTED_OBJECT)
        t.end()
      })

      t.test('cast with middle path', async t => {
        await resetCollection()

        const UPDATE_COMMAND = {
          $set: {
            'metadata.somethingArrayObject.0': { arrayItemObjectChildNumber: VALUE_AS_STRING },
            'metadata.somethingArrayOfNumbers': [VALUE_AS_STRING],
            'metadata.somethingObject': { childNumber: VALUE_AS_STRING },
          },
        }

        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/${DOC_TEST._id.toHexString()}`,
          payload: UPDATE_COMMAND,
          headers: {
            userId: newUpdaterId,
          },
        })
        t.strictSame(response.statusCode, 200)
        const metadataFromPayload = JSON.parse(response.payload).metadata

        const EXPECTED_SOMETHING_ARRAY_OBJECT = [{ arrayItemObjectChildNumber: VALUE_AS_NUMBER }]
        const EXPECTED_SOMETHING_ARRAT_OF_NUMBERS = [VALUE_AS_NUMBER]
        const EXPECTED_SOMETHING_OBJECT = { childNumber: VALUE_AS_NUMBER }

        t.strictSame(metadataFromPayload.somethingArrayObject, EXPECTED_SOMETHING_ARRAY_OBJECT)
        t.strictSame(metadataFromPayload.somethingArrayOfNumbers, EXPECTED_SOMETHING_ARRAT_OF_NUMBERS)
        t.strictSame(metadataFromPayload.somethingObject, EXPECTED_SOMETHING_OBJECT)

        const docOnDb = await collection.findOne({ _id: DOC_TEST._id })
        const metadataOnDb = docOnDb.metadata

        t.strictSame(metadataOnDb.somethingArrayObject, EXPECTED_SOMETHING_ARRAY_OBJECT)
        t.strictSame(metadataOnDb.somethingArrayOfNumbers, EXPECTED_SOMETHING_ARRAT_OF_NUMBERS)
        t.strictSame(metadataOnDb.somethingObject, EXPECTED_SOMETHING_OBJECT)

        t.end()
      })

      t.test('support additionalProperties true', async t => {
        await resetCollection()

        const UPDATE_COMMAND = {
          $set: {
            'metadata.somethingArrayObject.0.additionalItem.leaf': '3',
            'metadata.somethingArrayObject.0.additionalLeaf': 'foo',
            'metadata.somethingObject.additionalField': '9',
          },
        }
        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/${DOC_TEST._id.toHexString()}`,
          payload: UPDATE_COMMAND,
          headers: {
            userId: newUpdaterId,
          },
        })

        t.strictSame(response.statusCode, 200)

        const EXPECED_SOMETHING_ARRAY_OBJECT_0 = {
          arrayItemObjectChildNumber: 4,
          // is not cast
          additionalItem: { leaf: '3' },
          additionalLeaf: 'foo',
        }
        const EXPECTED_SOMETHING_OBJECT = {
          // is not cast
          additionalField: '9',
        }

        t.strictSame(JSON.parse(response.payload).metadata.somethingArrayObject[0], EXPECED_SOMETHING_ARRAY_OBJECT_0)
        t.strictSame(JSON.parse(response.payload).metadata.somethingObject, EXPECTED_SOMETHING_OBJECT)

        const docOnDb = await collection.findOne({ _id: DOC_TEST._id })
        t.strictSame(docOnDb.metadata.somethingArrayObject[0], EXPECED_SOMETHING_ARRAY_OBJECT_0)

        t.strictSame(docOnDb.metadata.somethingObject, EXPECTED_SOMETHING_OBJECT)

        t.end()
      })
      t.end()
    })

    t.test('with object in $set', async t => {
      t.test('ok', async t => {
        await resetCollection()
        const UPDATE_COMMAND = {
          $set: {
            metadata: {
              somethingNumber: VALUE_AS_NUMBER,
            },
          },
        }
        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/${DOC_TEST._id.toHexString()}`,
          payload: UPDATE_COMMAND,
          headers: {
            userId: newUpdaterId,
          },
        })

        t.strictSame(response.statusCode, 200)
        t.equal(JSON.parse(response.payload).metadata.somethingNumber, VALUE_AS_NUMBER)

        const docOnDb = await collection.findOne({ _id: DOC_TEST._id })
        t.strictSame(docOnDb.metadata.somethingNumber, VALUE_AS_NUMBER)
        t.end()
      })

      t.test('number as string is casted', async t => {
        await resetCollection()
        const UPDATE_COMMAND = {
          $set: {
            metadata: {
              somethingNumber: VALUE_AS_STRING,
            },
          },
        }
        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/${DOC_TEST._id.toHexString()}`,
          payload: UPDATE_COMMAND,
          headers: {
            userId: newUpdaterId,
          },
        })
        t.strictSame(response.statusCode, 200)
        t.equal(JSON.parse(response.payload).metadata.somethingNumber, VALUE_AS_NUMBER)

        const docOnDb = await collection.findOne({ _id: DOC_TEST._id })
        t.strictSame(docOnDb.metadata.somethingNumber, VALUE_AS_NUMBER)
        t.end()
      })
      t.end()
    })

    t.test('$.replace - positional operator', async t => {
      t.test('ok', async t => {
        const OLD_VALUE = 2
        const NEW_VALUE = 5

        const DOC_REPLACE_TEST = {
          ...DOC_TEST,
          metadata: {
            ...DOC_TEST.metadata,
            somethingArrayOfNumbers: [3, OLD_VALUE, 6],
            somethingArrayObject: [{
              arrayItemObjectChildNumber: 2,
            }, {
              arrayItemObjectChildNumber: OLD_VALUE,
            }],
          },
        }
        await resetCollection([DOC_REPLACE_TEST])

        const UPDATE_COMMAND = {
          $set: {
            'metadata.somethingArrayOfNumbers.$.replace': `${NEW_VALUE}`,
          },
        }
        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/${DOC_TEST._id.toHexString()}`,
          query: {
            'metadata.somethingArrayOfNumbers': `${OLD_VALUE}`,
          },
          payload: UPDATE_COMMAND,
          headers: {
            userId: newUpdaterId,
          },
        })

        t.equal(response.statusCode, 200)
        t.strictSame(JSON.parse(response.payload).metadata.somethingArrayOfNumbers, [3, NEW_VALUE, 6])

        const docOnDb = await collection.findOne({ _id: DOC_TEST._id })
        t.strictSame(docOnDb.metadata.somethingArrayOfNumbers, [3, NEW_VALUE, 6])

        t.end()
      })
      t.end()
    })

    t.test('$.merge - positional operator', async t => {
      t.test('ok', async t => {
        const OLD_VALUE = 999
        const NEW_VALUE = 5

        const DOC_REPLACE_TEST = {
          ...DOC_TEST,
          metadata: {
            ...DOC_TEST.metadata,
            somethingArrayObject: [{
              arrayItemObjectChildNumber: 2,
            }, {
              arrayItemObjectChildNumber: 3,
              anotherNumber: OLD_VALUE,
            }],
          },
        }

        await resetCollection([DOC_REPLACE_TEST])
        const UPDATE_COMMAND = {
          $set: {
            'metadata.somethingArrayObject.$.merge': { anotherNumber: `${NEW_VALUE}` },
          },
        }
        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/${DOC_TEST._id.toHexString()}`,
          query: {
            _q: JSON.stringify({
              'metadata.somethingArrayObject': {
                arrayItemObjectChildNumber: 3,
                anotherNumber: OLD_VALUE,
              },
            }),
          },
          payload: UPDATE_COMMAND,
          headers: {
            userId: newUpdaterId,
          },
        })

        t.equal(response.statusCode, 200)
        t.strictSame(JSON.parse(response.payload).metadata.somethingArrayObject, [{
          arrayItemObjectChildNumber: 2,
        }, {
          arrayItemObjectChildNumber: 3,
          anotherNumber: NEW_VALUE,
        }])

        const docOnDb = await collection.findOne({ _id: DOC_TEST._id })
        t.strictSame(docOnDb.metadata.somethingArrayObject, [{
          arrayItemObjectChildNumber: 2,
        }, {
          arrayItemObjectChildNumber: 3,
          anotherNumber: NEW_VALUE,
        }])
        t.end()
      })

      t.test('ok - with multiple nested arrays', async t => {
        const updatedAtDate = new Date('2017-11-11')
        const createdAtDate = new Date('2017-11-10')
        const creatorId = 'my-creator-id'
        const updaterId = 'my-updated-id'

        const DOC_TEST = {
          _id: ObjectId.createFromHexString('111111111111111111111111'),
          name: 'The Project',
          environments: [{
            label: 'Env 1',
            value: 'env1',
            envId: 'env1',
            dashboards: [{
              id: 'dashboard-1',
              label: 'Dashboard 1',
              url: 'the-url',
            }, {
              id: 'dashboard-2',
              label: 'Dashboard 2',
              url: 'the-other-url',
            }],
          }],
          [CREATEDAT]: createdAtDate,
          [CREATORID]: creatorId,
          [UPDATERID]: updaterId,
          [UPDATEDAT]: updatedAtDate,
          [__STATE__]: STATES.PUBLIC,
        }

        const { fastify: projectsInstance, collection } = await setUpTest(t, [DOC_TEST], 'projects')
        const UPDATE_COMMAND = {
          $set: {
            'environments.0.dashboards.$.merge': {
              url: 'http://ciao',
              label: 'foobar',
            },
          },
        }
        const response = await projectsInstance.inject({
          method: 'PATCH',
          url: `projects/${DOC_TEST._id.toHexString()}`,
          query: {
            _q: JSON.stringify({ 'environments.0.dashboards.id': 'dashboard-2' }),
          },
          payload: UPDATE_COMMAND,
          headers: {
            userId: newUpdaterId,
          },
        })

        t.equal(response.statusCode, 200)
        t.strictSame(R.omit([UPDATEDAT, CREATEDAT, UPDATERID], JSON.parse(response.payload)), {
          _id: DOC_TEST._id.toHexString(),
          name: DOC_TEST.name,
          environments: [{
            label: 'Env 1',
            value: 'env1',
            envId: 'env1',
            dashboards: [{
              id: 'dashboard-1',
              label: 'Dashboard 1',
              url: 'the-url',
            }, {
              id: 'dashboard-2',
              url: 'http://ciao',
              label: 'foobar',
            }],
          }],
          [CREATORID]: DOC_TEST[CREATORID],
          [__STATE__]: DOC_TEST[__STATE__],
        })

        const docOnDb = await collection.findOne({ _id: DOC_TEST._id })
        t.strictSame(docOnDb.environments, [{
          label: 'Env 1',
          value: 'env1',
          envId: 'env1',
          dashboards: [{
            id: 'dashboard-1',
            label: 'Dashboard 1',
            url: 'the-url',
          }, {
            id: 'dashboard-2',
            url: 'http://ciao',
            label: 'foobar',
          }],
        }])
        t.end()
      })
      t.end()
    })

    t.end()
  })

  t.test('$push', async t => {
    const { fastify, collection, resetCollection } = await setUpTest(t)

    t.test('ok with casting', async t => {
      const UPDATE_COMMAND = {
        $push: {
          attachments: { detail: { size: '9999' }, name: 'pushed' },
          'metadata.somethingArrayObject': { arrayItemObjectChildNumber: '8888' },
          'metadata.somethingArrayOfNumbers': '7777',
        },
      }
      const response = await fastify.inject({
        method: 'PATCH',
        url: `${prefix}/${DOC_TEST._id.toHexString()}`,
        payload: UPDATE_COMMAND,
        headers: {
          userId: newUpdaterId,
        },
      })
      t.equal(response.statusCode, 200)
      const payload = JSON.parse(response.payload)

      t.strictSame(
        payload.attachments,
        DOC_TEST.attachments.concat([{ detail: { size: 9999 }, name: 'pushed' }])
      )
      t.strictSame(
        payload.metadata.somethingArrayObject,
        DOC_TEST.metadata.somethingArrayObject.concat([{ arrayItemObjectChildNumber: 8888 }])
      )
      t.strictSame(
        payload.metadata.somethingArrayOfNumbers,
        DOC_TEST.metadata.somethingArrayOfNumbers.concat([7777])
      )

      const docOnDb = await collection.findOne({ _id: DOC_TEST._id })
      t.strictSame(
        docOnDb.attachments,
        DOC_TEST.attachments.concat([{ detail: { size: 9999 }, name: 'pushed' }])
      )
      t.strictSame(
        docOnDb.metadata.somethingArrayObject,
        DOC_TEST.metadata.somethingArrayObject.concat([{ arrayItemObjectChildNumber: 8888 }])
      )
      t.strictSame(
        docOnDb.metadata.somethingArrayOfNumbers,
        DOC_TEST.metadata.somethingArrayOfNumbers.concat([7777])
      )

      t.end()
    })

    t.test('ok with casting of array in array', async t => {
      const DOC_TESTING_ARRAY = {
        ...fixtures[0],
        attachments: [{
          name: 'attach-0',
          neastedArr: [2],
        }],
      }

      await resetCollection([DOC_TESTING_ARRAY])
      const UPDATE_COMMAND = {
        $push: {
          'attachments.0.neastedArr': '55',
        },
      }
      const response = await fastify.inject({
        method: 'PATCH',
        url: `${prefix}/${DOC_TESTING_ARRAY._id.toHexString()}`,
        payload: UPDATE_COMMAND,
        headers: {
          userId: newUpdaterId,
        },
      })
      t.equal(response.statusCode, 200)

      const payload = JSON.parse(response.payload)
      t.strictSame(payload.attachments, [{ name: 'attach-0', neastedArr: [2, 55] }])

      const docOnDb = await collection.findOne({ _id: DOC_TEST._id })
      t.strictSame(docOnDb.attachments, [{ name: 'attach-0', neastedArr: [2, 55] }])

      t.end()
    })

    t.test('ok with array of array', async t => {
      const DOC_TESTING_ARRAY = {
        ...fixtures[0],
        metadata: {
          ...fixtures[0].metadata,
          exampleArrayOfArray: [
            ['item1'],
          ],
        },
      }

      t.test('push to parent array', async t => {
        await resetCollection([DOC_TESTING_ARRAY])
        const UPDATE_COMMAND = {
          $push: {
            'metadata.exampleArrayOfArray': ['new-item'],
          },
        }
        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/${DOC_TESTING_ARRAY._id.toHexString()}`,
          payload: UPDATE_COMMAND,
          headers: {
            userId: newUpdaterId,
          },
        })
        t.equal(response.statusCode, 200)

        const { metadata } = JSON.parse(response.payload)
        t.strictSame(metadata.exampleArrayOfArray, [
          ['item1'],
          ['new-item'],
        ])

        const docOnDb = await collection.findOne({ _id: DOC_TEST._id })
        t.strictSame(docOnDb.metadata.exampleArrayOfArray, [
          ['item1'],
          ['new-item'],
        ])

        t.end()
      })

      t.test('push to child array', async t => {
        await resetCollection([DOC_TESTING_ARRAY])

        const UPDATE_COMMAND = {
          $push: {
            'metadata.exampleArrayOfArray.0': 'new-item',
          },
        }

        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/${DOC_TESTING_ARRAY._id.toHexString()}`,
          payload: UPDATE_COMMAND,
          headers: {
            userId: newUpdaterId,
          },
        })
        t.equal(response.statusCode, 200)

        const { metadata } = JSON.parse(response.payload)
        t.strictSame(metadata.exampleArrayOfArray, [
          ['item1', 'new-item'],
        ])

        const docOnDb = await collection.findOne({ _id: DOC_TEST._id })
        t.strictSame(docOnDb.metadata.exampleArrayOfArray, [
          ['item1', 'new-item'],
        ])

        t.end()
      })

      t.end()
    })

    t.test('fails if missing to push a required field of an object', async t => {
      await resetCollection()

      const UPDATE_COMMAND = {
        $push: {
          attachments: {
            other: 'foo',
            // name is required
          },
        },
      }
      const response = await fastify.inject({
        method: 'PATCH',
        url: `${prefix}/${DOC_TEST._id.toHexString()}`,
        payload: UPDATE_COMMAND,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.equal(response.statusCode, 400)
      t.strictSame(JSON.parse(response.payload), {
        statusCode: 400,
        error: 'Bad Request',
        message: "body must have required property 'name'",
      })

      t.end()
    })

    t.test('fails if push is not compliant to additionalProperties of the field', async t => {
      await resetCollection()

      const UPDATE_COMMAND = {
        $push: {
          attachments: {
            name: 'foo',
            unknownField: 'bar',
            // additionalProperties is false
          },
        },
      }
      const response = await fastify.inject({
        method: 'PATCH',
        url: `${prefix}/${DOC_TEST._id.toHexString()}`,
        payload: UPDATE_COMMAND,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.equal(response.statusCode, 400)
      t.strictSame(JSON.parse(response.payload), {
        statusCode: 400,
        error: 'Bad Request',
        message: 'body must NOT have additional properties',
      })

      t.end()
    })

    t.end()
  })

  t.test('$addToSet', async t => {
    const { fastify, collection, resetCollection } = await setUpTest(t)

    t.test('ok with casting', async t => {
      await resetCollection()

      const UPDATE_COMMAND = {
        $addToSet: {
          attachments: { detail: { size: '9999' }, name: 'addedToSet' },
          'metadata.somethingArrayObject': { arrayItemObjectChildNumber: '8888' },
          'metadata.somethingArrayOfNumbers': '7777',
        },
      }

      const response = await fastify.inject({
        method: 'PATCH',
        url: `${prefix}/${DOC_TEST._id.toHexString()}`,
        payload: UPDATE_COMMAND,
        headers: {
          userId: newUpdaterId,
        },
      })
      t.equal(response.statusCode, 200)
      const payload = JSON.parse(response.payload)

      t.strictSame(
        payload.attachments,
        DOC_TEST.attachments.concat([{ detail: { size: 9999 }, name: 'addedToSet' }])
      )
      t.strictSame(
        payload.metadata.somethingArrayObject,
        DOC_TEST.metadata.somethingArrayObject.concat([{ arrayItemObjectChildNumber: 8888 }])
      )
      t.strictSame(
        payload.metadata.somethingArrayOfNumbers,
        DOC_TEST.metadata.somethingArrayOfNumbers.concat([7777])
      )

      const docOnDb = await collection.findOne({ _id: DOC_TEST._id })
      t.strictSame(
        docOnDb.attachments,
        DOC_TEST.attachments.concat([{ detail: { size: 9999 }, name: 'addedToSet' }])
      )
      t.strictSame(
        docOnDb.metadata.somethingArrayObject,
        DOC_TEST.metadata.somethingArrayObject.concat([{ arrayItemObjectChildNumber: 8888 }])
      )
      t.strictSame(
        docOnDb.metadata.somethingArrayOfNumbers,
        DOC_TEST.metadata.somethingArrayOfNumbers.concat([7777])
      )

      t.end()
    })

    t.test('ok with casting of array in array', async t => {
      const DOC_TESTING_ARRAY = {
        ...fixtures[0],
        attachments: [{
          name: 'attach-0',
          neastedArr: [2],
        }],
      }

      await resetCollection([DOC_TESTING_ARRAY])
      const UPDATE_COMMAND = {
        $addToSet: {
          'attachments.0.neastedArr': '55',
        },
      }

      const response = await fastify.inject({
        method: 'PATCH',
        url: `${prefix}/${DOC_TESTING_ARRAY._id.toHexString()}`,
        payload: UPDATE_COMMAND,
        headers: {
          userId: newUpdaterId,
        },
      })
      t.equal(response.statusCode, 200)

      const payload = JSON.parse(response.payload)
      t.strictSame(payload.attachments, [{ name: 'attach-0', neastedArr: [2, 55] }])

      const docOnDb = await collection.findOne({ _id: DOC_TEST._id })
      t.strictSame(docOnDb.attachments, [{ name: 'attach-0', neastedArr: [2, 55] }])

      t.end()
    })

    t.test('ok with array of array', async t => {
      const DOC_TESTING_ARRAY = {
        ...fixtures[0],
        metadata: {
          ...fixtures[0].metadata,
          exampleArrayOfArray: [
            ['item1'],
          ],
        },
      }

      t.test('addToSet to parent array', async t => {
        await resetCollection([DOC_TESTING_ARRAY])

        const UPDATE_COMMAND = {
          $addToSet: {
            'metadata.exampleArrayOfArray': ['new-item'],
          },
        }
        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/${DOC_TESTING_ARRAY._id.toHexString()}`,
          payload: UPDATE_COMMAND,
          headers: {
            userId: newUpdaterId,
          },
        })
        t.equal(response.statusCode, 200)

        const { metadata } = JSON.parse(response.payload)
        t.strictSame(metadata.exampleArrayOfArray, [
          ['item1'],
          ['new-item'],
        ])

        const docOnDb = await collection.findOne({ _id: DOC_TEST._id })
        t.strictSame(docOnDb.metadata.exampleArrayOfArray, [
          ['item1'],
          ['new-item'],
        ])

        t.end()
      })

      t.test('addToSet to child array', async t => {
        await resetCollection([DOC_TESTING_ARRAY])

        const UPDATE_COMMAND = {
          $addToSet: {
            'metadata.exampleArrayOfArray.0': 'new-item',
          },
        }
        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/${DOC_TESTING_ARRAY._id.toHexString()}`,
          payload: UPDATE_COMMAND,
          headers: {
            userId: newUpdaterId,
          },
        })
        t.equal(response.statusCode, 200)

        const { metadata } = JSON.parse(response.payload)
        t.strictSame(metadata.exampleArrayOfArray, [
          ['item1', 'new-item'],
        ])

        const docOnDb = await collection.findOne({ _id: DOC_TEST._id })
        t.strictSame(docOnDb.metadata.exampleArrayOfArray, [
          ['item1', 'new-item'],
        ])

        t.end()
      })

      t.end()
    })

    t.test('fails if missing to addToSet a required field of an object', async t => {
      await resetCollection()

      const UPDATE_COMMAND = {
        $addToSet: {
          attachments: {
            other: 'foo',
            // name is required
          },
        },
      }
      const response = await fastify.inject({
        method: 'PATCH',
        url: `${prefix}/${DOC_TEST._id.toHexString()}`,
        payload: UPDATE_COMMAND,
        headers: {
          userId: newUpdaterId,
        },
      })
      t.equal(response.statusCode, 400)
      t.strictSame(JSON.parse(response.payload), {
        statusCode: 400,
        error: 'Bad Request',
        message: "body must have required property 'name'",
      })
      t.end()
    })

    t.test('fails if addToSet is not compliant to additionalProperties of the field', async t => {
      await resetCollection()

      const UPDATE_COMMAND = {
        $addToSet: {
          attachments: {
            name: 'foo',
            unknownField: 'bar',
            // additionalProperties is false
          },
        },
      }
      const response = await fastify.inject({
        method: 'PATCH',
        url: `${prefix}/${DOC_TEST._id.toHexString()}`,
        payload: UPDATE_COMMAND,
        headers: {
          userId: newUpdaterId,
        },
      })
      t.equal(response.statusCode, 400)
      t.strictSame(JSON.parse(response.payload), {
        statusCode: 400,
        error: 'Bad Request',
        message: 'body must NOT have additional properties',
      })
      t.end()
    })

    t.test('fails if addToSet if field is not an array', async t => {
      await resetCollection()
      const UPDATE_COMMAND = {
        $addToSet: {
          name: 'foo',
        },
      }
      const response = await fastify.inject({
        method: 'PATCH',
        url: `${prefix}/${DOC_TEST._id.toHexString()}`,
        payload: UPDATE_COMMAND,
        headers: {
          userId: newUpdaterId,
        },
      })

      t.equal(response.statusCode, 400)
      t.strictSame(JSON.parse(response.payload), {
        statusCode: 400,
        error: 'Bad Request',
        message: 'body must NOT have additional properties',
      })
      t.end()
    })
    t.end()
  })

  t.test('$unset', async t => {
    const { fastify, collection, resetCollection } = await setUpTest(t, [])

    const DOC_TO_UNSET = {
      ...fixtures[0],
      metadata: {
        somethingNumber: 3,
        somethingObject: {
          childNumber: 4,
        },
        somethingString: 'unsetme',
        somethingArrayObject: [{
          arrayItemObjectChildNumber: 4,
          anotherNumber: 99,
        }],
      },
    }

    t.test('can unset a nested property', async t => {
      await resetCollection([DOC_TO_UNSET])

      const UPDATE_COMMAND = {
        $unset: {
          'metadata.somethingString': true,
          'metadata.somethingObject.childNumber': true,
          'metadata.somethingArrayObject.0.anotherNumber': true,
        },
      }
      const response = await fastify.inject({
        method: 'PATCH',
        url: `${prefix}/${DOC_TEST._id.toHexString()}`,
        payload: UPDATE_COMMAND,
        headers: {
          userId: newUpdaterId,
        },
      })
      t.strictSame(response.statusCode, 200)

      const expectedMetadata = {
        somethingNumber: 3,
        somethingObject: {},
        somethingArrayObject: [{
          arrayItemObjectChildNumber: 4,
        }],
      }

      t.strictSame(JSON.parse(response.payload).metadata, expectedMetadata)

      const docOnDb = await collection.findOne({ _id: DOC_TEST._id })
      t.strictSame(docOnDb.metadata, expectedMetadata)
      t.end()
    })

    t.test('there is NO validation to prevent unset of required properties', async t => {
      // Documentation purpose
      await resetCollection([DOC_TO_UNSET])

      const UPDATE_COMMAND = {
        $unset: {
          'metadata.somethingNumber': true,
        },
      }
      const response = await fastify.inject({
        method: 'PATCH',
        url: `${prefix}/${DOC_TEST._id.toHexString()}`,
        payload: UPDATE_COMMAND,
        headers: {
          userId: newUpdaterId,
        },
      })
      t.strictSame(response.statusCode, 500)

      t.strictSame(JSON.parse(response.payload), {
        statusCode: 500,
        error: 'Internal Server Error',
        message: '"somethingNumber" is required!',
      })

      const docOnDb = await collection.findOne({ _id: DOC_TEST._id })
      t.strictSame(docOnDb.metadata.somethingNumber, undefined)
      t.end()
    })
    t.end()
  })
  t.end()
})

tap.test('HTTP PATCH /<id> - ', async t => {
  const { fastify, collection, resetCollection } = await setUpTest(t)

  t.test('standard fields', async t => {
    await resetCollection()

    const requiredFieldNames = collectionDefinition
      .fields
      .filter(field => field.required)
      .map(field => field.name)


    function makeCheck(t, standardField, update) {
      t.test(`${standardField} cannot be updated`, async t => {
        const response = await fastify.inject({
          method: 'PATCH',
          url: `${prefix}/${DOC._id}`,
          payload: update,
        })

        t.test('should return 400', t => {
          t.strictSame(response.statusCode, 400)
          t.end()
        })
        t.test('should return JSON', t => {
          t.ok(/application\/json/.test(response.headers['content-type']))
          t.end()
        })
        checkDocumentsInDatabase(t, collection, [], fixtures)

        t.end()
      })
    }

    STANDARD_FIELDS.forEach(
      standardField => makeCheck(t, standardField, { $set: { [standardField]: 'gg' } })
    )
    makeCheck(t, __STATE__, { $set: { [__STATE__]: 'gg' } })
    requiredFieldNames.map(
      name => makeCheck(t, name, { $unset: { [name]: true } })
    )

    t.end()
  })

  t.test('allow nullable field', async t => {
    await resetCollection()

    const nowDate = new Date()
    const DOC = {
      name: 'Name',
      isbn: 'aaaaa',
      price: 10.0,
      publishDate: nowDate,
      __STATE__: 'PUBLIC',
      position: [0, 0], /* [ lon, lat ] */
    }

    const postResponse = await fastify.inject({
      method: 'POST',
      url: `${prefix}/`,
      payload: DOC,
      headers: {
        userId: newUpdaterId,
      },
    })

    t.test('should return 200', t => {
      t.strictSame(postResponse.statusCode, 200)
      t.end()
    })
    t.test('should return application/json', t => {
      t.ok(/application\/json/.test(postResponse.headers['content-type']))
      t.end()
    })
    t.test('should return the inserted id', t => {
      const body = JSON.parse(postResponse.payload)

      t.ok(body._id)
      t.end()
    })

    t.test('PATCH', async t => {
      const body = JSON.parse(postResponse.payload)
      const update = { $set: { name: null } }
      const patchResponse = await fastify.inject({
        method: 'PATCH',
        url: `${prefix}/${body._id}`,
        payload: update,
      })
      const patchBody = JSON.parse(patchResponse.payload)

      t.test('should return 200', t => {
        t.strictSame(patchResponse.statusCode, 200)
        t.end()
      })
      t.test('should return application/json', t => {
        t.ok(/application\/json/.test(patchResponse.headers['content-type']))
        t.end()
      })
      t.test('should return the inserted id', t => {
        t.ok(patchBody._id)
        t.end()
      })
      t.test('should have null name', async t => {
        const patchResponse = await fastify.inject({
          method: 'GET',
          url: `${prefix}/${patchBody._id}`,
          headers: {
            userId: newUpdaterId,
          },
        })

        t.strictSame(patchResponse.statusCode, 200)
        const result = JSON.parse(patchResponse.payload)
        t.equal(result.name, null)
        t.end()
      })

      t.end()
    })

    t.end()
  })

  t.test('trying to merge an array of non-object elements', async t => {
    await resetCollection()

    const response = await fastify.inject({
      method: 'PATCH',
      url: `${prefix}/${DOC._id}?_q=${JSON.stringify(MATCHING_TAGIDS_QUERY)}`,
      payload: { $set: { 'tagIds.$.merge': { value: 12 } } },
    })

    t.test('should return 400', t => {
      t.strictSame(response.statusCode, 400)
      t.end()
    })
    t.test('should return JSON', t => {
      t.ok(/application\/json/.test(response.headers['content-type']))
      t.end()
    })
    t.test('body should be "Bad Request" error message', t => {
      const expectedBody = '{"statusCode":400,"error":"Bad Request","message":"body must NOT have additional properties"}'
      t.strictSame(response.body, expectedBody)
      t.end()
    })

    t.end()
  })

  t.test('trying to replace an array without specifying an element matching query', async t => {
    await resetCollection()

    const response = await fastify.inject({
      method: 'PATCH',
      url: `${prefix}/${DOC._id}`,
      payload: UPDATE_REPLACE_ARRAY_ELEMENT_COMMAND,
    })
    t.test('should return 500', t => {
      t.strictSame(response.statusCode, 500)
      t.end()
    })
    t.test('should return JSON', t => {
      t.ok(/application\/json/.test(response.headers['content-type']))
      t.end()
    })
    t.test('should return error message should be "Internal Server Error" error message', t => {
      const expectedErrorMessage = 'The positional operator did not find the match needed from the query.'
      t.match(response.body, expectedErrorMessage)
      t.end()
    })
  })

  t.test('trying to replace array number element with string by matching query', async t => {
    await resetCollection()

    const response = await fastify.inject({
      method: 'PATCH',
      url: `${prefix}/${DOC._id}?_q=${JSON.stringify(MATCHING_TAGIDS_QUERY)}`,
      payload: { $set: { 'tagIds.$.replace': 'string' } },
    })

    t.test('should return 400', t => {
      t.strictSame(response.statusCode, 400)
      t.end()
    })
    t.test('should return JSON', t => {
      t.ok(/application\/json/.test(response.headers['content-type']))
      t.end()
    })
    t.test('body.$set["tagIds.$.replace"] should be number', t => {
      const expectedErrorMessage = 'body must be number'
      t.strictSame(JSON.parse(response.body)?.message, expectedErrorMessage)
      t.end()
    })

    t.end()
  })

  t.end()
})

tap.test('HTTP PATCH /<id> with string id', async t => {
  const tests = [
    {
      name: 'on document found',
      url: `/${STATION_ID}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: STATION_DOC._id,
      returnDoc: UPDATED_STATION_HTTP_DOC,
    },
    {
      name: 'unknown document',
      url: '/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: false,
      id: STATION_DOC._id,
    },
    {
      name: 'with matching filter',
      url: `/${STATION_ID}?_q=${JSON.stringify(MATCHING_STATION_QUERY)}`,
      acl_rows: undefined,
      acl_read_columns: undefined,
      found: true,
      id: STATION_DOC._id,
      returnDoc: UPDATED_STATION_HTTP_DOC,
    },
  ]

  t.plan(tests.length)
  const { fastify, collection, resetCollection } = await setUpTest(t, stationFixtures, 'stations')

  tests.forEach(testConf => {
    const { name, found, ...conf } = testConf

    t.test(name, async t => {
      await resetCollection(stationFixtures)

      const response = await fastify.inject({
        method: 'PATCH',
        url: stationsPrefix + conf.url,
        payload: conf.command || STATION_UPDATE_COMMAND,
        headers: {
          userId: newUpdaterId,
          ...getHeaders(conf),
        },
      })

      t.test(`should return ${found ? 200 : 404}`, t => {
        t.strictSame(response.statusCode, found ? 200 : 404, response.payload)
        t.end()
      })

      t.test('should return "application/json"', t => {
        t.ok(/application\/json/.test(response.headers['content-type']))
        t.end()
      })

      t.test(`should return ${found ? 'the id' : 'the not NOT_FOUND_BODY'}`, t => {
        if (conf.returnDoc) {
          const expected = { ...conf.returnDoc }
          delete expected.updatedAt
          const actual = JSON.parse(response.payload)
          t.ok(Number.isFinite(new Date(actual.updatedAt).getTime()))
          delete actual.updatedAt
          t.strictSame(actual, expected)
        } else {
          t.strictSame(JSON.parse(response.payload), found ? { _id: conf.id.toString() } : NOT_FOUND_BODY)
        }

        t.end()
      })

      t.test('on database', t => {
        if (!conf.command) {
          t.test(`should ${found ? '' : 'not'} update the document`, async t => {
            const doc = await collection.findOne({ _id: conf.id })
            if (found) {
              t.strictSame(doc.Comune, NEW_COMUNE)
              t.strictSame(doc.updaterId, newUpdaterId)
              t.ok(Math.abs(Date.now() - doc.updatedAt.getTime()) < 5000, '`updatedAt` should be updated')
            } else {
              t.strictSame(doc.Comune, STATION_DOC.Comune)
              t.strictSame(doc.updaterId, oldUpdaterId)
              t.ok(Math.abs(Date.now() - doc.updatedAt.getTime()) > 5000, '`updatedAt` should not be updated')
            }
            t.end()
          })
        }

        t.test('should keep the other documents as is', async t => {
          const documents = await collection.find({ _id: { $ne: conf.id } }).toArray()
          t.strictSame(documents, stationFixtures.filter(d => d._id.toString() !== conf.id.toString()))
          t.end()
        })

        t.end()
      })

      t.end()
    })
  })
})
