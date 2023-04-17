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

const fp = require('fastify-plugin')
const fastifyMongodb = require('@fastify/mongodb')
const mongoDBHealthChecker = require('@mia-platform/mongodb-healthchecker')

const generateEncryptionConfig = require('./mongo-crypt-factory')
const { MONGOID } = require('../consts')
const { pkFactories, getDatabaseNameByType } = require('../pkFactories')
const retrieveDataKeyIds = require('./mongo-data-keygen')
const generateSchemaMaps = require('./mongo-schemaMap-generator')

const checkFactory = ({ log }) => (pkFactory, type) => {
  if (!pkFactory) {
    const errorMessage = `PK Factory not found for ${type}`
    log.debug(errorMessage)
    throw new Error(errorMessage)
  }
}

async function registerMongoInstances(fastify) {
  const { collections } = fastify
  const { databaseName, dataKeysId } = await retrieveDataKeyIds(fastify, collections)
  const schemaMaps = generateSchemaMaps(databaseName, collections, dataKeysId)
  const distinctIdTypes = [...new Set(collections.map(getIdType))]
  distinctIdTypes.forEach(mongoRegister(fastify, schemaMaps))
  fastify.register(fp(setupMongoDBHealthChecker))
}

async function setupMongoDBHealthChecker(fastify) {
  const { isUp } = mongoDBHealthChecker(fastify.mongo.client)

  fastify.decorate('mongoDBCheckIsUp', isUp)
}

function getIdTypeCompatibility(collection) {
  const collectionId = collection.fields.find(field => field.name === MONGOID)
  return collectionId.type
}

function getIdType(collection) {
  if (!collection.schema) {
    return getIdTypeCompatibility(collection)
  }
  const { type, __mia_configuration: { type: specialType } } = collection.schema.properties[MONGOID] ?? {}
  return specialType ?? type
}

function mongoRegister(fastify, schemaMaps) {
  const { MONGODB_URL } = fastify.config
  const factoryChecker = checkFactory(fastify)
  return (type) => {
    const pkFactory = pkFactories[type]
    factoryChecker(pkFactory, type)
    fastify.register(fastifyMongodb, {
      url: MONGODB_URL,
      pkFactory,
      autoEncryption: generateEncryptionConfig(fastify, schemaMaps),
      name: getDatabaseNameByType(type),
    })
  }
}

module.exports = {
  registerMongoInstances,
  getIdType,
}
