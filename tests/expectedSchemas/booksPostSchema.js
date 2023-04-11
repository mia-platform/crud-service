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
  'summary': 'Add a new item to the books collection.',
  'tags': [
    'Books Endpoint',
  ],
  'body': {
    'operationId': 'books__MIA__postItem__MIA__body',
    'type': 'object',
    'required': [
      'name',
      'isbn',
    ],
    'properties': {
      'name': {
        'type': 'string',
        'nullable': true,
        'description': 'The name of the book',
      },
      'isbn': {
        'type': 'string',
        'description': 'The isbn code',
      },
      'price': {
        'type': 'number',
        'description': 'The price of the book',
      },
      'author': {
        'type': 'string',
        'description': 'The author of the book',
      },
      'authorAddressId': {
        'type': 'string',
        'pattern': '^[a-fA-F\\d]{24}$',
        'description': 'The address of the author',
        'examples': [
          '000000000000000000000000',
        ],
      },
      'isPromoted': {
        'type': 'boolean',
        'description': "If it's in promotion",
      },
      'publishDate': {
        'type': 'string',
        'pattern': '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$',
        'description': 'The date it was published',
        'examples': [
          '2020-09-16T12:00:00.000Z',
        ],
        'nullable': true,
      },
      'position': {
        'type': 'array',
        'items': {
          'type': 'number',
        },
        'minItems': 2,
        'maxItems': 3,
        'description': 'The position of the book',
      },
      'tags': {
        'type': 'array',
        'items': {
          'type': 'string',
        },
        'description': 'Tags',
      },
      'tagIds': {
        'type': 'array',
        'items': {
          'type': 'number',
        },
        'description': 'Tag identification numbers',
      },
      'additionalInfo': {
        'type': 'object',
        'additionalProperties': true,
        'nullable': true,
      },
      'signature': {
        'type': 'object',
        'additionalProperties': true,
        'properties': {
          'name': {
            'type': 'string',
          },
        },
        'required': [
          'name',
        ],
        'nullable': true,
      },
      'metadata': {
        'type': 'object',
        'additionalProperties': false,
        'properties': {
          'somethingString': {
            'type': 'string',
          },
          'somethingNumber': {
            'type': 'number',
          },
          'somethingArrayObject': {
            'type': 'array',
            'items': {
              'type': 'object',
              'properties': {
                'arrayItemObjectChildNumber': {
                  'type': 'number',
                },
                'anotherNumber': {
                  'type': 'number',
                },
                'anotherObject': {
                  'type': 'object',
                  'nullable': true,
                },
              },
              'additionalProperties': true,
              'required': [
                'arrayItemObjectChildNumber',
              ],
            },
          },
          'somethingObject': {
            'type': 'object',
            'properties': {
              'childNumber': {
                'type': 'number',
              },
            },
            'additionalProperties': true,
          },
          'somethingArrayOfNumbers': {
            'type': 'array',
            'items': {
              'type': 'number',
            },
          },
          'exampleArrayOfArray': {
            'type': 'array',
            'items': {
              'type': 'array',
              'items': {
                'type': 'string',
              },
            },
          },
        },
        'required': [
          'somethingNumber',
        ],
      },
      'attachments': {
        'type': 'array',
        'items': {
          'type': 'object',
          'additionalProperties': false,
          'properties': {
            'name': {
              'type': 'string',
            },
            'detail': {
              'type': 'object',
              'properties': {
                'size': {
                  'type': 'number',
                },
              },
            },
            'neastedArr': {
              'type': 'array',
              'items': {
                'type': 'number',
              },
            },
            'additionalInfo': {
              'type': 'object',
              'additionalProperties': true,
            },
            'other': {
              'type': 'string',
            },
            'size': {
              'type': 'number',
            },
            'stuff': {
              'type': 'number',
            },
            'more': {
              'type': 'array',
              'items': {
                'type': 'string',
              },
            },
          },
          'required': [
            'name',
          ],
        },
      },
      'editionsDates': {
        'type': 'array',
        'items': {
          'type': 'object',
          'additionalProperties': true,
        },
        'nullable': true,
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
        'default': 'DRAFT',
      },
    },
    'additionalProperties': false,
  },
  'response': {
    '200': {
      'operationId': 'books__MIA__postItem__MIA__response.200',
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
}
