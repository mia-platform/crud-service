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
  'summary': 'Export the stations collection',
  'description': 'The exported documents are sent as newline separated JSON objects to facilitate large dataset streaming and parsing',
  'tags': [
    'Stations Endpoint',
  ],
  'querystring': {
    'operationId': 'stations__MIA__export__MIA__querystring',
    'type': 'object',
    'properties': {
      '_id': {
        'type': 'string',
        'pattern': '^(?!\\s*$).+',
        'description': 'String identifier of the document in the collection',
        'examples': [
          '00000000-0000-4000-0000-000000000000',
        ],
      },
      'creatorId': {
        'type': 'string',
        'description': 'User id that has created this object',
      },
      'createdAt': {
        'type': [
          'string',
          'object',
        ],
        'anyOf': [
          {
            'type': 'string',
            'pattern': '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$',
            'description': '"date-time" according with https://tools.ietf.org/html/rfc3339#section-5.6',
            'examples': [
              '1997-04-24T07:00:00.000Z',
            ],
          },
          {
            'type': 'object',
            'instanceof': 'Date',
          },
        ],
      },
      'updaterId': {
        'type': 'string',
        'description': 'User id that has requested the last change successfully',
      },
      'updatedAt': {
        'type': [
          'string',
          'object',
        ],
        'anyOf': [
          {
            'type': 'string',
            'pattern': '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$',
            'description': '"date-time" according with https://tools.ietf.org/html/rfc3339#section-5.6',
            'examples': [
              '1997-04-24T07:00:00.000Z',
            ],
          },
          {
            'type': 'object',
            'instanceof': 'Date',
          },
        ],
      },
      'Cap': {
        'type': 'number',
        'nullable': true,
      },
      'CodiceMIR': {
        'type': 'string',
        'nullable': true,
      },
      'Comune': {
        'type': 'string',
        'nullable': true,
      },
      'Direttrici': {
        'type': [
          'array',
          'null',
          'string',
        ],
        'anyOf': [
          {
            'type': 'array',
            'items': {
              'type': 'string',
            },
          },
          {
            'type': 'string',
          },
          {
            'type': 'null',
            'nullable': true,
          },
        ],
        'nullable': true,
      },
      'Indirizzo': {
        'type': 'string',
        'nullable': true,
      },
      'country': {
        'type': 'string',
        'nullable': true,
      },
      'nonNullableDate': {
        'type': [
          'string',
          'object',
        ],
        'anyOf': [
          {
            'type': 'string',
            'pattern': '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$',
            'description': '"date-time" according with https://tools.ietf.org/html/rfc3339#section-5.6',
            'examples': [
              '1997-04-24T07:00:00.000Z',
            ],
          },
          {
            'type': 'object',
            'instanceof': 'Date',
          },
        ],
      },
      '_q': {
        'type': 'string',
        'description': 'Additional query part to forward to MongoDB',
      },
      '_p': {
        'type': 'string',
        'description': 'Return only the properties specified in a comma separated list',
        'examples': [
          'field1,field2,field3.nestedField',
        ],
      },
      '_st': {
        'type': 'string',
        'pattern': '(PUBLIC|DRAFT|TRASH|DELETED)(,(PUBLIC|DRAFT|TRASH|DELETED))*',
        'default': 'PUBLIC',
        'description': 'Filter by \\_\\_STATE__, multiple states can be specified in OR by providing a comma separated list',
      },
      '_rawp': {
        'type': 'string',
        'description': 'Additional raw stringified projection for MongoDB',
      },
      '_l': {
        'type': 'integer',
        'minimum': 1,
        'description': 'Limits the number of documents',
      },
      '_sk': {
        'type': 'integer',
        'minimum': 0,
        'description': 'Skip the specified number of documents',
      },
      '_s': {
        'anyOf': [
          {
            'type': 'string',
            'pattern': '^-?(_id|updaterId|updatedAt|creatorId|createdAt|__STATE__|Cap|CodiceMIR|Comune|Direttrici|Indirizzo|country|nonNullableDate)(\\.([^\\.,])+)*(,-?(_id|updaterId|updatedAt|creatorId|createdAt|__STATE__|Cap|CodiceMIR|Comune|Direttrici|Indirizzo|country|nonNullableDate)(\\.([^\\.,])+)*)*$',
          },
          {
            'type': 'array',
            'items': {
              'type': 'string',
              'pattern': '^-?(_id|updaterId|updatedAt|creatorId|createdAt|__STATE__|Cap|CodiceMIR|Comune|Direttrici|Indirizzo|country|nonNullableDate)(\\.([^\\.,])+)*(,-?(_id|updaterId|updatedAt|creatorId|createdAt|__STATE__|Cap|CodiceMIR|Comune|Direttrici|Indirizzo|country|nonNullableDate)(\\.([^\\.,])+)*)*$',
            },
          },
        ],
        'description': 'Sort by the specified property/properties (Start with a "-" to invert the sort order)',
      },
    },
    'additionalProperties': false,
  },
  'response': {
    '200': {
      'operationId': 'stations__MIA__export__MIA__response.200',
      'type': 'array',
      'items': {
        'type': 'object',
        'properties': {
          '_id': {
            'type': 'string',
            'description': '_id',
          },
          'updaterId': {
            'type': 'string',
            'description': 'User id that has requested the last change successfully',
          },
          'updatedAt': {
            'type': [
              'string',
              'object',
            ],
            'anyOf': [
              {
                'type': 'string',
                'format': 'date-time',
                'examples': [
                  '1997-04-24T07:00:00.000Z',
                ],
              },
              {
                'type': 'object',
                'instanceof': 'Date',
              },
              {
                'type': 'string',
              },
            ],
            'description': 'Date of the request that has performed the last change',
          },
          'creatorId': {
            'type': 'string',
            'description': 'User id that has created this object',
          },
          'createdAt': {
            'type': [
              'string',
              'object',
            ],
            'anyOf': [
              {
                'type': 'string',
                'format': 'date-time',
                'examples': [
                  '1997-04-24T07:00:00.000Z',
                ],
              },
              {
                'type': 'object',
                'instanceof': 'Date',
              },
              {
                'type': 'string',
              },
            ],
            'description': 'Date of the request that has performed the object creation',
          },
          '__STATE__': {
            'type': 'string',
            'description': 'The state of the document',
          },
          'Cap': {
            'type': 'number',
            'nullable': true,
          },
          'CodiceMIR': {
            'type': 'string',
            'nullable': true,
          },
          'Comune': {
            'type': 'string',
            'nullable': true,
          },
          'Direttrici': {
            'type': [
              'array',
              'null',
              'string',
            ],
            'anyOf': [
              {
                'type': 'array',
                'items': {
                  'type': 'string',
                },
              },
              {
                'type': 'string',
              },
              {
                'type': 'null',
                'nullable': true,
              },
            ],
            'nullable': true,
          },
          'Indirizzo': {
            'type': 'string',
            'nullable': true,
          },
          'country': {
            'type': 'string',
            'nullable': true,
          },
          'nonNullableDate': {
            'type': [
              'string',
              'object',
            ],
            'anyOf': [
              {
                'type': 'string',
                'format': 'date-time',
                'examples': [
                  '1997-04-24T07:00:00.000Z',
                ],
              },
              {
                'type': 'object',
                'instanceof': 'Date',
              },
              {
                'type': 'string',
              },
            ],
          },
        },
      },
    },
  },
}
