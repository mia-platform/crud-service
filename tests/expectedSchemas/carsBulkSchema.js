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
  'summary': 'Insert new items in the cars collection.',
  'tags': [
    'Cars Endpoint',
  ],
  'body': {
    'operationId': 'cars__MIA__postBulk__MIA__body',
    'type': 'array',
    'items': {
      'type': 'object',
      'required': [
        'name',
      ],
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
      'operationId': 'cars__MIA__postBulk__MIA__response.200',
      'type': 'array',
      'items': {
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
        },
      },
    },
  },
}
