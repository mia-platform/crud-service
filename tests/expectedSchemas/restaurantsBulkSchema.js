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
  'summary': 'Insert new items in the restaurants collection.',
  'tags': [
    'Restaurants',
  ],
  'body': {
    'operationId': 'restaurants__MIA__postBulk__MIA__body',
    'type': 'array',
    'items': {
      'type': 'object',
      'properties': {
        'type': 'object',
        'required': [
          '_id',
          'creatorId',
          'createdAt',
          'updaterId',
          'updatedAt',
          '__STATE__',
        ],
        'properties': {
          '_id': {
            'type': 'string',
            'pattern': '^[a-fA-F0-9]{24}$',
          },
          '__STATE__': {
            'type': 'string',
            'enum': [
              'PUBLIC',
              'DRAFT',
              'TRASH',
              'DELETED',
            ],
          },
          'creatorId': {
            'type': 'string',
          },
          'createdAt': {
            'type': 'string',
            'format': 'date-time',
          },
          'updaterId': {
            'type': 'string',
          },
          'updatedAt': {
            'type': 'string',
            'format': 'date-time',
          },
          'ingredients': {
            'type': 'array',
            'items': {
              'type': 'string',
            },
          },
          'location': {
            'type': 'object',
            'properties': {
              'type': {
                'type': 'string',
              },
              'coordinates': {
                'type': 'array',
                'items': {
                  'type': 'number',
                },
              },
            },
          },
        },
        '__STATE__': {
          'type': 'string',
          'enum': [
            'PUBLIC',
            'DRAFT',
            'TRASH',
            'DELETED',
          ],
          'description': 'The state of the document',
          'default': 'PUBLIC',
        },
      },
      'additionalProperties': false,
    },
  },
  'response': {
    '200': {
      'operationId': 'restaurants__MIA__postBulk__MIA__response.200',
      'type': 'array',
      'items': {
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
        },
      },
    },
  },
}
