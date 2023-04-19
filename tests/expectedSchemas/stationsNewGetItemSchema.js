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
  'summary': 'Returns the item with specific ID from the stations collection.',
  'tags': [
    'Stations Endpoint',
  ],
  'params': {
    'type': 'object',
    'properties': {
      'id': {
        'type': 'string',
        'description': 'The ID of the item to retrieve information for',
      },
    },
    'operationId': 'stations__MIA__getItem__MIA__params',
  },
  'querystring': {
    'operationId': 'stations__MIA__getItem__MIA__querystring',
    'type': 'object',
    'properties': {
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
      'Cap': {
        'type': 'number',
      },
      'CodiceMIR': {
        'type': 'string',
      },
      'Comune': {
        'type': 'string',
      },
      'Indirizzo': {
        'type': 'string',
      },
      'country': {
        'type': 'string',
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
      '_rawp': {
        'type': 'string',
        'description': 'Additional raw stringified projection for MongoDB',
      },
    },
    'additionalProperties': false,
  },
  'response': {
    '200': {
      'operationId': 'stations__MIA__getItem__MIA__response.200',
      'type': 'object',
      'properties': {
        '_id': {
          'type': 'string',
          'description': '_id',
        },
        'updaterId': {
          'type': 'string',
          'description': 'User id that has requested the last change successfully',
        },
        'updatedAt': {
          'type': 'string',
          'format': 'date-time',
          'examples': [
            '2020-09-16T12:00:00.000Z',
          ],
          'description': 'Date of the request that has performed the last change',
        },
        'creatorId': {
          'type': 'string',
          'description': 'User id that has created this object',
        },
        'createdAt': {
          'type': 'string',
          'format': 'date-time',
          'examples': [
            '2020-09-16T12:00:00.000Z',
          ],
          'description': 'Date of the request that has performed the object creation',
        },
        '__STATE__': {
          'type': 'string',
          'description': 'The state of the document',
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
          'type': 'array',
          'items': {
            'type': 'string',
          },
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
      },
    },
  },
}
