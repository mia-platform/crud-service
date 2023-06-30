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
  'summary': 'Change state of multiple items of stations.',
  'tags': [
    'stations endpoint',
  ],
  'body': {
    'operationId': 'stations__MIA__changeStateMany__MIA__body',
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
              'example': '00000000-0000-4000-0000-000000000000',
            },
            'creatorId': {
              'type': 'string',
              'description': 'User id that has created this object',
            },
            'createdAt': {
              'type': 'string',
              'example': '1997-04-24T07:00:00.000Z',
              'pattern': '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$',
            },
            'updaterId': {
              'type': 'string',
              'description': 'User id that has requested the last change successfully',
            },
            'updatedAt': {
              'type': 'string',
              'example': '1997-04-24T07:00:00.000Z',
              'pattern': '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$',
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
            'nonNullableDate': {
              'type': 'string',
              'example': '1997-04-24T07:00:00.000Z',
              'pattern': '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$',
              'description': '"date-time" according with https://tools.ietf.org/html/rfc3339#section-5.6',
              'nullable': false,
            },
          },
        },
        'stateTo': {
          'type': 'string',
          'enum': [
            'PUBLIC',
            'DRAFT',
            'TRASH',
            'DELETED',
          ],
        },
      },
      'required': [
        'filter',
        'stateTo',
      ],
      'additionalProperties': false,
    },
    'minItems': 1,
  },
  'response': {
    '200': {
      'operationId': 'stations__MIA__changeStateMany__MIA__response.200',
      'type': 'integer',
      'minimum': 0,
      'description': 'Number of updated stations',
    },
  },
}
