/*
 * Copyright 2024 Mia s.r.l.
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

const csvParse = require('csv-parse')
const csvStringify = require('csv-stringify')

module.exports = (parsingOptions) => ({
  stringifier: ({ fields }) => [csvStringify.stringify({
    encoding: 'utf8',
    delimiter: ',',
    escape: '\\',
    header: true,
    quoted_string: true,
    ...parsingOptions,
    columns: fields,
    cast: {
      object: (value) => {
        try {
          return { value: JSON.stringify(value), quote: true }
        } catch (errs) {
          return value
        }
      },
      boolean: (value) => {
        return value ? 'true' : 'false'
      },
    },
  })],
  parser: () => csvParse.parse({
    encoding: 'utf8',
    delimiter: ',',
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    escape: '\\',
    bom: true,
    ...parsingOptions,
    cast: (value) => {
      try {
        return JSON.parse(value)
      } catch (errs) {
        return value
      }
    },
  }),
})
