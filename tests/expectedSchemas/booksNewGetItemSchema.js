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
  'summary': 'Returns the item with specific ID from the books collection.',
  'tags': [
    'books endpoint',
    'Library',
  ],
  'params': {
    'type': 'object',
    'properties': {
      'id': {
        'type': 'string',
        'description': 'The ID of the item to retrieve information for',
      },
    },
    'operationId': 'books__MIA__getItem__MIA__params',
  },
  'querystring': {
    'operationId': 'books__MIA__getItem__MIA__querystring',
    'type': 'object',
    'properties': {
      'creatorId': {
        'type': 'string',
        'description': 'User id that has created this object',
      },
      'createdAt': {
        'type': 'string',
        'example': '1997-04-24T07:00:00.000Z',
        'anyOf': [
          {
            'format': 'date-time',
          },
          {
            'format': 'date',
          },
          {
            'format': 'time',
          },
        ],
      },
      'updaterId': {
        'type': 'string',
        'description': 'User id that has requested the last change successfully',
      },
      'updatedAt': {
        'type': 'string',
        'example': '1997-04-24T07:00:00.000Z',
        'anyOf': [
          {
            'format': 'date-time',
          },
          {
            'format': 'date',
          },
          {
            'format': 'time',
          },
        ],
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
        'type': 'string',
        'description': 'The address of the author',
        'pattern': '^[a-fA-F\\d]{24}$',
        'example': '000000000000000000000000',
      },
      'isPromoted': {
        'type': 'boolean',
        'description': "If it's in promotion",
      },
      'publishDate': {
        'type': 'string',
        'example': '1997-04-24T07:00:00.000Z',
        'description': 'The date it was published',
        'nullable': true,
        'anyOf': [
          {
            'format': 'date-time',
          },
          {
            'format': 'date',
          },
          {
            'format': 'time',
          },
        ],
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
      'tagObjectIds': {
        'type': [
          'array',
          'string',
        ],
        'anyOf': [
          {
            'type': 'array',
            'items': {
              'type': 'string',
              'description': 'Hexadecimal identifier of the document in the collection',
              'pattern': '^[a-fA-F\\d]{24}$',
              'example': '000000000000000000000000',
            },
          },
          {
            'type': 'string',
            'description': 'Hexadecimal identifier of the document in the collection',
            'pattern': '^[a-fA-F\\d]{24}$',
            'example': '000000000000000000000000',
          },
        ],
        'description': 'Tag object ids',
      },
      'attachments': {
        'type': [
          'array',
          'object',
          'null',
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
                'nestedArr': {
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
              'nullable': true,
            },
            'nullable': true,
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
              'nestedArr': {
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
            'nullable': true,
          },
        ],
        'nullable': true,
      },
      'editionsDates': {
        'type': [
          'array',
          'object',
          'null',
        ],
        'anyOf': [
          {
            'type': 'array',
            'items': {
              'type': 'object',
              'additionalProperties': true,
              'properties': {
                'edition': {
                  'type': 'number',
                },
                'date': {
                  'type': 'string',
                  'format': 'date-time',
                },
              },
              'nullable': true,
            },
            'nullable': true,
          },
          {
            'type': 'object',
            'additionalProperties': true,
            'properties': {
              'edition': {
                'type': 'number',
              },
              'date': {
                'type': 'string',
                'format': 'date-time',
              },
            },
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
        'example': 'field1,field2,field3.nestedField',
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
      'additionalInfo.': true,
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
      'attachments\\.\\d+\\.nestedArr$': {
        'type': 'number',
      },
      'attachments\\.\\d+\\.nestedArr\\.\\d+$': {
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
      'editionsDates\\.\\d+\\..+$': true,
      'editionsDates\\.\\d+\\.edition$': {
        'type': 'number',
      },
      'editionsDates\\.\\d+\\.date$': {
        'type': 'string',
        'format': 'date-time',
      },
    },
    'additionalProperties': false,
  },
  'response': {
    '200': {
      'operationId': 'books__MIA__getItem__MIA__response.200',
      'type': 'object',
      'properties': {
        '_id': {
          'type': 'string',
          'description': 'Hexadecimal identifier of the document in the collection',
          'pattern': '^[a-fA-F\\d]{24}$',
          'example': '000000000000000000000000',
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
          'type': 'string',
          'example': '1997-04-24T07:00:00.000Z',
          'nullable': false,
          'description': 'Date of the request that has performed the object creation',
        },
        'updaterId': {
          'type': 'string',
          'description': 'User id that has requested the last change successfully',
        },
        'updatedAt': {
          'type': 'string',
          'example': '1997-04-24T07:00:00.000Z',
          'nullable': false,
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
          'type': 'string',
          'description': 'The address of the author',
          'pattern': '^[a-fA-F\\d]{24}$',
          'example': '000000000000000000000000',
        },
        'isPromoted': {
          'type': 'boolean',
          'description': "If it's in promotion",
        },
        'publishDate': {
          'type': 'string',
          'example': '1997-04-24T07:00:00.000Z',
          'nullable': true,
          'description': 'The date it was published',
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
        'tagObjectIds': {
          'type': [
            'array',
            'string',
          ],
          'anyOf': [
            {
              'type': 'array',
              'items': {
                'type': 'string',
                'description': 'Hexadecimal identifier of the document in the collection',
                'pattern': '^[a-fA-F\\d]{24}$',
                'example': '000000000000000000000000',
              },
            },
            {
              'type': 'string',
              'description': 'Hexadecimal identifier of the document in the collection',
              'pattern': '^[a-fA-F\\d]{24}$',
              'example': '000000000000000000000000',
            },
          ],
          'description': 'Tag object ids',
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
            'object',
            'null',
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
                  'nestedArr': {
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
                'nullable': true,
              },
              'nullable': true,
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
                'nestedArr': {
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
              'nullable': true,
            },
          ],
          'nullable': true,
        },
        'editionsDates': {
          'type': [
            'array',
            'object',
            'null',
          ],
          'anyOf': [
            {
              'type': 'array',
              'items': {
                'type': 'object',
                'additionalProperties': true,
                'properties': {
                  'edition': {
                    'type': 'number',
                  },
                  'date': {
                    'type': 'string',
                    'format': 'date-time',
                  },
                },
                'nullable': true,
              },
              'nullable': true,
            },
            {
              'type': 'object',
              'additionalProperties': true,
              'properties': {
                'edition': {
                  'type': 'number',
                },
                'date': {
                  'type': 'string',
                  'format': 'date-time',
                },
              },
              'nullable': true,
            },
          ],
          'nullable': true,
        },
      },
      'additionalProperties': true,
    },
  },
}
