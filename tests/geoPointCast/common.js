/*
 * Copyright 2026 Mia s.r.l.
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

const defaultFields = [
  { name: '_id', type: 'ObjectId', required: true },
  { name: 'updaterId', type: 'string', required: true },
  { name: 'updatedAt', type: 'Date', required: true },
  { name: 'creatorId', type: 'string', required: true },
  { name: 'createdAt', type: 'Date', required: true },
  { name: '__STATE__', type: 'string', required: true },
]

const defaultIndexes = [
  { name: '_id', type: 'normal', unique: true, fields: [{ name: '_id', order: 1 }] },
]

// `position` is declared as GeoPoint, `info` is a RawObject that may contain any GeoJSON Point
const placeFields = [
  { name: 'name', type: 'string', required: false },
  { name: 'position', type: 'GeoPoint', required: false },
  { name: 'info', type: 'RawObject', required: false },
]

module.exports = { defaultFields, defaultIndexes, placeFields }
