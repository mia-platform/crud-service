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

const {
  STATES,
  ARRAY,
  GEOPOINT,
  DATE,
  OBJECTID,
  RAWOBJECTTYPE,
  MONGOID,
  UPDATERID,
  UPDATEDAT,
  CREATORID,
  CREATEDAT,
  __STATE__,
  TEXT_INDEX,
  NORMAL_INDEX,
  GEO_INDEX,
  HASHED_INDEX,
} = require('./consts')

const encryptionSchema = {
  encryption: {
    type: 'object',
    properties: {
      enabled: { type: 'boolean' },
      searchable: { type: 'boolean' },
    },
  },
}

module.exports = {
  type: 'object',
  required: ['name', 'fields', 'endpointBasePath'],
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    endpointBasePath: { type: 'string' },
    description: { type: 'string' },
    defaultState: { type: 'string', enum: Object.keys(STATES), default: STATES.DRAFT },
    fields: {
      type: 'array',
      items: {
        oneOf: [
          {
            type: 'object',
            required: ['name', 'type', 'required'],
            properties: {
              name: { type: 'string' },
              type: {
                enum: [
                  OBJECTID,
                  'string',
                  'number',
                  'boolean',
                  DATE,
                  GEOPOINT,
                  RAWOBJECTTYPE,
                ],
              },
              description: { type: 'string' },
              required: { type: 'boolean' },
              nullable: { type: 'boolean' },
              ...encryptionSchema,
            },
          },
          {
            type: 'object',
            required: ['name', 'type', 'items'],
            properties: {
              name: { type: 'string' },
              type: {
                enum: [ARRAY],
              },
              items: {
                type: 'object',
                properties: {
                  type: { enum: ['string', 'number', RAWOBJECTTYPE, OBJECTID] },
                },
              },
              description: { type: 'string' },
              ...encryptionSchema,
            },
          },
        ],
      },
      allOf: [
        {
          contains: {
            type: 'object',
            properties: {
              name: {
                enum: [UPDATERID],
              },
              type: {
                enum: ['string'],
              },
              description: { type: 'string' },
              required: {
                type: 'boolean',
                enum: [true],
              },
              ...encryptionSchema,
            },
          },
        },
        {
          contains: {
            type: 'object',
            properties: {
              name: {
                enum: [UPDATEDAT],
              },
              type: {
                enum: [DATE],
              },
              description: { type: 'string' },
              required: {
                type: 'boolean',
                enum: [true],
              },
            },
          },
        },
        {
          contains: {
            type: 'object',
            properties: {
              name: {
                enum: [CREATORID],
              },
              type: {
                enum: ['string'],
              },
              description: { type: 'string' },
              required: {
                type: 'boolean',
                enum: [true],
              },
              ...encryptionSchema,
            },
          },
        },
        {
          contains: {
            type: 'object',
            properties: {
              name: {
                enum: [CREATEDAT],
              },
              type: {
                enum: [DATE],
              },
              description: { type: 'string' },
              required: {
                type: 'boolean',
                enum: [true],
              },
            },
          },
        },
        {
          contains: {
            type: 'object',
            properties: {
              name: {
                enum: [MONGOID],
              },
              type: {
                enum: [
                  OBJECTID,
                  'string',
                ],
              },
              description: { type: 'string' },
              required: {
                type: 'boolean',
                enum: [true],
              },
            },
          },
        },
        {
          contains: {
            type: 'object',
            properties: {
              name: {
                enum: [__STATE__],
              },
              type: {
                type: 'string',
              },
              description: { type: 'string' },
              required: {
                type: 'boolean',
                enum: [true],
              },
            },
          },
        },
      ],
    },
    indexes: {
      type: 'array',
      items: {
        oneOf: [
          {
            type: 'object',
            oneOf: [
              {
                required: ['name', 'type', 'unique', 'fields'],
                additionalProperties: false,
                properties: {
                  name: { type: 'string' },
                  type: {
                    type: 'string',
                    enum: [TEXT_INDEX],
                  },
                  fields: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['name'],
                      additionalProperties: false,
                      properties: {
                        name: { type: 'string' },
                      },
                    },
                  },
                  weights: {
                    type: 'object',
                    additionalProperties: true,
                  },
                  defaultLanguage: { type: 'string' },
                  languageOverride: { type: 'string' },
                  background: { type: 'boolean' },
                  unique: { type: 'boolean' },
                  usePartialFilter: { type: 'boolean' },
                  partialFilterExpression: { type: 'string' },
                },
              },
              {
                required: ['name', 'type', 'unique', 'fields'],
                additionalProperties: false,
                properties: {
                  name: { type: 'string' },
                  type: {
                    type: 'string',
                    enum: [NORMAL_INDEX],
                  },
                  unique: { type: 'boolean' },
                  fields: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['name', 'order'],
                      additionalProperties: false,
                      properties: {
                        name: { type: 'string' },
                        order: {
                          type: 'number',
                          enum: [-1, 1],
                        },
                      },
                    },
                  },
                  usePartialFilter: { type: 'boolean' },
                  partialFilterExpression: { type: 'string' },
                },
              },
              {
                required: ['name', 'type', 'unique', 'fields', 'expireAfterSeconds'],
                additionalProperties: false,
                properties: {
                  name: { type: 'string' },
                  type: {
                    type: 'string',
                    enum: [NORMAL_INDEX],
                  },
                  unique: {
                    type: 'boolean',
                  },
                  expireAfterSeconds: {
                    type: 'number',
                  },
                  fields: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 1,
                    items: {
                      type: 'object',
                      required: ['name', 'order'],
                      additionalProperties: false,
                      properties: {
                        name: { type: 'string' },
                        order: {
                          type: 'number',
                          enum: [-1, 1],
                        },
                      },
                    },
                  },
                  usePartialFilter: { type: 'boolean' },
                  partialFilterExpression: { type: 'string' },
                },
              },
            ],
          },
          {
            type: 'object',
            required: ['name', 'type', 'unique', 'field'],
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              type: {
                type: 'string',
                enum: [GEO_INDEX],
              },
              unique: { type: 'boolean' },
              field: { type: 'string' },
              usePartialFilter: { type: 'boolean' },
              partialFilterExpression: { type: 'string' },
            },
          },
          {
            type: 'object',
            required: ['name', 'type', 'unique', 'field'],
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              type: {
                type: 'string',
                enum: [HASHED_INDEX],
              },
              unique: {
                type: 'boolean',
                enum: [false],
              },
              field: { type: 'string' },
              usePartialFilter: { type: 'boolean' },
              partialFilterExpression: { type: 'string' },
            },
          },
        ],
      },
    },
    type: {
      type: 'string',
      default: 'collection',
    },
    source: {
      type: 'string',
    },
    pipeline: {
      type: 'array',
      items: {
        type: 'object',
      },
    },
  },
}
