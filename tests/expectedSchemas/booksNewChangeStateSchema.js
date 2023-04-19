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
  'summary': 'Change state of an item of books collection.',
  'tags': [
    'Books Endpoint',
  ],
  'params': {
    'operationId': 'books__MIA__changeState__MIA__params',
    'properties': {
      'id': {
        'type': 'string',
        'description': 'the ID of the item to have the property __STATE__ updated',
      },
    },
    'type': 'object',
  },
  'querystring': {
    'operationId': 'books__MIA__changeState__MIA__querystring',
    'type': 'object',
    'properties': {
      'creatorId': {
        'type': 'string',
        'description': 'User id that has created this object',
      },
      'createdAt': {
        'type': 'string',
        'description': 'Date of the request that has performed the object creation',
        'examples': [
          '2020-09-16T12:00:00.000Z',
        ],
        'format': 'date-time',
      },
      'updaterId': {
        'type': 'string',
        'description': 'User id that has requested the last change successfully',
      },
      'updatedAt': {
        'type': 'string',
        'description': 'Date of the request that has performed the last change',
        'examples': [
          '2020-09-16T12:00:00.000Z',
        ],
        'format': 'date-time',
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
        'description': 'The date it was published',
        'examples': [
          '2020-09-16T12:00:00.000Z',
        ],
        'format': 'date-time',
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
    'operationId': 'books__MIA__changeState__MIA__body',
    'type': 'object',
    'required': [
      'stateTo',
    ],
    'properties': {
      'stateTo': {
        'type': 'string',
        'enum': [
          'PUBLIC',
          'TRASH',
          'DRAFT',
          'DELETED',
        ],
      },
    },
  },
}
