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

const { defaultFields, defaultIndexes, placeFields } = require('../common')

module.exports = {
  name: 'places',
  endpointBasePath: '/places-endpoint',
  defaultState: 'PUBLIC',
  fields: [
    ...defaultFields,
    ...placeFields,
    { name: 'id_owner', type: 'ObjectId', required: false },
    {
      name: 'branches',
      type: 'Array',
      required: false,
      items: {
        type: 'RawObject',
        schema: {
          properties: {
            position: { type: 'object', __mia_configuration: { type: 'GeoPoint' } },
            positions: { type: 'array', items: { type: 'object', __mia_configuration: { type: 'GeoPoint' } } },
            location: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  ],
  indexes: defaultIndexes,
}
