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

const Ajv = require('ajv')
const tap = require('tap')
const { STATES } = require('../lib/consts')

const { modelJsonSchema, compatibilityModelJsonSchema } = require('../lib/model.jsonschema')


tap.test('validate schema', async t => {
  await t.test('should throw if partial Index has wrong filter', t => {
    const ajv = new Ajv({ useDefaults: true, coerceTypes: true })
    const validate = ajv.compile(compatibilityModelJsonSchema)

    const jsonFile = {
      name: 'addresses',
      endpointBasePath: '/addresses-endpoint',
      defaultState: 'DRAFT',
      fields: [
        {
          name: '_id',
          type: 'ObjectId',
          required: true,
        },
        {
          name: 'displayName',
          type: 'string',
          description: 'The display name',
          required: true,
        },
        {
          name: 'street',
          type: 'string',
          description: 'The street of the house',
          required: true,
        },
        {
          name: 'house_number',
          type: 'string',
          description: 'The number of the house',
          required: true,
        },
        {
          name: 'updaterId',
          type: 'string',
          description: 'User id that has requested the last change successfully',
          required: true,
        },
        {
          name: 'updatedAt',
          type: 'Date',
          description: 'Date of the request that has performed the last change',
          required: true,
        },
        {
          name: 'creatorId',
          type: 'string',
          description: 'User id that has created this object',
          required: true,
        },
        {
          name: 'createdAt',
          type: 'Date',
          description: 'Date of the request that has performed the object creation',
          required: true,
        },
        {
          name: '__STATE__',
          type: 'string',
          description: 'The state of the document',
          required: true,
        },
      ],
      indexes: [
        {
          name: 'streetPartialIndex',
          type: 'normal',
          unique: false,
          fields: [
            {
              name: 'street',
              order: 1,
            },
          ],
          partialIndex: 'street',
        },
      ],
    }

    t.strictSame(validate(jsonFile), false)
    t.end()
  })

  await t.test('should validate old schema', t => {
    const ajv = new Ajv({ useDefaults: true, coerceTypes: true })
    const validate = ajv.compile(compatibilityModelJsonSchema)

    const jsonFile = {
      name: 'addresses',
      endpointBasePath: '/addresses-endpoint',
      defaultState: 'DRAFT',
      fields: [
        {
          name: '_id',
          type: 'ObjectId',
          required: true,
        },
        {
          name: 'displayName',
          type: 'string',
          description: 'The display name',
          required: true,
        },
        {
          name: 'street',
          type: 'string',
          description: 'The street of the house',
          required: true,
        },
        {
          name: 'house_number',
          type: 'string',
          description: 'The number of the house',
          required: true,
        },
        {
          name: 'updaterId',
          type: 'string',
          description: 'User id that has requested the last change successfully',
          required: true,
        },
        {
          name: 'updatedAt',
          type: 'Date',
          description: 'Date of the request that has performed the last change',
          required: true,
        },
        {
          name: 'creatorId',
          type: 'string',
          description: 'User id that has created this object',
          required: true,
        },
        {
          name: 'createdAt',
          type: 'Date',
          description: 'Date of the request that has performed the object creation',
          required: true,
        },
        {
          name: '__STATE__',
          type: 'string',
          description: 'The state of the document',
          required: true,
        },
      ],
      indexes: [
        {
          name: 'streetPartialIndex',
          type: 'normal',
          unique: false,
          fields: [
            {
              name: 'street',
              order: 1,
            },
          ],
        },
      ],
    }

    t.strictSame(validate(jsonFile), true)
    t.end()
  })

  await t.test('should validate new schema', t => {
    const ajv = new Ajv({ useDefaults: true, coerceTypes: true })
    const validate = ajv.compile(modelJsonSchema)

    const jsonFile = {
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
            __mia_configuration: {
              type: 'GeoPoint',
            },
          },
          openedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
    }

    t.strictSame(validate(jsonFile), true)
    t.end()
  })

  await t.test('should validate new schema with compatibility', t => {
    const ajv = new Ajv({ useDefaults: true, coerceTypes: true })
    const validate = ajv.compile(modelJsonSchema)

    const jsonFile = {
      name: 'restaurants',
      type: 'collection',
      defaultState: 'PUBLIC',
      endpointBasePath: '/restaurants-endpoint',
      fields: [
        {
          name: '_id',
          type: 'ObjectId',
          required: true,
        },
        {
          name: '__STATE__',
          type: 'string',
          description: 'The state of the document',
          required: true,
        },
        {
          name: 'creatorId',
          type: 'string',
          description: 'User id that has created this object',
          required: true,
        },
        {
          name: 'createdAt',
          type: 'Date',
          description: 'Date of the request that has performed the object creation',
          required: true,
        },
        {
          name: 'updaterId',
          type: 'string',
          description: 'User id that has requested the last change successfully',
          required: true,
        },
        {
          name: 'updatedAt',
          type: 'Date',
          description: 'Date of the request that has performed the last change',
          required: true,
        },
        {
          name: 'name',
          type: 'string',
          description: 'The name of the book',
          required: true,
          nullable: true,
        },
        {
          name: 'isbn',
          type: 'string',
          description: 'The isbn code',
          required: true,
        },
        {
          name: 'price',
          type: 'number',
          description: 'The price of the book',
          required: false,
        },
        {
          name: 'author',
          type: 'string',
          description: 'The author of the book',
          required: false,
        },
        {
          name: 'authorAddressId',
          type: 'ObjectId',
          description: 'The address of the author',
          required: false,
        },
        {
          name: 'isPromoted',
          type: 'boolean',
          description: 'If it\'s in promotion',
          required: false,
        },
        {
          name: 'publishDate',
          type: 'Date',
          description: 'The date it was published',
          required: false,
          nullable: true,
        },
        {
          name: 'position',
          type: 'GeoPoint',
          description: 'The position of the book',
          required: false,
        },
        {
          name: 'tags',
          type: 'Array',
          items: {
            type: 'string',
          },
          description: 'Tags',
          required: false,
        },
        {
          name: 'tagIds',
          type: 'Array',
          items: {
            type: 'number',
          },
          description: 'Tag identification numbers',
          required: false,
        },
        {
          name: 'additionalInfo',
          type: 'RawObject',
          required: false,
          nullable: true,
        },
        {
          name: 'signature',
          type: 'RawObject',
          required: false,
          nullable: true,
          schema: {
            required: ['name'],
            properties: {
              name: { type: 'string' },
            },
          },
        },
        {
          name: 'metadata',
          type: 'RawObject',
          schema: {
            properties: {
              somethingString: { type: 'string' },
              somethingNumber: { type: 'number' },
              somethingArrayObject: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    arrayItemObjectChildNumber: { type: 'number' },
                    anotherNumber: { type: 'number' },
                    anotherObject: { type: 'object', nullable: true },
                  },
                  additionalProperties: true,
                  required: ['arrayItemObjectChildNumber'],
                },
              },
              somethingObject: {
                type: 'object',
                properties: {
                  childNumber: { type: 'number' },
                },
                additionalProperties: true,
              },
              somethingArrayOfNumbers: {
                type: 'array',
                items: { type: 'number' },
              },
              exampleArrayOfArray: {
                type: 'array',
                items: { type: 'array', items: { type: 'string' } },
              },
            },
            required: ['somethingNumber'],
            additionalProperties: false,
          },
          required: false,
        },
        {
          name: 'attachments',
          type: 'Array',
          items: {
            type: 'RawObject',
            schema: {
              properties: {
                name: { type: 'string' },
                detail: {
                  type: 'object',
                  properties: {
                    size: { type: 'number' },
                  },
                },
                neastedArr: {
                  type: 'array',
                  items: { type: 'number' },
                },
                additionalInfo: { type: 'object', additionalProperties: true },
                other: { type: 'string' },
                size: { type: 'number' },
                stuff: { type: 'number' },
                more: { type: 'array', items: { type: 'string' } },
              },
              required: ['name'],
              additionalProperties: false,
            },
          },
          required: false,
        },
        {
          name: 'editionsDates',
          type: 'Array',
          items: {
            type: 'RawObject',
          },
          required: false,
          nullable: true,
        },
      ],
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
          'isbn',
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
          __STATE__: {
            type: 'string',
            enum: Object.values(STATES),
            description: 'The state of the document',
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
          updaterId: {
            type: 'string',
            description: 'User id that has requested the last change successfully',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Date of the request that has performed the last change',
          },
          name: {
            type: 'string',
            description: 'The name of the book',
            nullable: true,
          },
          isbn: {
            type: 'string',
            description: 'The isbn code',
          },
          price: {
            type: 'number',
            description: 'The price of the book',
          },
          author: {
            type: 'string',
            description: 'The author of the book',
          },
          authorAddressId: {
            type: 'string',
            __mia_configuration: {
              type: 'ObjectId',
            },
            description: 'The address of the author',
          },
          isPromoted: {
            type: 'boolean',
            description: 'If it\'s in promotion',
          },
          publishDate: {
            type: 'string',
            format: 'date-time',
            description: 'The date it was published',
            nullable: true,
          },
          position: {
            type: 'object',
            __mia_configuration: {
              type: 'GeoPoint',
            },
            description: 'The position of the book',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags',
          },
          tagIds: {
            type: 'array',
            items: {
              type: 'number',
            },
            description: 'Tag identification numbers',
          },
          additionalInfo: {
            type: 'object',
            nullable: true,
          },
          signature: {
            type: 'object',
            nullable: true,
            properties: {
              name: { type: 'string' },
            },
            required: ['name'],
          },
          metadata: {
            type: 'object',
            properties: {
              somethingString: { type: 'string' },
              somethingNumber: { type: 'number' },
              somethingArrayObject: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    arrayItemObjectChildNumber: { type: 'number' },
                    anotherNumber: { type: 'number' },
                    anotherObject: { type: 'object', nullable: true },
                  },
                  additionalProperties: true,
                  required: ['arrayItemObjectChildNumber'],
                },
              },
              somethingObject: {
                type: 'object',
                properties: {
                  childNumber: { type: 'number' },
                },
                additionalProperties: true,
              },
              somethingArrayOfNumbers: {
                type: 'array',
                items: { type: 'number' },
              },
              exampleArrayOfArray: {
                type: 'array',
                items: { type: 'array', items: { type: 'string' } },
              },
            },
            required: ['somethingNumber'],
            additionalProperties: false,
          },
          attachments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                detail: {
                  type: 'object',
                  properties: {
                    size: { type: 'number' },
                  },
                },
                neastedArr: {
                  type: 'array',
                  items: { type: 'number' },
                },
                additionalInfo: { type: 'object', additionalProperties: true },
                other: { type: 'string' },
                size: { type: 'number' },
                stuff: { type: 'number' },
                more: { type: 'array', items: { type: 'string' } },
              },
              required: ['name'],
              additionalProperties: false,
            },
          },
          editionsDates: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true,
            },
            nullable: true,
          },
        },
      },
    }

    t.strictSame(validate(jsonFile), true)
    t.end()
  })

  await t.test('should validate with additional property in __mia_configuration schema', t => {
    const ajv = new Ajv({ useDefaults: true, coerceTypes: true })
    const validate = ajv.compile(modelJsonSchema)

    const jsonFile = {
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
            __mia_configuration: {
              type: 'GeoPoint',
              foo: 'bar',
            },
          },
          openedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
    }

    t.strictSame(validate(jsonFile), true)
    t.end()
  })

  t.end()
})
