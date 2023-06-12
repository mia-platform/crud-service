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
  name: 'books',
  endpointBasePath: '/books-endpoint',
  defaultState: 'DRAFT',
  indexes: [
    {
      name: 'uniqueISBN',
      type: 'normal',
      unique: true,
      fields: [
        {
          name: 'isbn',
          order: 1,
        },
      ],
    },
    {
      name: 'positionIndex',
      type: 'geo',
      unique: false,
      field: 'position',
    },
    {
      name: 'textIndex',
      type: 'text',
      unique: false,
      fields: [
        { name: 'name' },
        { name: 'author' },
      ],
      weights: {
        name: 1,
        author: 1,
      },
      defaultLanguage: 'en',
      languageOverride: 'idioma',
    },
    {
      name: 'isPromotedPartialIndex',
      type: 'normal',
      unique: false,
      fields: [
        {
          name: 'isPromoted',
          order: 1,
        },
      ],
      usePartialFilter: true,
      partialFilterExpression: '{"isPromoted": { "$eq": true } }',
    },
  ],
}
