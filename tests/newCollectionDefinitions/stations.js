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
  description: 'Collection of stations',
  name: 'stations',
  schema: {
    type: 'object',
    required: [
      '_id',
      'creatorId',
      'createdAt',
      'updaterId',
      'updatedAt',
      '__STATE__',
    ],
    properties: {
      _id: {
        type: 'string',
        description: '_id',
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
      Cap: {
        type: 'number',
        nullable: true,
      },
      CodiceMIR: {
        type: 'string',
        nullable: true,
      },
      Comune: {
        type: 'string',
        nullable: true,
      },
      Direttrici: {
        type: 'array',
        nullable: true,
        items: {
          type: 'string',
        },
      },
      Indirizzo: {
        type: 'string',
        nullable: true,
      },
      country: {
        type: 'string',
        nullable: true,
      },
    },
  },
  indexes: [
    {
      name: '_id',
      type: 'normal',
      unique: true,
      fields: [
        {
          name: '_id',
          order: 1,
        },
      ],
    },
  ],
  endpointBasePath: '/stations-endpoint',
  defaultState: 'DRAFT',
}
