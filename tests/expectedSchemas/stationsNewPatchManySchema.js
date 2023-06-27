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
  'summary': 'Update the items of the stations collection that match the query.',
  'tags': [
    'Stations Endpoint',
  ],
  'querystring': {
    'operationId': 'stations__MIA__patchMany__MIA__querystring',
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
            'examples': [
              '1997-04-24T07:00:00.000Z',
            ],
            'format': 'date-time',
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
            'examples': [
              '1997-04-24T07:00:00.000Z',
            ],
            'format': 'date-time',
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
            'type': 'null',
            'nullable': true,
          },
          {
            'type': 'array',
            'items': {
              'type': 'string',
            },
          },
          {
            'type': 'string',
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
            'examples': [
              '1997-04-24T07:00:00.000Z',
            ],
            'format': 'date-time',
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
    },
    'additionalProperties': false,
  },
  'body': {
    'operationId': 'stations__MIA__patchMany__MIA__body',
    'type': 'object',
    'properties': {
      '$set': {
        'type': 'object',
        'properties': {
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
                'type': 'null',
                'nullable': true,
              },
              {
                'type': 'array',
                'items': {
                  'type': 'string',
                },
              },
              {
                'type': 'string',
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
                'examples': [
                  '1997-04-24T07:00:00.000Z',
                ],
                'format': 'date-time',
              },
              {
                'type': 'object',
                'instanceof': 'Date',
              },
            ],
          },
          'Direttrici.$.replace': {
            'type': 'string',
          },
        },
        'additionalProperties': false,
        'patternProperties': {},
      },
      '$unset': {
        'type': 'object',
        'properties': {
          'Cap': {
            'type': 'boolean',
            'enum': [
              true,
            ],
          },
          'CodiceMIR': {
            'type': 'boolean',
            'enum': [
              true,
            ],
          },
          'Comune': {
            'type': 'boolean',
            'enum': [
              true,
            ],
          },
          'Direttrici': {
            'type': 'boolean',
            'enum': [
              true,
            ],
          },
          'Indirizzo': {
            'type': 'boolean',
            'enum': [
              true,
            ],
          },
          'country': {
            'type': 'boolean',
            'enum': [
              true,
            ],
          },
          'nonNullableDate': {
            'type': 'boolean',
            'enum': [
              true,
            ],
          },
        },
        'additionalProperties': false,
        'patternProperties': {},
      },
      '$inc': {
        'type': 'object',
        'properties': {
          'Cap': {
            'type': 'number',
          },
        },
        'additionalProperties': false,
        'patternProperties': {},
      },
      '$mul': {
        'type': 'object',
        'properties': {
          'Cap': {
            'type': 'number',
          },
        },
        'additionalProperties': false,
        'patternProperties': {},
      },
      '$currentDate': {
        'type': 'object',
        'properties': {
          'nonNullableDate': {
            'type': 'boolean',
            'enum': [
              true,
            ],
          },
        },
        'additionalProperties': false,
      },
      '$push': {
        'type': 'object',
        'properties': {
          'Direttrici': {
            'type': 'string',
          },
        },
        'additionalProperties': false,
      },
      '$pull': {
        'type': 'object',
        'properties': {
          'Direttrici': {
            'oneOf': [
              {
                'type': 'string',
              },
              {
                'type': 'object',
                'patternProperties': {
                  '^$': {},
                },
              },
            ],
          },
        },
        'additionalProperties': false,
      },
      '$addToSet': {
        'type': 'object',
        'properties': {
          'Direttrici': {
            'oneOf': [
              {
                'type': 'string',
              },
              {
                'type': 'object',
                'patternProperties': {
                  '^$': {},
                },
              },
            ],
          },
        },
        'additionalProperties': false,
      },
    },
    'additionalProperties': false,
  },
  'response': {
    '200': {
      'operationId': 'stations__MIA__patchMany__MIA__response.200',
      'type': 'number',
      'description': 'the number of documents that were modified',
    },
  },
}
