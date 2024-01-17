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

const excel = require('./transformers/excel')
const ndjson = require('./transformers/ndjson')
const json = require('./transformers/json')
const csv = require('./transformers/csv')

module.exports = {
  getFileMimeStringifiers: (contentType, parsingOptions = {}) => {
    const mimeStringify = {
      'application/x-ndjson': ndjson.stringifier(parsingOptions),
      'application/json': json.stringifier(parsingOptions),
      'text/csv': csv.stringifier(parsingOptions),
      'application/vnd.ms-excel': excel.stringifier(parsingOptions),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': excel.stringifier(parsingOptions),
    }

    return mimeStringify[contentType]
  },
  getFileMimeParser: (contentType, parsingOptions) => {
    const mimeParser = {
      'application/x-ndjson': ndjson.parser(parsingOptions),
      'application/json': json.parser(parsingOptions),
      'text/csv': csv.parser(parsingOptions),
      'application/vnd.ms-excel': excel.parser(parsingOptions),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': excel.parser(parsingOptions),
    }
    return mimeParser[contentType]
  },
}

