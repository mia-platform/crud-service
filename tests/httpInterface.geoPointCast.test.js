/*
 * Copyright 2026 Mia s.r.l.
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
const { join } = require('path')
const { ObjectId } = require('mongodb')

const { fixtures } = require('./utils')
const { setUpTest, prefix } = require('./httpInterface.utils')

const RAW_POINT = { type: 'Point', coordinates: [9.18734, 45.48467] }
const [DOC] = fixtures
const ID = DOC._id.toString()
// `position` is declared as GeoPoint, `additionalInfo` as RawObject
const DOC_WITH_RAW_POINT = { ...DOC, additionalInfo: { ...DOC.additionalInfo, location: RAW_POINT } }

const parseNdjson = payload => payload.split('\n')
  .filter(Boolean)
  .map(line => JSON.parse(line))

test('HTTP GeoJSON Point casting', async t => {
  const testCases = [
    {
      name: 'by default every GeoJSON Point is cast to its coordinates',
      additionalEnvVariables: {},
      expectedRawLocation: RAW_POINT.coordinates,
    },
    {
      name: 'with CAST_ONLY_DECLARED_GEOPOINT_FIELDS only GeoPoint fields are cast',
      additionalEnvVariables: { CAST_ONLY_DECLARED_GEOPOINT_FIELDS: true },
      expectedRawLocation: RAW_POINT,
    },
    {
      name: 'with CAST_ONLY_DECLARED_GEOPOINT_FIELDS and a schema collection definition',
      additionalEnvVariables: {
        CAST_ONLY_DECLARED_GEOPOINT_FIELDS: true,
        COLLECTION_DEFINITION_FOLDER: join(__dirname, 'newCollectionDefinitions'),
      },
      expectedRawLocation: RAW_POINT,
    },
    {
      name: 'with CAST_ONLY_DECLARED_GEOPOINT_FIELDS and ENABLE_STRICT_OUTPUT_VALIDATION',
      additionalEnvVariables: { CAST_ONLY_DECLARED_GEOPOINT_FIELDS: true, ENABLE_STRICT_OUTPUT_VALIDATION: true },
      expectedRawLocation: RAW_POINT,
    },
  ]

  for (const { name, additionalEnvVariables, expectedRawLocation } of testCases) {
    await t.test(name, async t => {
      const { fastify } = await setUpTest(
        t, [DOC_WITH_RAW_POINT], undefined, false, false, 'swagger', additionalEnvVariables
      )

      const requests = [
        { url: `/${ID}`, getDocument: response => JSON.parse(response.payload) },
        { url: '/', getDocument: response => JSON.parse(response.payload)[0] },
        { url: '/export', getDocument: response => parseNdjson(response.payload)[0] },
      ]

      for (const { url, getDocument } of requests) {
        const response = await fastify.inject({ method: 'GET', url: `${prefix}${url}` })
        t.assert.strictEqual(response.statusCode, 200, url)

        const document = getDocument(response)
        t.assert.deepStrictEqual(document.position, DOC.position.coordinates, `${url} GeoPoint field`)
        t.assert.deepStrictEqual(document.additionalInfo.location, expectedRawLocation, `${url} RawObject field`)
        t.assert.strictEqual(document._id, ID, `${url} ObjectId`)
        t.assert.strictEqual(document.publishDate, DOC.publishDate.toISOString(), `${url} Date`)
      }
    })
  }
})

const GEO_POINT_CAST_FOLDER = join(__dirname, 'geoPointCast')
const point = (lon, lat) => ({ type: 'Point', coordinates: [lon, lat] })
const OWNER = { _id: new ObjectId('222222222222222222222222'), name: 'Owner', __STATE__: 'PUBLIC' }
const PLACE = {
  _id: new ObjectId('111111111111111111111111'),
  __STATE__: 'PUBLIC',
  name: 'Place',
  id_owner: OWNER._id,
  position: point(1, 2),
  info: { location: point(3, 4) },
  branches: [{ position: point(5, 6), positions: [point(7, 8), point(9, 10)], location: point(11, 12) }],
}

test('HTTP GeoJSON Point casting with CAST_ONLY_DECLARED_GEOPOINT_FIELDS', async t => {
  if (process.env.MONGO_VERSION <= '4.4') {
    t.skip('Writable views not supported on Mongo version <= 4.4')
    return
  }

  const { fastify, database } = await setUpTest(t, [PLACE], 'places', false, false, 'swagger', {
    CAST_ONLY_DECLARED_GEOPOINT_FIELDS: true,
    COLLECTION_DEFINITION_FOLDER: join(GEO_POINT_CAST_FOLDER, 'collections'),
    VIEWS_DEFINITION_FOLDER: join(GEO_POINT_CAST_FOLDER, 'views'),
  })
  await database.collection('owners').insertOne(OWNER)

  await t.test('casts nested and array GeoPoint fields', async t => {
    const response = await fastify.inject({ method: 'GET', url: '/places-endpoint/' })
    t.assert.strictEqual(response.statusCode, 200, response.payload)

    const [document] = JSON.parse(response.payload)
    t.assert.deepStrictEqual(document.position, [1, 2], 'GeoPoint field')
    t.assert.deepStrictEqual(document.info.location, point(3, 4), 'RawObject field')
    t.assert.deepStrictEqual(document.branches, [
      { position: [5, 6], positions: [[7, 8], [9, 10]], location: point(11, 12) },
    ], 'GeoPoint and array of GeoPoint inside an array of RawObject')
  })

  await t.test('casts GeoPoint fields of the document returned by PATCH on a writable view', async t => {
    const response = await fastify.inject({
      method: 'PATCH',
      url: `/places-details-endpoint/${PLACE._id}`,
      payload: { $set: { name: 'Updated place' } },
    })
    t.assert.strictEqual(response.statusCode, 200, response.payload)

    const document = JSON.parse(response.payload)
    t.assert.strictEqual(document.name, 'Updated place')
    t.assert.deepStrictEqual(document.owner, { value: OWNER._id.toString(), label: OWNER.name })
    t.assert.deepStrictEqual(document.position, [1, 2], 'GeoPoint field')
    t.assert.deepStrictEqual(document.info.location, point(3, 4), 'RawObject field')
  })
})
