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
const { v4: uuidv4 } = require('uuid')

function getDatabaseNameByType(type) {
  return `${type}PK`
}
// a function that return an ObjectId if the input id is in the correct format, a string otherwise.
function castCollectionId(fastify) {
  return (id) => (ObjectId.isValid(id) ? new fastify.mongo.ObjectId(id) : id)
}

function getUUIDPKFactory() {
  return {
    createPk() {
      return uuidv4()
    },
  }
}

function getObjectIdFactory() {
  return {
    createPk() {
      return new ObjectId()
    },
  }
}

const pkFactories = {
  string: getUUIDPKFactory(),
  ObjectId: getObjectIdFactory(),
}
module.exports = {
  pkFactories,
  castCollectionId,
  getDatabaseNameByType,
}
