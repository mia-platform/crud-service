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
    switch (contentType) {
    case 'application/x-ndjson':
      return ndjson(parsingOptions).stringifier
    case 'application/json':
      return json(parsingOptions).stringifier
    case 'text/csv':
      return csv(parsingOptions).stringifier
    case 'application/vnd.ms-excel':
      return excel(parsingOptions).stringifier
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return excel(parsingOptions).stringifier
    default:
      return undefined
    }
  },
  getFileMimeParser: (contentType, parsingOptions) => {
    switch (contentType) {
    case 'application/x-ndjson':
      return ndjson(parsingOptions).parser
    case 'application/json':
      return json(parsingOptions).parser
    case 'text/csv':
      return csv(parsingOptions).parser
    case 'application/vnd.ms-excel':
      return excel(parsingOptions).parser
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return excel(parsingOptions).parser
    default:
      return undefined
    }
  },
}

