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
  'summary': 'Returns a list of documents in restaurants',
  'description': 'Results can be filtered specifying the following parameters:',
  'tags': [
    'Restaurants Endpoint',
  ],
  'querystring': {
    'operationId': 'restaurants__MIA__getList__MIA__querystring',
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
      '_p': {
        'type': 'string',
        'description': 'Return only the properties specified in a comma separated list',
        'examples': [
          'field1,field2,field3.nestedField',
        ],
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
      '_l': {
        'type': 'integer',
        'minimum': 1,
        'description': 'Limits the number of documents, max 200 elements, minimum 1',
        'default': 25,
        'maximum': 200,
      },
      '_sk': {
        'type': 'integer',
        'minimum': 0,
        'description': 'Skip the specified number of documents',
      },
      '_q': {
        'type': 'string',
        'description': 'Additional query part to forward to MongoDB',
      },
      '_s': {
        'anyOf': [
          {
            'type': 'string',
            'pattern': '^-?(_id|__STATE__|creatorId|createdAt|updaterId|updatedAt|ingredients|name|location|openedAt)(\\.([^\\.,])+)*(,-?(_id|__STATE__|creatorId|createdAt|updaterId|updatedAt|ingredients|name|location|openedAt)(\\.([^\\.,])+)*)*$',
          },
          {
            'type': 'array',
            'items': {
              'type': 'string',
              'pattern': '^-?(_id|__STATE__|creatorId|createdAt|updaterId|updatedAt|ingredients|name|location|openedAt)(\\.([^\\.,])+)*(,-?(_id|__STATE__|creatorId|createdAt|updaterId|updatedAt|ingredients|name|location|openedAt)(\\.([^\\.,])+)*)*$',
            },
          },
        ],
        'description': 'Sort by the specified property/properties (Start with a "-" to invert the sort order)',
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
  'response': {
    '200': {
      'operationId': 'restaurants__MIA__getList__MIA__response.200',
      'type': 'array',
      'items': {
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
  },
}
