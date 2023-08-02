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

const ndjson = require('ndjson')
const csvParse = require('csv-parse')
const csvStringify = require('csv-stringify')
const JSONStream = require('JSONStream')

module.exports = {
  getFileMimeStringify: (contentType, parsingOptions = {}) => {
    const mimeStringify = {
      'application/x-ndjson': () => ndjson.stringify(),
      'application/json': () => JSONStream.stringify(),
      'text/csv': () => csvStringify.stringify({
        encoding: 'utf8',
        delimiter: ',',
        escape: '\\',
        header: true,
        quote: false,
        ...parsingOptions,
        cast: {
          object: (value) => {
            try {
              return { value: JSON.stringify(value), quote: true }
            } catch (errs) {
              return value
            }
          },
        },
      }),
    }

    return mimeStringify[contentType]
  },
  getFileMimeParser: (contentType, parsingOptions) => {
    const mimeParser = {
      'application/x-ndjson': () => ndjson.parse(),
      'application/json': () => JSONStream.parse('*'),
      'text/csv': () => csvParse.parse({
        encoding: 'utf8',
        delimiter: ',',
        columns: true,
        skip_empty_lines: true,
        relax_quotes: true,
        escape: '\\',
        ...parsingOptions,
        cast: (value) => {
          try {
            return JSON.parse(value)
          } catch (errs) {
            return value
          }
        },
      }),
    }

    return mimeParser[contentType]
  },

}
