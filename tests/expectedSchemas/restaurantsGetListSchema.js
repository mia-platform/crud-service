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
    'Restaurants',
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
            'pattern': '^-?(_id|__STATE__|creatorId|createdAt|updaterId|updatedAt|ingredients|location)(\\.([^\\.,])+)*(,-?(_id|__STATE__|creatorId|createdAt|updaterId|updatedAt|ingredients|location)(\\.([^\\.,])+)*)*$',
          },
          {
            'type': 'array',
            'items': {
              'type': 'string',
              'pattern': '^-?(_id|__STATE__|creatorId|createdAt|updaterId|updatedAt|ingredients|location)(\\.([^\\.,])+)*(,-?(_id|__STATE__|creatorId|createdAt|updaterId|updatedAt|ingredients|location)(\\.([^\\.,])+)*)*$',
            },
          },
        ],
        'description': 'Sort by the specified property/properties (Start with a "-" to invert the sort order)',
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
        },
      },
    },
  },
}
