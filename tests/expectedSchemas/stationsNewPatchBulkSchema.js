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
  'summary': 'Update multiple items of stations, each one with its own modifications',
  'tags': [
    'Stations Endpoint',
  ],
  'body': {
    'operationId': 'stations__MIA__patchBulk__MIA__body',
    'type': 'array',
    'items': {
      'type': 'object',
      'properties': {
        'filter': {
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
            '_st': {
              'type': 'string',
              'pattern': '(PUBLIC|DRAFT|TRASH|DELETED)(,(PUBLIC|DRAFT|TRASH|DELETED))*',
              'default': 'PUBLIC',
              'description': 'Filter by \\_\\_STATE__, multiple states can be specified in OR by providing a comma separated list',
            },
            'creatorId': {
              'type': 'string',
              'description': 'User id that has created this object',
            },
            'createdAt': {
              'type': 'string',
              'description': 'Date of the request that has performed the object creation',
              'examples': [
                '2020-09-16T12:00:00.000Z',
              ],
              'format': 'date-time',
            },
            'updaterId': {
              'type': 'string',
              'description': 'User id that has requested the last change successfully',
            },
            'updatedAt': {
              'type': 'string',
              'description': 'Date of the request that has performed the last change',
              'examples': [
                '2020-09-16T12:00:00.000Z',
              ],
              'format': 'date-time',
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
            'Indirizzo': {
              'type': 'string',
              'nullable': true,
            },
            'country': {
              'type': 'string',
              'nullable': true,
            },
            '_q': {
              'type': 'string',
              'description': 'Additional query part to forward to MongoDB',
            },
            '_rawp': {
              'type': 'string',
              'description': 'Additional raw stringified projection for MongoDB',
            },
          },
          'additionalProperties': false,
        },
        'update': {
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
          },
          'additionalProperties': false,
        },
      },
      'required': [
        'filter',
        'update',
      ],
    },
    'minItems': 1,
  },
  'response': {
    '200': {
      'operationId': 'stations__MIA__patchBulk__MIA__response.200',
      'type': 'integer',
      'minimum': 0,
    },
  },
}
