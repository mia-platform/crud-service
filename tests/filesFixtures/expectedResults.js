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

const { ObjectId } = require('mongodb')

const expectedBooks = [
  {
    '_id': ObjectId('64940bd37955234169667b47'),
    'name': 'Pride and Prejudice',
    'author': 'Jane Austen',
    'authorAddressId': ObjectId('aaaaaaaaaaaaaaaaaaaaaaab'),
    'isbn': 'fake isbn 2',
    'publishDate': new Date('2023-01-01T00:00:00.000Z'),
    'price': 15.99,
    'isPromoted': false,
    'position':
        {
          'type': 'Point',
          'coordinates':
            [
              10,
              20,
              30.5,
            ],
        },
    'tags':
        [
          'romance',
          'classic',
        ],
    'tagIds':
        [
          2,
          6,
        ],
    'additionalInfo':
        {
          'footnotePages':
            [
              10,
              20,
              30,
              40,
              50,
            ],
          'foo': 50,
          'notes':
            {
              'mynote': 'intriguing',
            },
        },
    'metadata':
        {
          'somethingNumber': 2,
          'somethingString': 'meta-string-2',
          'somethingArrayObject':
            [
              {
                'arrayItemObjectChildNumber': 5,
              },
            ],
          'somethingArrayOfNumbers':
            [
              2,
              3,
            ],
        },
    'attachments':
        [
          {
            'name': 'attachment-2',
            'neastedArr':
                [
                  4,
                  5,
                  6,
                ],
            'detail':
                {
                  'size': 10,
                },
          },
          {
            'name': 'attachment-2b',
            'other': 'extra-info-2b',
          },
        ],
    'editionsDates':
        [
          {
            'edition': 2,
            'date': '2019-06-08T00:00:00.000Z',
          },
          {
            'edition': 1,
            'date': '2018-05-01T00:00:00.000Z',
          },
        ],
    '__STATE__': 'PUBLIC',
  },
  {
    '_id': ObjectId('64940bdc44b126f8f27108ce'),
    'name': '1984',
    'author': 'George Orwell',
    'authorAddressId': ObjectId('aaaaaaaaaaaaaaaaaaaaaaac'),
    'isbn': 'fake isbn 3',
    'publishDate': new Date('2023-02-01T00:00:00.000Z'),
    'price': 18.99,
    'isPromoted': true,
    'position':
        {
          'type': 'Point',
          'coordinates':
            [
              15,
              25,
              35.5,
            ],
        },
    'tags':
        [
          'dystopia',
          'classic',
        ],
    'tagIds':
        [
          3,
          7,
        ],
    'additionalInfo':
        {
          'footnotePages':
            [
              11,
              21,
              31,
              41,
              51,
            ],
          'foo': 51,
          'notes':
            {
              'mynote': 'terrifying',
            },
        },
    'metadata':
        {
          'somethingNumber': 3,
          'somethingString': 'meta-string-3',
          'somethingArrayObject':
            [
              {
                'arrayItemObjectChildNumber': 6,
              },
            ],
          'somethingArrayOfNumbers':
            [
              3,
              4,
            ],
        },
    'attachments':
        [
          {
            'name': 'attachment-3',
            'neastedArr':
                [
                  5,
                  6,
                  7,
                ],
            'detail':
                {
                  'size': 11,
                },
          },
          {
            'name': 'attachment-3b',
            'other': 'extra-info-3b',
          },
        ],
    'editionsDates':
        [
          {
            'edition': 2,
            'date': '2019-07-08T00:00:00.000Z',
          },
          {
            'edition': 1,
            'date': '2018-06-01T00:00:00.000Z',
          },
        ],
    '__STATE__': 'PUBLIC',
  },
  {
    '_id': ObjectId('64940be3dbb33787acf63b9c'),
    'name': 'To Kill a Mockingbird',
    'author': 'Harper Lee',
    'authorAddressId': ObjectId('aaaaaaaaaaaaaaaaaaaaaaad'),
    'isbn': 'fake isbn 4',
    'publishDate': new Date('2023-03-01T00:00:00.000Z'),
    'price': 20.99,
    'isPromoted': true,
    'position':
        {
          'type': 'Point',
          'coordinates':
            [
              20,
              30,
              40.5,
            ],
        },
    'tags':
        [
          'classic',
          'race',
        ],
    'tagIds':
        [
          4,
          8,
        ],
    'additionalInfo':
        {
          'footnotePages':
            [
              15,
              25,
              35,
              45,
              55,
            ],
          'foo': 55,
          'notes':
            {
              'mynote': 'touching',
            },
        },
    'metadata':
        {
          'somethingNumber': 4,
          'somethingString': 'meta-string-4',
          'somethingArrayObject':
            [
              {
                'arrayItemObjectChildNumber': 7,
              },
            ],
          'somethingArrayOfNumbers':
            [
              4,
              5,
            ],
        },
    'attachments':
        [
          {
            'name': 'attachment-4',
            'neastedArr':
                [
                  6,
                  7,
                  8,
                ],
            'detail':
                {
                  'size': 12,
                },
          },
          {
            'name': 'attachment-4b',
            'other': 'extra-info-4b',
          },
        ],
    'editionsDates':
        [
          {
            'edition': 2,
            'date': '2019-08-08T00:00:00.000Z',
          },
          {
            'edition': 1,
            'date': '2018-07-01T00:00:00.000Z',
          },
        ],
    '__STATE__': 'PUBLIC',
  },
]

const bookToUpdate = {
  '_id': new ObjectId('64940bd37955234169667b47'),
  'name': 'Pride and Prejudice',
  'author': 'Jane Austen',
  'authorAddressId': new ObjectId('aaaaaaaaaaaaaaaaaaaaaaab'),
  'isbn': 'Updated ISBN',
  'publishDate': new Date('2023-01-01T00:00:00.000Z'),
  'price': 15.99,
  'isPromoted': false,
  'position': {
    'type': 'Point',
    'coordinates': [
      10,
      20,
      30.5,
    ],
  },
  'tags': [
    'romance',
    'classic',
  ],
  'tagIds': [
    2,
    6,
  ],
  'additionalInfo': {
    'footnotePages': [
      10,
      20,
      30,
      40,
      50,
    ],
    'foo': 50,
    'notes': {
      'mynote': 'intriguing',
    },
  },
  'metadata': {
    'somethingNumber': 2,
    'somethingString': 'meta-string-2',
    'somethingArrayObject': [
      {
        'arrayItemObjectChildNumber': 5,
      },
    ],
    'somethingArrayOfNumbers': [
      2,
      3,
    ],
  },
  'attachments': [
    {
      'name': 'attachment-2',
      'neastedArr': [
        4,
        5,
        6,
      ],
      'detail': {
        'size': 10,
      },
    },
    {
      'name': 'attachment-2b',
      'other': 'extra-info-2b',
    },
  ],
  'editionsDates': [
    {
      'edition': 2,
      'date': '2019-06-08T00:00:00.000Z',
    },
    {
      'edition': 1,
      'date': '2018-05-01T00:00:00.000Z',
    },
  ],
  '__STATE__': 'PUBLIC',
}

module.exports = {
  expectedBooks,
  bookToUpdate,
}
