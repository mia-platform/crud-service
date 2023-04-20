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
  'summary': 'Update the items of the books collection that match the query.',
  'tags': [
    'Books Endpoint',
  ],
  'querystring': {
    'operationId': 'books__MIA__patchMany__MIA__querystring',
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
      '_q': {
        'type': 'string',
        'description': 'Additional query part to forward to MongoDB',
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
  'body': {
    'operationId': 'books__MIA__patchMany__MIA__body',
    'type': 'object',
    'properties': {
      '$set': {
        'type': 'object',
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
          'tags.$.replace': {
            'type': 'string',
          },
          'tagIds.$.replace': {
            'type': 'number',
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
            'additionalProperties': true,
          },
          'editionsDates.$.replace': {
            'type': 'object',
            'additionalProperties': true,
          },
          'editionsDates.$.merge': {
            'type': 'object',
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
          'metadata\\.exampleArrayOfArray\\.\\d+\\.\\$\\.replace$': {
            'type': 'string',
          },
          'attachments\\.\\d+\\.neastedArr\\.\\$\\.replace$': {
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
          'attachments\\.\\d+\\.neastedArr\\.\\d+$': {
            'type': 'number',
          },
          'attachments\\.\\d+\\.size$': {
            'type': 'number',
          },
          'attachments\\.\\d+\\.stuff$': {
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
          'attachments\\.\\d+\\.neastedArr\\.\\d+$': {
            'type': 'number',
          },
          'attachments\\.\\d+\\.size$': {
            'type': 'number',
          },
          'attachments\\.\\d+\\.stuff$': {
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
            'type': 'string',
          },
          'tagIds': {
            'type': 'number',
          },
          'attachments': {
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
          'editionsDates': {
            'type': 'object',
            'additionalProperties': true,
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
          'metadata\\.exampleArrayOfArray\\.\\d+$': {
            'type': 'string',
          },
          'attachments\\.\\d+\\.neastedArr$': {
            'type': 'number',
          },
          'attachments\\.\\d+\\.more$': {
            'type': 'string',
          },
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
                'patternProperties': {
                  '^$': {},
                },
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
                'patternProperties': {
                  '^$': {},
                },
              },
            ],
          },
          'attachments': {
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
          'editionsDates': {
            'type': 'object',
            'additionalProperties': true,
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
          'metadata\\.exampleArrayOfArray\\.\\d+$': {
            'oneOf': [
              {
                'type': 'string',
              },
              {
                'type': 'object',
                'patternProperties': {
                  '^$': {},
                },
              },
            ],
          },
          'attachments\\.\\d+\\.neastedArr$': {
            'oneOf': [
              {
                'type': 'number',
              },
              {
                'type': 'object',
                'patternProperties': {
                  '^$': {},
                },
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
                'patternProperties': {
                  '^$': {},
                },
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
                'patternProperties': {
                  '^$': {},
                },
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
                'patternProperties': {
                  '^$': {},
                },
              },
            ],
          },
          'attachments': {
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
          'editionsDates': {
            'type': 'object',
            'additionalProperties': true,
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
          'metadata\\.exampleArrayOfArray\\.\\d+$': {
            'oneOf': [
              {
                'type': 'string',
              },
              {
                'type': 'object',
                'patternProperties': {
                  '^$': {},
                },
              },
            ],
          },
          'attachments\\.\\d+\\.neastedArr$': {
            'oneOf': [
              {
                'type': 'number',
              },
              {
                'type': 'object',
                'patternProperties': {
                  '^$': {},
                },
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
                'patternProperties': {
                  '^$': {},
                },
              },
            ],
          },
        },
        'additionalProperties': false,
      },
    },
    'additionalProperties': false,
  },
  'response': {
    '200': {
      'operationId': 'books__MIA__patchMany__MIA__response.200',
      'type': 'number',
      'description': 'the number of documents that were modified',
    },
  },
}
