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

const through2 = require('through2')
const { ObjectId } = require('mongodb')

class AdditionalCaster {
  castResultsAsStream() {
    return through2.obj((chunk, _, callback) => {
      callback(null, this.castItem(chunk))
    })
  }

  castItem(data) {
    const stringifiedValue = JSON.stringify(data, (_, value) => {
      if (typeof value === 'object' && value !== null && value.type === 'Point' && Array.isArray(value.coordinates)) {
        return value.coordinates
      } else if (value instanceof ObjectId) {
        return value.toString()
      } else if (value instanceof Date) {
        return value.toISOString()
      }
      return value
    })
    return JSON.parse(stringifiedValue)
  }
}

module.exports = AdditionalCaster
