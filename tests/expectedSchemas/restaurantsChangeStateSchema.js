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
  'summary': 'Change state of an item of restaurants collection.',
  'tags': [
    'Restaurants Endpoint',
  ],
  'params': {
    'operationId': 'restaurants__MIA__changeState__MIA__params',
    'properties': {
      'id': {
        'type': 'string',
        'description': 'the ID of the item to have the property __STATE__ updated',
      },
    },
    'type': 'object',
  },
  'querystring': {
    'operationId': 'restaurants__MIA__changeState__MIA__querystring',
    'type': 'object',
    'properties': {
      '_rawp': {
        'type': 'string',
        'description': 'Additional raw stringified projection for MongoDB',
      },
      'creatorId': {
        'type': 'string',
      },
      'createdAt': {
        'type': 'string',
      },
      'updaterId': {
        'type': 'string',
      },
      'updatedAt': {
        'type': 'string',
      },
      'ingredients': {
        'type': 'array',
      },
      'name': {
        'type': 'string',
      },
      'location': {
        'type': 'object',
      },
      'openedAt': {
        'type': 'string',
      },
      'type': {
        'type': 'string',
      },
    },
    'patternProperties': {
      'coordinates\\.\\d+$': {
        'type': 'number',
      },
    },
    'additionalProperties': false,
  },
  'body': {
    'operationId': 'restaurants__MIA__changeState__MIA__body',
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
