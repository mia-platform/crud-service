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
  'summary': 'Update multiple items of books, each one with its own modifications',
  'tags': [
    'books endpoint',
    'Library',
  ],
  'body': {
    'operationId': 'books__MIA__patchBulk__MIA__body',
    'type': 'array',
    'items': {
      'type': 'object',
      'properties': {
        'filter': {
          'type': 'object',
          'properties': {
            '_id': {
              'type': 'string',
              'description': 'Hexadecimal identifier of the document in the collection',
              'pattern': '^[a-fA-F\\d]{24}$',
              'example': '000000000000000000000000',
            },
            '_st': {
              'type': 'string',
              'pattern': '(PUBLIC|DRAFT|TRASH|DELETED)(,(PUBLIC|DRAFT|TRASH|DELETED))*',
              'default': 'PUBLIC',
              'description': 'Filter by \\_\\_STATE__, multiple states can be specified in OR by providing a comma separated list',
            },
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
              'example': '1997-04-24T07:00:00.000Z',
              'type': 'string',
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
              'description': 'The date it was published',
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
            'metadata.somethingArrayObject': {
              'oneOf': [
                {
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
                {
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
              ],
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
              'oneOf': [
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
            },
            'metadata.exampleArrayOfArray': {
              'oneOf': [
                {
                  'type': 'array',
                  'items': {
                    'type': 'array',
                    'items': {
                      'type': 'string',
                    },
                  },
                },
                {
                  'type': 'array',
                  'items': {
                    'type': 'string',
                  },
                },
              ],
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
              'oneOf': [
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
              'additionalProperties': false,
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
            'attachments\\.\\d+\\.nestedArr$': {
              'oneOf': [
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
            },
            'attachments\\.\\d+\\.nestedArr\\.\\d+$': {
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
              'oneOf': [
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
            },
            'attachments\\.\\d+\\.more\\.\\d+$': {
              'type': 'string',
            },
            'editionsDates\\.\\d+$': {
              'type': 'object',
              'properties': {
                'edition': {
                  'type': 'number',
                },
                'date': {
                  'type': 'string',
                  'format': 'date-time',
                },
              },
              'additionalProperties': true,
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
        'update': {
          'type': 'object',
          'properties': {
            '$set': {
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
                  'example': '1997-04-24T07:00:00.000Z',
                  'type': 'string',
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
                  'description': 'The date it was published',
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
                'tags.$.replace': {
                  'type': 'string',
                },
                'tagIds.$.replace': {
                  'type': 'number',
                },
                'tagObjectIds.$.replace': {
                  'type': 'string',
                  'description': 'Hexadecimal identifier of the document in the collection',
                  'pattern': '^[a-fA-F\\d]{24}$',
                  'example': '000000000000000000000000',
                },
                'attachments.$.replace': {
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
                },
                'attachments.$.merge': {
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
                  'additionalProperties': true,
                },
                'editionsDates.$.replace': {
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
                },
                'editionsDates.$.merge': {
                  'type': 'object',
                  'properties': {
                    'edition': {
                      'type': 'number',
                    },
                    'date': {
                      'type': 'string',
                      'format': 'date-time',
                    },
                  },
                  'additionalProperties': true,
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
                'metadata.somethingArrayObject.$.replace': {
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
                'metadata.somethingArrayObject.$.merge': {
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
                },
                'metadata.somethingArrayOfNumbers.$.replace': {
                  'type': 'number',
                },
                'metadata.exampleArrayOfArray.$.replace': {
                  'type': 'array',
                  'items': {
                    'type': 'string',
                  },
                },
              },
              'additionalProperties': false,
              'patternProperties': {
                'additionalInfo.': true,
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
                  'additionalProperties': false,
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
                'attachments\\.\\d+\\.nestedArr$': {
                  'type': 'array',
                  'items': {
                    'type': 'number',
                  },
                },
                'attachments\\.\\d+\\.nestedArr\\.\\d+$': {
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
                'editionsDates\\.\\d+$': {
                  'type': 'object',
                  'properties': {
                    'edition': {
                      'type': 'number',
                    },
                    'date': {
                      'type': 'string',
                      'format': 'date-time',
                    },
                  },
                  'additionalProperties': true,
                },
                'editionsDates\\.\\d+\\..+$': true,
                'editionsDates\\.\\d+\\.edition$': {
                  'type': 'number',
                },
                'editionsDates\\.\\d+\\.date$': {
                  'type': 'string',
                  'format': 'date-time',
                },
                'metadata\\.exampleArrayOfArray\\.\\d+\\.\\$\\.replace$': {
                  'type': 'string',
                },
                'attachments\\.\\d+\\.nestedArr\\.\\$\\.replace$': {
                  'type': 'number',
                },
                'attachments\\.\\d+\\.more\\.\\$\\.replace$': {
                  'type': 'string',
                },
              },
            },
            '$unset': {
              'type': 'object',
              'properties': {
                'price': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
                'author': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
                'authorAddressId': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
                'isPromoted': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
                'publishDate': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
                'position': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
                'tags': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
                'tagIds': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
                'tagObjectIds': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
                'additionalInfo': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
                'signature': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
                'metadata': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
                'attachments': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
                'editionsDates': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
              },
              'additionalProperties': false,
              'patternProperties': {
                'additionalInfo.': true,
                '^signature\\..+': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
                '^metadata\\..+': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
                '^attachments\\..+': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
                '^editionsDates\\..+': {
                  'type': 'boolean',
                  'enum': [
                    true,
                  ],
                },
              },
            },
            '$inc': {
              'type': 'object',
              'properties': {
                'price': {
                  'type': 'number',
                },
                'metadata.somethingNumber': {
                  'type': 'number',
                },
                'metadata.somethingObject.childNumber': {
                  'type': 'number',
                },
              },
              'additionalProperties': false,
              'patternProperties': {
                'additionalInfo.': true,
                'metadata\\.somethingArrayObject\\.\\d+\\.arrayItemObjectChildNumber$': {
                  'type': 'number',
                },
                'metadata\\.somethingArrayObject\\.\\d+\\.anotherNumber$': {
                  'type': 'number',
                },
                'metadata\\.somethingArrayOfNumbers\\.\\d+$': {
                  'type': 'number',
                },
                'attachments\\.\\d+\\.detail\\.size$': {
                  'type': 'number',
                },
                'attachments\\.\\d+\\.nestedArr\\.\\d+$': {
                  'type': 'number',
                },
                'attachments\\.\\d+\\.size$': {
                  'type': 'number',
                },
                'attachments\\.\\d+\\.stuff$': {
                  'type': 'number',
                },
                'editionsDates\\.\\d+\\.edition$': {
                  'type': 'number',
                },
              },
            },
            '$mul': {
              'type': 'object',
              'properties': {
                'price': {
                  'type': 'number',
                },
                'metadata.somethingNumber': {
                  'type': 'number',
                },
                'metadata.somethingObject.childNumber': {
                  'type': 'number',
                },
              },
              'additionalProperties': false,
              'patternProperties': {
                'additionalInfo.': true,
                'metadata\\.somethingArrayObject\\.\\d+\\.arrayItemObjectChildNumber$': {
                  'type': 'number',
                },
                'metadata\\.somethingArrayObject\\.\\d+\\.anotherNumber$': {
                  'type': 'number',
                },
                'metadata\\.somethingArrayOfNumbers\\.\\d+$': {
                  'type': 'number',
                },
                'attachments\\.\\d+\\.detail\\.size$': {
                  'type': 'number',
                },
                'attachments\\.\\d+\\.nestedArr\\.\\d+$': {
                  'type': 'number',
                },
                'attachments\\.\\d+\\.size$': {
                  'type': 'number',
                },
                'attachments\\.\\d+\\.stuff$': {
                  'type': 'number',
                },
                'editionsDates\\.\\d+\\.edition$': {
                  'type': 'number',
                },
              },
            },
            '$currentDate': {
              'type': 'object',
              'properties': {
                'publishDate': {
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
                'tags': {
                  'oneOf': [
                    {
                      'type': 'string',
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'tagIds': {
                  'oneOf': [
                    {
                      'type': 'number',
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'tagObjectIds': {
                  'oneOf': [
                    {
                      'type': 'string',
                      'description': 'Hexadecimal identifier of the document in the collection',
                      'pattern': '^[a-fA-F\\d]{24}$',
                      'example': '000000000000000000000000',
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'attachments': {
                  'oneOf': [
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
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'editionsDates': {
                  'oneOf': [
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
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'metadata.somethingArrayObject': {
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
                'metadata.somethingArrayOfNumbers': {
                  'type': 'number',
                },
                'metadata.exampleArrayOfArray': {
                  'type': 'array',
                  'items': {
                    'type': 'string',
                  },
                },
              },
              'patternProperties': {
                'metadata\\.somethingArrayObject\\.\\d+\\..+$': {},
                'metadata\\.somethingObject\\..+$': {},
                'metadata\\.exampleArrayOfArray\\.\\d+$': {
                  'type': 'string',
                },
                'attachments\\.\\d+\\.nestedArr$': {
                  'type': 'number',
                },
                'attachments\\.\\d+\\.additionalInfo\\..+$': {},
                'attachments\\.\\d+\\.more$': {
                  'type': 'string',
                },
                'editionsDates\\.\\d+\\..+$': {},
              },
              'additionalProperties': false,
            },
            '$pull': {
              'type': 'object',
              'properties': {
                'tags': {
                  'oneOf': [
                    {
                      'type': 'string',
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'tagIds': {
                  'oneOf': [
                    {
                      'type': 'number',
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'tagObjectIds': {
                  'oneOf': [
                    {
                      'type': 'string',
                      'description': 'Hexadecimal identifier of the document in the collection',
                      'pattern': '^[a-fA-F\\d]{24}$',
                      'example': '000000000000000000000000',
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'attachments': {
                  'oneOf': [
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
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'editionsDates': {
                  'oneOf': [
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
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'metadata.somethingArrayObject': {
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
                'metadata.somethingArrayOfNumbers': {
                  'type': 'number',
                },
                'metadata.exampleArrayOfArray': {
                  'type': 'array',
                  'items': {
                    'type': 'string',
                  },
                },
              },
              'patternProperties': {
                'metadata\\.somethingArrayObject\\.\\d+\\..+$': {
                  'oneOf': [
                    {},
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'metadata\\.somethingObject\\..+$': {
                  'oneOf': [
                    {},
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'metadata\\.exampleArrayOfArray\\.\\d+$': {
                  'oneOf': [
                    {
                      'type': 'string',
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'attachments\\.\\d+\\.nestedArr$': {
                  'oneOf': [
                    {
                      'type': 'number',
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'attachments\\.\\d+\\.additionalInfo\\..+$': {
                  'oneOf': [
                    {},
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'attachments\\.\\d+\\.more$': {
                  'oneOf': [
                    {
                      'type': 'string',
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'editionsDates\\.\\d+\\..+$': {
                  'oneOf': [
                    {},
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
              },
              'additionalProperties': false,
            },
            '$addToSet': {
              'type': 'object',
              'properties': {
                'tags': {
                  'oneOf': [
                    {
                      'type': 'string',
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'tagIds': {
                  'oneOf': [
                    {
                      'type': 'number',
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'tagObjectIds': {
                  'oneOf': [
                    {
                      'type': 'string',
                      'description': 'Hexadecimal identifier of the document in the collection',
                      'pattern': '^[a-fA-F\\d]{24}$',
                      'example': '000000000000000000000000',
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'attachments': {
                  'oneOf': [
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
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'editionsDates': {
                  'oneOf': [
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
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'metadata.somethingArrayObject': {
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
                'metadata.somethingArrayOfNumbers': {
                  'type': 'number',
                },
                'metadata.exampleArrayOfArray': {
                  'type': 'array',
                  'items': {
                    'type': 'string',
                  },
                },
              },
              'patternProperties': {
                'metadata\\.somethingArrayObject\\.\\d+\\..+$': {
                  'oneOf': [
                    {},
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'metadata\\.somethingObject\\..+$': {
                  'oneOf': [
                    {},
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'metadata\\.exampleArrayOfArray\\.\\d+$': {
                  'oneOf': [
                    {
                      'type': 'string',
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'attachments\\.\\d+\\.nestedArr$': {
                  'oneOf': [
                    {
                      'type': 'number',
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'attachments\\.\\d+\\.additionalInfo\\..+$': {
                  'oneOf': [
                    {},
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'attachments\\.\\d+\\.more$': {
                  'oneOf': [
                    {
                      'type': 'string',
                    },
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
                'editionsDates\\.\\d+\\..+$': {
                  'oneOf': [
                    {},
                    {
                      'type': 'object',
                      'properties': {
                        '$': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$each': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$position': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$slice': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$sort': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                        '$in': {
                          'oneOf': [
                            {
                              'type': 'object',
                            },
                            {
                              'type': 'array',
                            },
                          ],
                        },
                      },
                      'additionalProperties': false,
                    },
                  ],
                },
              },
              'additionalProperties': false,
            },
          },
          'additionalProperties': false,
        },
      },
      'required': [
        'filter',
        'update',
      ],
    },
    'minItems': 1,
  },
  'response': {
    '200': {
      'operationId': 'books__MIA__patchBulk__MIA__response.200',
      'type': 'integer',
      'minimum': 0,
    },
  },
}
