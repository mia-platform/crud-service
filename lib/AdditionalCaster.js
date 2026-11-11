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

const { ObjectId } = require('mongodb')
const { GEOPOINT } = require('./consts')
const { getFieldDefinition } = require('./QueryParser.utils')

const ARRAY_ITEMS_SUFFIX = '.__items'

// geoPointPaths: when undefined, every GeoJSON Point is converted to its coordinates;
// otherwise only the Points found at the given paths (see getGeoPointPaths) are converted.
function castItem(value, geoPointPaths, path = '', isArrayItem = false) {
  if (value === null || value === undefined) {
    return value
  }

  // Custom GeoPoint type
  if (typeof value === 'object' && value.type === 'Point' && Array.isArray(value.coordinates)
    && (!geoPointPaths || geoPointPaths.has(isArrayItem ? `${path}${ARRAY_ITEMS_SUFFIX}` : path))) {
    return value.coordinates
  }

  if (value instanceof ObjectId) {
    return value.toString()
  }
  if (value instanceof Date) {
    return value.toISOString()
  }

  // NOTE: this works also for arrays
  if (typeof value === 'object') {
    const isArray = Array.isArray(value)
    for (const key of Object.keys(value)) {
      let childPath = path
      if (!isArray) {
        childPath = path ? `${path}.${key}` : key
      }
      value[key] = castItem(value[key], geoPointPaths, childPath, isArray)
    }
  }

  return value
}

// returns the paths of the fields declared as GeoPoint in the collection definition,
// using the same notation of getFieldDefinition (array indexes omitted, `.__items` for array items)
function getGeoPointPaths(collectionDefinition) {
  const fieldDefinition = getFieldDefinition(collectionDefinition)
  return new Set(Object.keys(fieldDefinition).filter(fieldPath => fieldDefinition[fieldPath] === GEOPOINT))
}

// a function that return an ObjectId if the input id is in the correct format, a string otherwise.
function castCollectionId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : id
}

module.exports = { castItem, castCollectionId, getGeoPointPaths }
