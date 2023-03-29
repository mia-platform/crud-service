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
  'summary': 'Update the item with specific ID in the restaurants collection.',
  'tags': [
    'Restaurants Endpoint',
  ],
  'params': {
    'properties': {
      'id': {
        'type': 'string',
        'description': 'The ID of the item to update information for',
      },
    },
    'type': 'object',
    'operationId': 'restaurants__MIA__patchItem__MIA__params',
  },
  'querystring': {
    'operationId': 'restaurants__MIA__patchItem__MIA__querystring',
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
        'pattern': '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$',
        'description': '"date-time" according with https://tools.ietf.org/html/rfc3339#section-5.6',
        'examples': [
          '2020-09-16T12:00:00.000Z',
        ],
      },
      'updaterId': {
        'type': 'string',
      },
      'updatedAt': {
        'type': 'string',
        'pattern': '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$',
        'description': '"date-time" according with https://tools.ietf.org/html/rfc3339#section-5.6',
        'examples': [
          '2020-09-16T12:00:00.000Z',
        ],
      },
      'name': {
        'type': 'string',
      },
      'openedAt': {
        'type': 'string',
        'pattern': '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$',
        'description': '"date-time" according with https://tools.ietf.org/html/rfc3339#section-5.6',
        'examples': [
          '2020-09-16T12:00:00.000Z',
        ],
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
    'operationId': 'restaurants__MIA__patchItem__MIA__body',
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
            'type': 'array',
            'items': {
              'type': 'number',
            },
            'minItems': 2,
            'maxItems': 3,
          },
          'openedAt': {
            'type': 'string',
            'pattern': '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$',
            'description': '"date-time" according with https://tools.ietf.org/html/rfc3339#section-5.6',
            'examples': [
              '2020-09-16T12:00:00.000Z',
            ],
          },
          'ingredients.$.replace': {
            'type': 'array',
          },
          'type': {
            'type': 'string',
          },
        },
        'additionalProperties': false,
        'patternProperties': {
          'location.': true,
          'coordinates\\.\\d+$': {
            'type': 'number',
          },
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
          'coordinates\\.\\d+$': {
            'type': 'number',
          },
        },
      },
      '$mul': {
        'type': 'object',
        'properties': {},
        'additionalProperties': false,
        'patternProperties': {
          'location.': true,
          'coordinates\\.\\d+$': {
            'type': 'number',
          },
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
            'type': 'array',
          },
        },
        'additionalProperties': false,
      },
      '$addToSet': {
        'type': 'object',
        'properties': {
          'ingredients': {
            'type': 'array',
          },
        },
        'additionalProperties': false,
      },
    },
    'additionalProperties': false,
  },
  'response': {
    '200': {
      'operationId': 'restaurants__MIA__patchItem__MIA__response.200',
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
          'format': 'date-time',
          'examples': [
            '2020-09-16T12:00:00.000Z',
          ],
        },
        'updaterId': {
          'type': 'string',
          'nullable': false,
        },
        'updatedAt': {
          'type': 'string',
          'format': 'date-time',
          'examples': [
            '2020-09-16T12:00:00.000Z',
          ],
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
          'type': 'array',
          'items': {
            'type': 'number',
          },
        },
        'openedAt': {
          'type': 'string',
          'format': 'date-time',
          'examples': [
            '2020-09-16T12:00:00.000Z',
          ],
        },
      },
    },
  },
}
