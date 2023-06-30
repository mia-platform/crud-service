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

const Ajv = require('ajv')
const ajvFormats = require('ajv-formats')
const ajvKeywords = require('ajv-keywords')
const { SCHEMA_CUSTOM_KEYWORDS } = require('./consts')
const through2 = require('through2')

function getAjvResponseValidationFunction(schema) {
  // We need this custom validator to remove properties without breaking other tests and avoid
  // unwanted behaviors
  const ajv = new Ajv({
    coerceTypes: true,
    useDefaults: true,
    removeAdditional: true,
    allowUnionTypes: true,
  })
  ajvFormats(ajv)
  ajvKeywords(ajv, 'instanceof')
  ajv.addVocabulary(Object.values(SCHEMA_CUSTOM_KEYWORDS))
  return ajv.compile(schema)
}

function validateStream(validate) {
  return through2.obj((chunk, _, callback) => {
    validate(chunk)
    callback(validate.errors, chunk)
  })
}

module.exports = {
  getAjvResponseValidationFunction,
  validateStream,
}
