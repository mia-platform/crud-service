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
    'example',
    'tags',
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
        'description': 'The name of the book',
        'nullable': true,
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
        'type': [
          'string',
          'object',
        ],
        'description': 'The address of the author',
        'anyOf': [
          {
            'type': 'string',
            'pattern': '^[a-fA-F\\d]{24}$',
            'examples': [
              '000000000000000000000000',
            ],
          },
          {
            'type': 'object',
          },
        ],
      },
      'isPromoted': {
        'type': 'boolean',
        'description': "If it's in promotion",
      },
      'publishDate': {
        'type': [
          'string',
          'null',
          'object',
        ],
        'anyOf': [
          {
            'type': 'string',
            'pattern': '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$',
            'description': '"date-time" according with https://tools.ietf.org/html/rfc3339#section-5.6',
            'examples': [
              '1997-04-24T07:00:00.000Z',
            ],
          },
          {
            'type': 'null',
            'nullable': true,
          },
          {
            'type': 'object',
            'instanceof': 'Date',
          },
        ],
        'description': 'The date it was published',
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
        'type': [
          'array',
          'string',
        ],
        'anyOf': [
          {
            'type': 'array',
            'items': {
              'type': 'string',
            },
          },
          {
            'type': 'string',
          },
        ],
        'description': 'Tags',
      },
      'tagIds': {
        'type': [
          'array',
          'number',
        ],
        'anyOf': [
          {
            'type': 'array',
            'items': {
              'type': 'number',
            },
          },
          {
            'type': 'number',
          },
        ],
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
        'type': [
          'array',
          'null',
          'object',
        ],
        'anyOf': [
          {
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
          {
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
          {
            'type': 'null',
            'nullable': true,
          },
        ],
        'nullable': true,
      },
      'editionsDates': {
        'type': [
          'array',
          'null',
          'object',
        ],
        'anyOf': [
          {
            'type': 'array',
            'items': {
              'type': 'object',
              'additionalProperties': true,
            },
          },
          {
            'type': 'object',
            'additionalProperties': true,
          },
          {
            'type': 'null',
            'nullable': true,
          },
        ],
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
          'type': [
            'string',
            'object',
          ],
          'description': 'Hexadecimal identifier of the document in the collection',
          'anyOf': [
            {
              'type': 'string',
              'pattern': '^[a-fA-F\\d]{24}$',
              'examples': [
                '000000000000000000000000',
              ],
            },
            {
              'type': 'object',
            },
          ],
        },
      },
    },
  },
}
