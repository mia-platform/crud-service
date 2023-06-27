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
  'summary': 'Returns a list of documents in books',
  'description': 'Results can be filtered specifying the following parameters:',
  'tags': [
    'Books Endpoint',
    'example',
    'tags',
  ],
  'querystring': {
    'operationId': 'books__MIA__getListLookup__MIA__querystring',
    'type': 'object',
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
      '_q': {
        'type': 'string',
        'description': 'Additional query part to forward to MongoDB',
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
      '_s': {
        'anyOf': [
          {
            'type': 'string',
            'pattern': '^-?(_id|updaterId|updatedAt|creatorId|createdAt|__STATE__|name|isbn|price|author|authorAddressId|isPromoted|publishDate|tags|tagIds|additionalInfo|signature|metadata|attachments|editionsDates)(\\.([^\\.,])+)*(,-?(_id|updaterId|updatedAt|creatorId|createdAt|__STATE__|name|isbn|price|author|authorAddressId|isPromoted|publishDate|tags|tagIds|additionalInfo|signature|metadata|attachments|editionsDates)(\\.([^\\.,])+)*)*$',
          },
          {
            'type': 'array',
            'items': {
              'type': 'string',
              'pattern': '^-?(_id|updaterId|updatedAt|creatorId|createdAt|__STATE__|name|isbn|price|author|authorAddressId|isPromoted|publishDate|tags|tagIds|additionalInfo|signature|metadata|attachments|editionsDates)(\\.([^\\.,])+)*(,-?(_id|updaterId|updatedAt|creatorId|createdAt|__STATE__|name|isbn|price|author|authorAddressId|isPromoted|publishDate|tags|tagIds|additionalInfo|signature|metadata|attachments|editionsDates)(\\.([^\\.,])+)*)*$',
            },
          },
        ],
        'description': 'Sort by the specified property/properties (Start with a "-" to invert the sort order)',
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
      'metadata.somethingObject.childNumber': {
        'type': 'number',
      },
      'metadata.somethingArrayOfNumbers': {
        'type': 'number',
      },
    },
    'patternProperties': {
      'metadata\\.somethingArrayObject\\.\\d+\\..+$': true,
      'metadata\\.somethingArrayObject\\.\\d+\\.arrayItemObjectChildNumber$': {
        'type': 'number',
      },
      'metadata\\.somethingArrayObject\\.\\d+\\.anotherNumber$': {
        'type': 'number',
      },
      'metadata\\.somethingObject\\..+$': true,
      'metadata\\.somethingArrayOfNumbers\\.\\d+$': {
        'type': 'number',
      },
      'metadata\\.exampleArrayOfArray\\.\\d+$': {
        'type': 'string',
      },
      'metadata\\.exampleArrayOfArray\\.\\d+\\.\\d+$': {
        'type': 'string',
      },
      'attachments\\.\\d+\\.name$': {
        'type': 'string',
      },
      'attachments\\.\\d+\\.detail\\.size$': {
        'type': 'number',
      },
      'attachments\\.\\d+\\.neastedArr$': {
        'type': 'number',
      },
      'attachments\\.\\d+\\.neastedArr\\.\\d+$': {
        'type': 'number',
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
        'type': 'string',
      },
      'attachments\\.\\d+\\.more\\.\\d+$': {
        'type': 'string',
      },
    },
    'additionalProperties': false,
  },
  'response': {
    '200': {
      'operationId': 'books__MIA__getListLookup__MIA__response.200',
      'type': 'array',
      'items': {
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
          '__STATE__': {
            'type': 'string',
            'description': 'The state of the document',
          },
          'creatorId': {
            'type': 'string',
            'description': 'User id that has created this object',
          },
          'createdAt': {
            'type': [
              'string',
              'object',
            ],
            'anyOf': [
              {
                'type': 'string',
                'format': 'date-time',
                'examples': [
                  '1997-04-24T07:00:00.000Z',
                ],
              },
              {
                'type': 'object',
                'instanceof': 'Date',
              },
              {
                'type': 'string',
              },
            ],
            'description': 'Date of the request that has performed the object creation',
          },
          'updaterId': {
            'type': 'string',
            'description': 'User id that has requested the last change successfully',
          },
          'updatedAt': {
            'type': [
              'string',
              'object',
            ],
            'anyOf': [
              {
                'type': 'string',
                'format': 'date-time',
                'examples': [
                  '1997-04-24T07:00:00.000Z',
                ],
              },
              {
                'type': 'object',
                'instanceof': 'Date',
              },
              {
                'type': 'string',
              },
            ],
            'description': 'Date of the request that has performed the last change',
          },
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
                'format': 'date-time',
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
              {
                'type': 'string',
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
        },
      },
    },
  },
}
