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
  'summary': 'Update multiple items of cars, each one with its own modifications',
  'tags': [
    'Cars Endpoint',
  ],
  'body': {
    'operationId': 'cars__MIA__patchBulk__MIA__body',
    'type': 'array',
    'items': {
      'type': 'object',
      'properties': {
        'filter': {
          'type': 'object',
          'properties': {
            '_id': {
              'type': 'string',
              'pattern': '^[a-fA-F\\d]{24}$',
              'description': 'Hexadecimal identifier of the document in the collection',
              'examples': [
                '000000000000000000000000',
              ],
            },
            '_st': {
              'type': 'string',
              'pattern': '(PUBLIC|DRAFT|TRASH|DELETED)(,(PUBLIC|DRAFT|TRASH|DELETED))*',
              'default': 'PUBLIC',
              'description': 'Filter by \\_\\_STATE__, multiple states can be specified in OR by providing a comma separated list',
            },
            'name': {
              'type': 'string',
              'description': "The car's name",
            },
            'price': {
              'type': 'number',
              'description': "The car's price",
            },
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
                'name': {
                  'type': 'string',
                  'description': "The car's name",
                },
                'price': {
                  'type': 'number',
                  'description': "The car's price",
                },
                'position': {
                  'type': 'array',
                  'items': {
                    'type': 'number',
                  },
                  'minItems': 2,
                  'maxItems': 3,
                  'description': "The car's position",
                },
                'additionalInfo': {
                  'type': 'object',
                  'additionalProperties': true,
                },
              },
              'additionalProperties': false,
              'patternProperties': {
                'additionalInfo.': true,
              },
            },
            '$unset': {
              'type': 'object',
              'properties': {
                'price': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
                'position': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
                'additionalInfo': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
              },
              'additionalProperties': false,
              'patternProperties': {
                'additionalInfo.': true,
              },
            },
            '$inc': {
              'type': 'object',
              'properties': {
                'price': {
                  'type': 'number',
                },
              },
              'additionalProperties': false,
              'patternProperties': {
                'additionalInfo.': true,
              },
            },
            '$mul': {
              'type': 'object',
              'properties': {
                'price': {
                  'type': 'number',
                },
              },
              'additionalProperties': false,
              'patternProperties': {
                'additionalInfo.': true,
              },
            },
            '$currentDate': {
              'type': 'object',
              'properties': {},
              'additionalProperties': false,
            },
            '$push': {
              'type': 'object',
              'properties': {},
              'additionalProperties': false,
            },
            '$pull': {
              'type': 'object',
              'properties': {},
              'additionalProperties': false,
            },
            '$addToSet': {
              'type': 'object',
              'properties': {},
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
      'operationId': 'cars__MIA__patchBulk__MIA__response.200',
      'type': 'integer',
      'minimum': 0,
    },
  },
}
