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
  'summary': 'Update an item in the stations collection. If the item is not in the collection, it will be inserted.',
  'tags': [
    'Stations Endpoint',
  ],
  'querystring': {
    'operationId': 'stations__MIA__upsertOne__MIA__querystring',
    'type': 'object',
    'properties': {
      'updaterId': {
        'type': 'string',
        'description': 'User id that has requested the last change successfully',
      },
      'updatedAt': {
        'type': 'string',
        'pattern': '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$',
        'description': 'Date of the request that has performed the last change',
        'examples': [
          '2020-09-16T12:00:00.000Z',
        ],
      },
      'creatorId': {
        'type': 'string',
        'description': 'User id that has created this object',
      },
      'createdAt': {
        'type': 'string',
        'pattern': '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$',
        'description': 'Date of the request that has performed the object creation',
        'examples': [
          '2020-09-16T12:00:00.000Z',
        ],
      },
      'Cap': {
        'type': 'number',
      },
      'CodiceMIR': {
        'type': 'string',
      },
      'Comune': {
        'type': 'string',
      },
      'Indirizzo': {
        'type': 'string',
      },
      'country': {
        'type': 'string',
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
    'operationId': 'stations__MIA__upsertOne__MIA__body',
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
            'type': 'array',
            'items': {
              'type': 'string',
            },
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
        'properties': {},
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
      '$setOnInsert': {
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
            'type': 'array',
            'items': {
              'type': 'string',
            },
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
        },
        'additionalProperties': false,
      },
    },
    'additionalProperties': false,
  },
  'response': {
    '200': {
      'operationId': 'stations__MIA__upsertOne__MIA__response.200',
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
          'type': 'string',
          'format': 'date-time',
          'examples': [
            '2020-09-16T12:00:00.000Z',
          ],
          'description': 'Date of the request that has performed the last change',
        },
        'creatorId': {
          'type': 'string',
          'description': 'User id that has created this object',
        },
        'createdAt': {
          'type': 'string',
          'format': 'date-time',
          'examples': [
            '2020-09-16T12:00:00.000Z',
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
          'type': 'array',
          'items': {
            'type': 'string',
          },
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
      },
    },
  },
}
