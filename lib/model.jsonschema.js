/* eslint-disable max-lines */
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
  DATE_FORMATS,
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

const compatibilityModelJsonSchema = {
  type: 'object',
  required: ['name', 'fields', 'endpointBasePath'],
  additionalProperties: false,
  properties: {
    id: {
      type: 'string',
      description: 'additional collection identifier',
    },
    name: {
      type: 'string',
      description: 'name of the collection associated on MongoDB - this also uniquely identifies the collection model',
    },
    endpointBasePath: {
      type: 'string',
      description: 'APIs base path employed as entrypoint for all the CRUD operations',
    },
    description: {
      type: 'string',
      description: 'brief description of the collection purpose',
    },
    defaultState: {
      type: 'string',
      enum: Object.keys(STATES),
      default: STATES.DRAFT,
      description: 'define which is the value assigned to field __STATE__ of newly created records whenever such field is not provided',
    },
    fields: {
      type: 'array',
      description: 'represents the schema of the collection',
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
      description: 'describe which MongoDB indexes should be created for this collection',
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
      description: 'additional field that help clarifying whether this data model definition regards a collection or a view',
    },
    source: {
      type: 'string',
      description: 'employed in the view model definition - it is the name of the collection from which the view aggregation pipeline is executed',
    },
    pipeline: {
      type: 'array',
      description: 'employed in the view model definition - it is a MongoDB aggregation pipeline associated to the view that extracts and aggregates records to be exposed by CRUD Service',
      items: {
        type: 'object',
      },
    },
  },
}

const propertySchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: [
        'array',
        'boolean',
        'integer',
        'null',
        'number',
        'object',
        'string',
      ],
    },
    __mia_configuration: {
      type: 'object',
      properties: {
        type: {
          enum: [OBJECTID, GEOPOINT],
        },
        ...encryptionSchema,
      },
      additionalProperties: false,
    },
    nullable: { type: 'boolean' },
    properties: {
      type: 'object',
      additionalProperties: { anyOf: [{ type: 'object' }, { type: 'boolean' }] },
    },
    items: { type: 'object' },
    required: { type: 'array', items: { type: 'string' } },
    additionalProperties: { anyOf: [{ type: 'object' }, { type: 'boolean' }] },
    pattern: { type: 'string' },
    description: { type: 'string' },
    enum: { type: 'array' },
    format: { type: 'string', enum: DATE_FORMATS },
  },
  required: ['type'],
  additionalProperties: false,
}

const modelJsonSchema = {
  type: 'object',
  required: ['name', 'schema', 'endpointBasePath'],
  additionalProperties: false,
  properties: {
    name: {
      type: 'string',
      description: 'name of the collection associated on MongoDB - this also uniquely identifies the collection model',
    },
    endpointBasePath: {
      type: 'string',
      description: 'APIs base path employed as entrypoint for all the CRUD operations',
    },
    description: {
      type: 'string',
      description: 'brief description of the collection purpose',
    },
    defaultState: {
      type: 'string',
      enum: Object.keys(STATES),
      default: STATES.DRAFT,
      description: 'define which is the value assigned to field __STATE__ of newly created records whenever such field is not provided',
    },
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['object'], default: 'object' },
        properties: {
          type: 'object',
          properties: {
            _id: propertySchema,
            __STATE__: propertySchema,
            creatorId: propertySchema,
            createdAt: propertySchema,
            updaterId: propertySchema,
            updatedAt: propertySchema,
          },
          required: [
            '_id',
            'creatorId',
            'createdAt',
            'updaterId',
            'updatedAt',
            '__STATE__',
          ],
          additionalProperties: propertySchema,
        },
        required: {
          type: 'array',
          items: {
            type: 'string',
          },
          default: [],
        },
      },
      required: ['type', 'properties', 'required'],
    },
    indexes: {
      type: 'array',
      description: 'describe which MongoDB indexes should be created for this collection',
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
      description: 'additional field that help clarifying whether this data model definition regards a collection or a view',
    },
    source: {
      type: 'string',
      description: 'employed in the view model definition - it is the name of the collection from which the view aggregation pipeline is executed',
    },
    pipeline: {
      type: 'array',
      description: 'employed in the view model definition - it is a MongoDB aggregation pipeline associated to the view that extracts and aggregates records to be exposed by CRUD Service',
      items: {
        type: 'object',
      },
    },
  },
}

module.exports = {
  compatibilityModelJsonSchema,
  modelJsonSchema,
}
