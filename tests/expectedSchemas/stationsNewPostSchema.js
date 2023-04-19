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
  'summary': 'Add a new item to the stations collection.',
  'tags': [
    'Stations Endpoint',
  ],
  'body': {
    'operationId': 'stations__MIA__postItem__MIA__body',
    'type': 'object',
    'properties': {
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
      'operationId': 'stations__MIA__postItem__MIA__response.200',
      'type': 'object',
      'properties': {
        '_id': {
          'type': 'string',
          'pattern': '^(?!\\s*$).+',
          'description': 'String identifier of the document in the collection',
          'examples': [
            '00000000-0000-4000-0000-000000000000',
          ],
        },
      },
    },
  },
}
