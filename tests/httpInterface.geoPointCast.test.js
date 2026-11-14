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

tap.test('HTTP GeoJSON Point casting', async t => {
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
  ]

  for (const { name, additionalEnvVariables, expectedRawLocation } of testCases) {
    t.test(name, async t => {
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
        t.equal(response.statusCode, 200, url)

        const document = getDocument(response)
        t.strictSame(document.position, DOC.position.coordinates, `${url} GeoPoint field`)
        t.strictSame(document.additionalInfo.location, expectedRawLocation, `${url} RawObject field`)
        t.equal(document._id, ID, `${url} ObjectId`)
        t.equal(document.publishDate, DOC.publishDate.toISOString(), `${url} Date`)
      }
    })
  }
})
