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
  'summary': 'Update the item with specific ID in the stations collection.',
  'tags': [
    'stations endpoint',
  ],
  'params': {
    'properties': {
      'id': {
        'type': 'string',
        'description': 'The ID of the item to update information for',
      },
    },
    'type': 'object',
    'operationId': 'stations__MIA__patchItem__MIA__params',
  },
  'querystring': {
    'operationId': 'stations__MIA__patchItem__MIA__querystring',
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
          'string',
          'null',
        ],
        'anyOf': [
          {
            'type': 'array',
            'items': {
              'type': 'string',
              'nullable': true,
            },
            'nullable': true,
          },
          {
            'type': 'string',
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
        'example': '1997-04-24T07:00:00.000Z',
        'type': 'string',
        'nullable': false,
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
        'description': '"date-time" according with https://tools.ietf.org/html/rfc3339#section-5.6',
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
    },
    'additionalProperties': false,
  },
  'body': {
    'operationId': 'stations__MIA__patchItem__MIA__body',
    'type': 'object',
    'properties': {
      '$set': {
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
            'type': [
              'array',
              'string',
              'null',
            ],
            'anyOf': [
              {
                'type': 'array',
                'items': {
                  'type': 'string',
                  'nullable': true,
                },
                'nullable': true,
              },
              {
                'type': 'string',
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
            'example': '1997-04-24T07:00:00.000Z',
            'type': 'string',
            'nullable': false,
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
            'description': '"date-time" according with https://tools.ietf.org/html/rfc3339#section-5.6',
          },
          'Direttrici.$.replace': {
            'type': 'string',
          },
        },
        'additionalProperties': false,
        'patternProperties': {},
      },
      '$unset': {
        'type': 'object',
        'properties': {
          'Cap': {
            'type': 'boolean',
            'enum': [
              true,
            ],
          },
          'CodiceMIR': {
            'type': 'boolean',
            'enum': [
              true,
            ],
          },
          'Comune': {
            'type': 'boolean',
            'enum': [
              true,
            ],
          },
          'Direttrici': {
            'type': 'boolean',
            'enum': [
              true,
            ],
          },
          'Indirizzo': {
            'type': 'boolean',
            'enum': [
              true,
            ],
          },
          'country': {
            'type': 'boolean',
            'enum': [
              true,
            ],
          },
          'nonNullableDate': {
            'type': 'boolean',
            'enum': [
              true,
            ],
          },
        },
        'additionalProperties': false,
        'patternProperties': {},
      },
      '$inc': {
        'type': 'object',
        'properties': {
          'Cap': {
            'type': 'number',
          },
        },
        'additionalProperties': false,
        'patternProperties': {},
      },
      '$mul': {
        'type': 'object',
        'properties': {
          'Cap': {
            'type': 'number',
          },
        },
        'additionalProperties': false,
        'patternProperties': {},
      },
      '$currentDate': {
        'type': 'object',
        'properties': {
          'nonNullableDate': {
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
          'Direttrici': {
            'anyOf': [
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
                      {
                        'type': 'string',
                      },
                      {
                        'type': 'number',
                      },
                      {
                        'type': 'boolean',
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
                    'type': 'number',
                  },
                  '$slice': {
                    'type': 'number',
                  },
                  '$sort': {
                    'oneOf': [
                      {
                        'type': 'object',
                      },
                      {
                        'type': 'number',
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
                'anyOf': [
                  {
                    'required': [
                      '$',
                    ],
                  },
                  {
                    'required': [
                      '$each',
                    ],
                  },
                  {
                    'required': [
                      '$sort',
                    ],
                  },
                  {
                    'required': [
                      '$in',
                    ],
                  },
                  {
                    'required': [
                      '$position',
                    ],
                  },
                  {
                    'required': [
                      '$each',
                    ],
                  },
                ],
                'additionalProperties': false,
              },
            ],
          },
        },
        'additionalProperties': false,
      },
      '$pull': {
        'type': 'object',
        'properties': {
          'Direttrici': {
            'anyOf': [
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
                      {
                        'type': 'string',
                      },
                      {
                        'type': 'number',
                      },
                      {
                        'type': 'boolean',
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
                    'type': 'number',
                  },
                  '$slice': {
                    'type': 'number',
                  },
                  '$sort': {
                    'oneOf': [
                      {
                        'type': 'object',
                      },
                      {
                        'type': 'number',
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
                'anyOf': [
                  {
                    'required': [
                      '$',
                    ],
                  },
                  {
                    'required': [
                      '$each',
                    ],
                  },
                  {
                    'required': [
                      '$sort',
                    ],
                  },
                  {
                    'required': [
                      '$in',
                    ],
                  },
                  {
                    'required': [
                      '$position',
                    ],
                  },
                  {
                    'required': [
                      '$each',
                    ],
                  },
                ],
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
          'Direttrici': {
            'anyOf': [
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
                      {
                        'type': 'string',
                      },
                      {
                        'type': 'number',
                      },
                      {
                        'type': 'boolean',
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
                    'type': 'number',
                  },
                  '$slice': {
                    'type': 'number',
                  },
                  '$sort': {
                    'oneOf': [
                      {
                        'type': 'object',
                      },
                      {
                        'type': 'number',
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
                'anyOf': [
                  {
                    'required': [
                      '$',
                    ],
                  },
                  {
                    'required': [
                      '$each',
                    ],
                  },
                  {
                    'required': [
                      '$sort',
                    ],
                  },
                  {
                    'required': [
                      '$in',
                    ],
                  },
                  {
                    'required': [
                      '$position',
                    ],
                  },
                  {
                    'required': [
                      '$each',
                    ],
                  },
                ],
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
  'response': {
    '200': {
      'operationId': 'stations__MIA__patchItem__MIA__response.200',
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
          'example': '1997-04-24T07:00:00.000Z',
          'type': 'string',
          'nullable': false,
          'description': 'Date of the request that has performed the last change',
        },
        'creatorId': {
          'type': 'string',
          'description': 'User id that has created this object',
        },
        'createdAt': {
          'example': '1997-04-24T07:00:00.000Z',
          'type': 'string',
          'nullable': false,
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
          'type': [
            'array',
            'string',
            'null',
          ],
          'anyOf': [
            {
              'type': 'array',
              'items': {
                'type': 'string',
                'nullable': true,
              },
              'nullable': true,
            },
            {
              'type': 'string',
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
          'example': '1997-04-24T07:00:00.000Z',
          'type': 'string',
          'nullable': false,
        },
      },
    },
  },
}
