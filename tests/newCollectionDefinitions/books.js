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
  name: 'books',
  endpointBasePath: '/books-endpoint',
  defaultState: 'DRAFT',
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
  indexes: [
    {
      name: 'uniqueISBN',
      type: 'normal',
      unique: true,
      fields: [
        {
          name: 'isbn',
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
      name: 'textIndex',
      type: 'text',
      unique: false,
      fields: [
        { name: 'name' },
        { name: 'author' },
      ],
      weights: {
        name: 1,
        author: 1,
      },
      defaultLanguage: 'en',
      languageOverride: 'idioma',
    },
    {
      name: 'isPromotedPartialIndex',
      type: 'normal',
      unique: false,
      fields: [
        {
          name: 'isPromoted',
          order: 1,
        },
      ],
      usePartialFilter: true,
      partialFilterExpression: '{"isPromoted": { "$eq": true } }',
    },
  ],
}
