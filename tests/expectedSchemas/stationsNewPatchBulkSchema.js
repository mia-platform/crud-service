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
  'summary': 'Update multiple items of stations, each one with its own modifications',
  'tags': [
    'stations endpoint',
  ],
  'body': {
    'operationId': 'stations__MIA__patchBulk__MIA__body',
    'type': 'array',
    'items': {
      'type': 'object',
      'properties': {
        'filter': {
          'type': 'object',
          'properties': {
            '_id': {
              'type': 'string',
              'pattern': '^(?!\\s*$).+',
              'description': 'String identifier of the document in the collection',
              'example': '00000000-0000-4000-0000-000000000000',
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
            '_rawp': {
              'type': 'string',
              'description': 'Additional raw stringified projection for MongoDB',
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
      'operationId': 'stations__MIA__patchBulk__MIA__response.200',
      'type': 'integer',
      'minimum': 0,
    },
  },
}
