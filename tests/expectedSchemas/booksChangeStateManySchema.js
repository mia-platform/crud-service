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
  'summary': 'Change state of multiple items of books.',
  'tags': [
    'Books Endpoint',
  ],
  'body': {
    'operationId': 'books__MIA__changeStateMany__MIA__body',
    'type': 'array',
    'items': {
      'type': 'object',
      'properties': {
        'filter': {
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
            'name': {
              'type': 'string',
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
            },
            'additionalInfo': {
              'type': 'object',
              'additionalProperties': true,
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
            'signature.name': {
              'type': 'string',
            },
            'metadata.somethingString': {
              'type': 'string',
            },
            'metadata.somethingNumber': {
              'type': 'number',
            },
            'metadata.somethingArrayObject': {
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
            'metadata.somethingObject': {
              'type': 'object',
              'properties': {
                'childNumber': {
                  'type': 'number',
                },
              },
              'additionalProperties': true,
            },
            'metadata.somethingObject.childNumber': {
              'type': 'number',
            },
            'metadata.somethingArrayOfNumbers': {
              'type': 'array',
              'items': {
                'type': 'number',
              },
            },
            'metadata.exampleArrayOfArray': {
              'type': 'array',
              'items': {
                'type': 'array',
                'items': {
                  'type': 'string',
                },
              },
            },
          },
          'patternProperties': {
            'metadata\\.somethingArrayObject\\.\\d+$': {
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
            'metadata\\.somethingArrayObject\\.\\d+\\..+$': true,
            'metadata\\.somethingArrayObject\\.\\d+\\.arrayItemObjectChildNumber$': {
              'type': 'number',
            },
            'metadata\\.somethingArrayObject\\.\\d+\\.anotherNumber$': {
              'type': 'number',
            },
            'metadata\\.somethingArrayObject\\.\\d+\\.anotherObject$': {
              'type': 'object',
              'nullable': true,
            },
            'metadata\\.somethingObject\\..+$': true,
            'metadata\\.somethingArrayOfNumbers\\.\\d+$': {
              'type': 'number',
            },
            'metadata\\.exampleArrayOfArray\\.\\d+$': {
              'type': 'array',
              'items': {
                'type': 'string',
              },
            },
            'metadata\\.exampleArrayOfArray\\.\\d+\\.\\d+$': {
              'type': 'string',
            },
            'attachments\\.\\d+$': {
              'type': 'object',
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
            },
            'attachments\\.\\d+\\.name$': {
              'type': 'string',
            },
            'attachments\\.\\d+\\.detail$': {
              'type': 'object',
              'properties': {
                'size': {
                  'type': 'number',
                },
              },
            },
            'attachments\\.\\d+\\.detail\\.size$': {
              'type': 'number',
            },
            'attachments\\.\\d+\\.neastedArr$': {
              'type': 'array',
              'items': {
                'type': 'number',
              },
            },
            'attachments\\.\\d+\\.neastedArr\\.\\d+$': {
              'type': 'number',
            },
            'attachments\\.\\d+\\.additionalInfo$': {
              'type': 'object',
              'additionalProperties': true,
            },
            'attachments\\.\\d+\\.additionalInfo\\..+$': true,
            'attachments\\.\\d+\\.other$': {
              'type': 'string',
            },
            'attachments\\.\\d+\\.size$': {
              'type': 'number',
            },
            'attachments\\.\\d+\\.stuff$': {
              'type': 'number',
            },
            'attachments\\.\\d+\\.more$': {
              'type': 'array',
              'items': {
                'type': 'string',
              },
            },
            'attachments\\.\\d+\\.more\\.\\d+$': {
              'type': 'string',
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
      'operationId': 'books__MIA__changeStateMany__MIA__response.200',
      'type': 'integer',
      'minimum': 0,
      'description': 'Number of updated books',
    },
  },
}
