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
  'summary': 'Update an item in the restaurants collection. If the item is not in the collection, it will be inserted.',
  'tags': [
    'Restaurants Endpoint',
  ],
  'querystring': {
    'operationId': 'restaurants__MIA__upsertOne__MIA__querystring',
    'type': 'object',
    'properties': {
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
    'operationId': 'restaurants__MIA__upsertOne__MIA__body',
    'type': 'object',
    'properties': {
      '$set': {
        'type': 'object',
        'properties': {
          'ingredients': {
            'type': 'array',
            'nullable': true,
          },
          'name': {
            'type': 'string',
            'nullable': false,
          },
          'location': {
            'type': 'object',
            'nullable': true,
          },
          'openedAt': {
            'type': 'string',
            'nullable': true,
          },
          'ingredients.$.replace': {
            'type': 'string',
          },
        },
        'additionalProperties': false,
        'patternProperties': {
          'location.': true,
        },
      },
      '$unset': {
        'type': 'object',
        'properties': {
          'ingredients': {
            'type': 'boolean',
            'enum': [
              true,
            ],
          },
          'location': {
            'type': 'boolean',
            'enum': [
              true,
            ],
          },
          'openedAt': {
            'type': 'boolean',
            'enum': [
              true,
            ],
          },
        },
        'additionalProperties': false,
        'patternProperties': {
          'location.': true,
          '^location\\..+': {
            'type': 'boolean',
            'enum': [
              true,
            ],
          },
        },
      },
      '$inc': {
        'type': 'object',
        'properties': {},
        'additionalProperties': false,
        'patternProperties': {
          'location.': true,
        },
      },
      '$mul': {
        'type': 'object',
        'properties': {},
        'additionalProperties': false,
        'patternProperties': {
          'location.': true,
        },
      },
      '$currentDate': {
        'type': 'object',
        'properties': {
          'openedAt': {
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
          'ingredients': {
            'type': 'string',
          },
        },
        'additionalProperties': false,
      },
      '$addToSet': {
        'type': 'object',
        'properties': {
          'ingredients': {
            'type': 'string',
          },
        },
        'additionalProperties': false,
      },
      '$setOnInsert': {
        'type': 'object',
        'properties': {
          'ingredients': {
            'type': 'array',
            'nullable': true,
          },
          'name': {
            'type': 'string',
            'nullable': false,
          },
          'location': {
            'type': 'object',
            'nullable': true,
          },
          'openedAt': {
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
      'operationId': 'restaurants__MIA__upsertOne__MIA__response.200',
      'type': 'object',
      'properties': {
        '_id': {
          'type': 'string',
          'nullable': false,
        },
        '__STATE__': {
          'type': 'string',
          'nullable': false,
        },
        'creatorId': {
          'type': 'string',
          'nullable': false,
        },
        'createdAt': {
          'type': 'string',
          'nullable': false,
        },
        'updaterId': {
          'type': 'string',
          'nullable': false,
        },
        'updatedAt': {
          'type': 'string',
          'nullable': false,
        },
        'ingredients': {
          'type': 'array',
          'nullable': true,
        },
        'name': {
          'type': 'string',
          'nullable': false,
        },
        'location': {
          'type': 'object',
          'nullable': true,
        },
        'openedAt': {
          'type': 'string',
          'nullable': true,
        },
      },
    },
  },
}
