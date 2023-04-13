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

const PUBLIC = 'PUBLIC'
const DRAFT = 'DRAFT'
const TRASH = 'TRASH'
const DELETED = 'DELETED'

const rawProjectionDictionary = {
  allowedOperators: [
    '$eq', '$gt', '$gte', '$in', '$lt', '$lte', '$ne', '$nin',
    '$and', '$not', '$nor', '$or',
    '$exists', '$type', '$cond', '$regexMatch', '$mod',
    '$all', '$elemMatch', '$size',
    '$filter', '$reduce', '$concatArrays', '$first', '$map',
    '$dateToString',
  ],
  notAllowedOperators: [
    '$$ROOT',
    '$$CURRENT',
    '$$PRUNE',
    '$$DESCEND',
    '$$KEEP',
    '$$CLUSTER_TIME',
    '$$REMOVE',
    '$$NOW',
  ],
}

module.exports = Object.freeze({
  // type names
  ARRAY: 'Array',
  GEOPOINT: 'GeoPoint',
  DATE: 'Date',
  OBJECTID: 'ObjectId',
  RAWOBJECTTYPE: 'RawObject',


  // additional query parameters
  SORT: '_s',
  PROJECTION: '_p',
  QUERY: '_q',
  LIMIT: '_l',
  SKIP: '_sk',
  STATE: '_st',
  MONGOID: '_id',
  RAW_PROJECTION: '_rawp',

  // Patch commands
  SETCMD: '$set',
  UNSETCMD: '$unset',
  INCCMD: '$inc',
  MULCMD: '$mul',
  CURDATECMD: '$currentDate',
  SETONINSERTCMD: '$setOnInsert',
  PUSHCMD: '$push',
  PULLCMD: '$pull',
  ADDTOSETCMD: '$addToSet',

  // fields
  UPDATERID: 'updaterId',
  UPDATEDAT: 'updatedAt',
  CREATORID: 'creatorId',
  CREATEDAT: 'createdAt',
  __STATE__: '__STATE__',

  STATES: Object.freeze({ PUBLIC, DRAFT, TRASH, DELETED }),

  // invalid userId values
  INVALID_USERID: ['', 'null', 'undefined'],
  DATE_FORMATS: ['date-time', 'time', 'date', 'duration'],

  // operator for setting array element fields
  ARRAY_MERGE_ELEMENT_OPERATOR: 'merge',
  ARRAY_REPLACE_ELEMENT_OPERATOR: 'replace',

  JSON_SCHEMA_ARRAY_TYPE: 'array',
  JSON_SCHEMA_OBJECT_TYPE: 'object',

  SCHEMA_CUSTOM_KEYWORDS: Object.freeze({
    UNIQUE_OPERATION_ID: 'operationId',
    ENCRYPTION: 'encryption',
  }),

  // index types
  NORMAL_INDEX: 'normal',
  HASHED_INDEX: 'hash',
  GEO_INDEX: 'geo',
  TEXT_INDEX: 'text',
  HASHED_FIELD: 'hashed',
  GEO_FIELD: '2dsphere',
  TEXT_FIELD: 'text',

  // text search
  textScore: { $meta: 'textScore' },
  // raw projection
  rawProjectionDictionary,
})
