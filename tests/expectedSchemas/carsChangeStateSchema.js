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
  'summary': 'Change state of an item of cars collection.',
  'tags': [
    'Cars Endpoint',
  ],
  'params': {
    'operationId': 'cars__MIA__changeState__MIA__params',
    'properties': {
      'id': {
        'type': 'string',
        'description': 'the ID of the item to have the property __STATE__ updated',
      },
    },
    'type': 'object',
  },
  'querystring': {
    'operationId': 'cars__MIA__changeState__MIA__querystring',
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
  'body': {
    'operationId': 'cars__MIA__changeState__MIA__body',
    'type': 'object',
    'required': [
      'stateTo',
    ],
    'properties': {
      'stateTo': {
        'type': 'string',
        'enum': [
          'PUBLIC',
          'TRASH',
          'DRAFT',
          'DELETED',
        ],
      },
    },
  },
}
