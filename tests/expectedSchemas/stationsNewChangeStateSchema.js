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
  'summary': 'Change state of an item of stations collection.',
  'tags': [
    'Stations Endpoint',
  ],
  'params': {
    'operationId': 'stations__MIA__changeState__MIA__params',
    'properties': {
      'id': {
        'type': 'string',
        'description': 'the ID of the item to have the property __STATE__ updated',
      },
    },
    'type': 'object',
  },
  'querystring': {
    'operationId': 'stations__MIA__changeState__MIA__querystring',
    'type': 'object',
    'properties': {
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
            'examples': [
              '1997-04-24T07:00:00.000Z',
            ],
            'format': 'date-time',
          },
          {
            'type': 'object',
            'instanceof': 'Date',
          },
        ],
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
            'examples': [
              '1997-04-24T07:00:00.000Z',
            ],
            'format': 'date-time',
          },
          {
            'type': 'object',
            'instanceof': 'Date',
          },
        ],
      },
      'Cap': {
        'type': 'number',
        'nullable': true,
      },
      'CodiceMIR': {
        'type': 'string',
        'nullable': true,
      },
      'Comune': {
        'type': 'string',
        'nullable': true,
      },
      'Direttrici': {
        'type': [
          'array',
          'null',
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
          {
            'type': 'null',
            'nullable': true,
          },
        ],
        'nullable': true,
      },
      'Indirizzo': {
        'type': 'string',
        'nullable': true,
      },
      'country': {
        'type': 'string',
        'nullable': true,
      },
      'nonNullableDate': {
        'type': [
          'string',
          'object',
        ],
        'anyOf': [
          {
            'type': 'string',
            'examples': [
              '1997-04-24T07:00:00.000Z',
            ],
            'format': 'date-time',
          },
          {
            'type': 'object',
            'instanceof': 'Date',
          },
        ],
      },
      '_q': {
        'type': 'string',
        'description': 'Additional query part to forward to MongoDB',
      },
      '_rawp': {
        'type': 'string',
        'description': 'Additional raw stringified projection for MongoDB',
      },
    },
    'additionalProperties': false,
  },
  'body': {
    'operationId': 'stations__MIA__changeState__MIA__body',
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
