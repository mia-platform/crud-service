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

const { STATES } = require('../../lib/consts')

module.exports = {
  name: 'restaurants',
  type: 'collection',
  defaultState: 'PUBLIC',
  endpointBasePath: '/restaurants-endpoint',
  schema: {
    type: 'object',
    required: [
      '_id',
      'creatorId',
      'createdAt',
      'updaterId',
      'updatedAt',
      '__STATE__',
      'name',
    ],
    properties: {
      _id: {
        type: 'string',
        pattern: '^[a-fA-F0-9]{24}$',
      },
      __STATE__: {
        type: 'string',
        enum: Object.keys(STATES),
      },
      creatorId: {
        type: 'string',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
      },
      updaterId: {
        type: 'string',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
      },
      ingredients: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
      name: {
        type: 'string',
      },
      location: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
          },
          coordinates: {
            type: 'array',
            items: {
              type: 'number',
            },
          },
        },
      },
      openedAt: {
        type: 'string',
        format: 'date-time',
      },
    },
  },
}
