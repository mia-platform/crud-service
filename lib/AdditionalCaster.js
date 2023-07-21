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
const lget = require('lodash.get')
const lset = require('lodash.set')
const { JSONPath } = require('jsonpath-plus')
const { fieldsToSchema } = require('./AdditionalCaster.utils')
const { getPathFromPointer } = require('./JSONPath.utils')

class AdditionalCaster {
  constructor(collectionDefinition) {
    this._collectionSchema = collectionDefinition.schema ?? fieldsToSchema(collectionDefinition.fields)
    this._pathsToObjectIds = JSONPath({
      json: this._collectionSchema.properties,
      resultType: 'pointer',
      path: '$..[?(@.type === "ObjectId")]',
    })
      .map(getPathFromPointer)

    this._pathsToGeoPoint = JSONPath({
      json: this._collectionSchema.properties,
      path: '$..[?(@.type === "GeoPoint")]',
      resultType: 'pointer',
    })
      .map(getPathFromPointer)

    this._pathToCoordinates = this._pathsToGeoPoint.map(path => `${path}.coordinates`)

    this._pathToDates = JSONPath({
      json: this._collectionSchema.properties,
      path: '$..[?(@.format === "date-time")]',
      resultType: 'pointer',
    })
      .map(getPathFromPointer)
  }

  castResultsAsStream() {
    return through2.obj((chunk, _, callback) => {
      const castedChunk = this.castItem(chunk)
      callback(null, castedChunk)
    })
  }

  castItem(item) {
    let response = { ...item, _id: item._id?.toString() }

    for (const path of this._pathsToGeoPoint) {
      const coordinatesPath = `${path}.coordinates`
      const value = lget(response, coordinatesPath)
      if (value) {
        response = lset(response, path, value)
      }
    }

    for (const path of this._pathsToObjectIds) {
      const value = lget(response, path)
      if (value) {
        response = lset(response, path, value.toString())
      }
    }

    for (const path of this._pathToDates) {
      const value = lget(response, path)
      // We want also support $dateToString mongo operator
      // So we are not always sure that value is a Date
      if (value instanceof Date) {
        response = lset(response, path, value.toISOString())
      }
    }

    return response
  }
}

module.exports = AdditionalCaster
