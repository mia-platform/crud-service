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
const { GEOPOINT } = require('./consts')

class ResultCaster {
  constructor(collectionDefinition) {
    this._collectionDefinition = collectionDefinition

    this._geoPointFieldNames = getTypeFromCollectionDefinition(collectionDefinition, GEOPOINT)
    this._numberFieldNames = getTypeFromCollectionDefinition(collectionDefinition, 'number')
  }

  asStream() {
    return through2.obj((chunk, enc, callback) => {
      this.castItem(chunk)
      callback(null, chunk)
    })
  }

  castItem(item) {
    for (const name of this._geoPointFieldNames) {
      if (item[name]) {
        item[name] = item[name].coordinates
      }
    }

    for (const name of this._numberFieldNames) {
      if (item[name]) {
        item[name] = parseFloat(item[name])
      }
    }
  }
}

function getTypeFromCollectionDefinitionCompatibility(collectionDefinition, type) {
  return collectionDefinition.fields
    .filter(field => field.type === type)
    .map(field => field.name)
}

function getTypeFromCollectionDefinition(collectionDefinition, type) {
  if (!collectionDefinition.schema) {
    return getTypeFromCollectionDefinitionCompatibility(collectionDefinition, type)
  }

  return Object
    .entries(collectionDefinition.schema.properties)
    .filter(([, jsonSchema]) => jsonSchema.type === type)
    .map(([propertyName]) => propertyName)
}

module.exports = ResultCaster
