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

const { Transform } = require('stream')
const XLSXTransformStream = require('xlsx-write-stream')
const { formatDataForColumnExport } = require('./utils')


module.exports = () => ({
  stringifier: () => {
    let fields = []
    let headerProcessed = false
    const dataTransformer = new Transform({
      transform(chunk, _, callback) {
        if (!headerProcessed) {
          headerProcessed = true
          fields = Object.keys(chunk)
          this.push(fields)
        }

        const data = fields.reduce((acc, field) => {
          acc.push(formatDataForColumnExport(chunk[field]))
          return acc
        }, [])
        this.push(data)
        return callback()
      },
      objectMode: true,
    })
    const xlsxTransformer = new XLSXTransformStream()
    return [dataTransformer, xlsxTransformer]
  },
  parser: () => { throw new Error('not implemented') },
})
