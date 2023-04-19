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
  name: 'cars',
  endpointBasePath: '/cars-endpoint',
  defaultState: 'PUBLIC',
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
        __mia_configuration: {
          type: 'ObjectId',
        },
        description: 'Hexadecimal identifier of the document in the collection',
      },
      name: {
        type: 'string',
        description: 'The car\'s name',
      },
      price: {
        type: 'number',
        description: 'The car\'s price',
      },
      position: {
        type: 'object',
        __mia_configuration: {
          type: 'GeoPoint',
        },
        description: 'The car\'s position',
      },
      additionalInfo: {
        type: 'object',
      },
      updaterId: {
        type: 'string',
        description: 'User id that has requested the last change successfully',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Date of the request that has performed the last change',
      },
      creatorId: {
        type: 'string',
        description: 'User id that has created this object',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Date of the request that has performed the object creation',
      },
      __STATE__: {
        type: 'string',
        enum: Object.values(STATES),
        description: 'The state of the document',
      },
    },
  },
  indexes: [
    {
      name: 'nameUnique',
      type: 'normal',
      unique: true,
      fields: [
        {
          name: 'name',
          order: 1,
        },
      ],
    },
    {
      name: 'priceIndex',
      type: 'normal',
      unique: false,
      fields: [
        {
          name: 'price',
          order: 1,
        },
      ],
    },
    {
      name: 'positionIndex',
      type: 'geo',
      unique: false,
      field: 'position',
    },
    {
      name: 'ttlIndex',
      type: 'normal',
      expireAfterSeconds: 100,
      unique: false,
      fields: [
        {
          name: 'createdAt',
          order: 1,
        },
      ],
    },
  ],
}
