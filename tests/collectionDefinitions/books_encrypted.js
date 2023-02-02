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

module.exports = {
  name: 'books-encrypted',
  endpointBasePath: '/books-encrypted-endpoint',
  defaultState: 'PUBLIC',
  fields: [
    {
      name: '_id',
      type: 'ObjectId',
      required: true,
    },
    {
      name: 'name',
      type: 'string',
      description: 'The name of the book',
      required: true,
      nullable: true,
      encryption: {
        enabled: true,
        searchable: true,
      },
    },
    {
      name: 'isbn',
      type: 'string',
      description: 'The isbn code',
      required: true,
      encryption: {
        enabled: true,
        searchable: false,
      },
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
    },
    {
      name: 'metadata',
      type: 'RawObject',
      schema: {
        properties: {
          somethingString: {
            type: 'string',
            encryption: {
              enabled: true,
              searchable: true,
            },
          },
          somethingNumber: { type: 'number' },
          somethingArrayObject: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                arrayItemObjectChildNumber: { type: 'number' },
                anotherNumber: { type: 'number' },
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
            encryption: {
              enabled: true,
              searchable: false,
            },
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
  ],
}
