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
      'application/x-ndjson': ndjson(parsingOptions).stringifier,
      'application/json': json(parsingOptions).stringifier,
      'text/csv': csv(parsingOptions).stringifier,
      'application/vnd.ms-excel': excel(parsingOptions).stringifier,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': excel(parsingOptions).stringifier,
    }

    return mimeStringify[contentType]
  },
  getFileMimeParser: (contentType, parsingOptions) => {
    const mimeParser = {
      'application/x-ndjson': ndjson(parsingOptions).parser,
      'application/json': json(parsingOptions).parser,
      'text/csv': csv(parsingOptions).parser,
      'application/vnd.ms-excel': excel(parsingOptions).parser,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': excel(parsingOptions).parser,
    }
    return mimeParser[contentType]
  },
}

