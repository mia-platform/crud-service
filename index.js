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

/* eslint-disable no-await-in-loop */
'use strict'

const fp = require('fastify-plugin')
const fastifyEnv = require('@fastify/env')

const Ajv = require('ajv')
const AjvCompiler = require('@fastify/ajv-compiler')
const ajvFormats = require('ajv-formats')

const { readdirSync } = require('fs')
const { join } = require('path')
const { omit } = require('ramda')

const myPackage = require('./package')
const QueryParser = require('./lib/QueryParser')
const CrudService = require('./lib/CrudService')
const ResultCaster = require('./lib/ResultCaster')
const httpInterface = require('./lib/httpInterface')
const JSONSchemaGenerator = require('./lib/JSONSchemaGenerator')
const createIndexes = require('./lib/createIndexes')
const { castCollectionId, getDatabaseNameByType } = require('./lib/pkFactories')
const { SCHEMA_CUSTOM_KEYWORDS } = require('./lib/consts')
const joinPlugin = require('./lib/joinPlugin')
const generatePathFieldsForRawSchema = require('./lib/generatePathFieldsForRawSchema')
const { getIdType, registerMongoInstances } = require('./lib/mongo/mongo-plugin')
const mergeViewsInCollections = require('./lib/mergeViewsInCollections')

const { compatibilityModelJsonSchema, modelJsonSchema } = require('./lib/model.jsonschema')
const fastifyEnvSchema = require('./envSchema')

const ajv = new Ajv({ useDefaults: true })
ajvFormats(ajv)
const compatibilityValidate = ajv.compile(compatibilityModelJsonSchema)
const validate = ajv.compile(modelJsonSchema)

const PREFIX_OF_INDEX_NAMES_TO_PRESERVE = 'preserve_'
const VIEW_TYPE = 'view'

async function registerCrud(fastify, { modelName, isView }) {
  if (!fastify.mongo) { throw new Error('`fastify.mongo` is undefined!') }
  if (!modelName) { throw new Error('`modelName` is undefined!') }

  fastify.log.trace({ modelName }, 'Registering CRUD')

  const model = fastify.models[modelName]

  fastify.decorate('crudService', model.crudService)
  fastify.decorate('queryParser', model.queryParser)
  fastify.decorate('castResultsAsStream', model.castResultsAsStream)
  fastify.decorate('castItem', model.castItem)
  fastify.decorate('allFieldNames', model.allFieldNames)
  fastify.decorate('jsonSchemaGenerator', model.jsonSchemaGenerator)
  fastify.decorate('jsonSchemaGeneratorWithNested', model.jsonSchemaGeneratorWithNested)
  fastify.decorate('modelName', modelName)
  const prefix = model.definition.endpointBasePath
  fastify.register(httpInterface, { prefix, isView })
}

const registerDatabase = fp(registerMongoInstances, { decorators: { fastify: ['config'] } })

async function iterateOverCollectionDefinitionAndRegisterCruds(fastify) {
  fastify.decorate('castCollectionId', castCollectionId(fastify))
  fastify.decorate('userIdHeaderKey', fastify.config.USER_ID_HEADER_KEY.toLowerCase())

  for (const [modelName, model] of Object.entries(fastify.models)) {
    fastify.register(registerCrud, {
      modelName,
      isView: model.isView,
    })
  }
}

// eslint-disable-next-line max-statements
async function loadModels(fastify) {
  const { collections } = fastify
  const views = fastify.views || []

  const mergedCollections = mergeViewsInCollections(collections, views)

  fastify.log.trace({ collectionNames: mergedCollections.map(coll => coll.name) }, 'Registering CRUDs and Views')

  const models = {}
  for (const collectionDefinition of mergedCollections) {
    if (!collectionDefinition.schema && !compatibilityValidate(collectionDefinition)) {
      fastify.log.warn({ collectionName: collectionDefinition.name }, 'collection using custom fields configuration - which has been deprecated')
      fastify.log.error(compatibilityValidate.errors)
      throw new Error(`Invalid collection definition: ${collectionDefinition.name}`)
    }

    if (collectionDefinition.schema && !validate(collectionDefinition)) {
      fastify.log.error(validate.errors)
      throw new Error(`Invalid collection definition: ${collectionDefinition.name}`)
    }

    const {
      name: collectionName,
      endpointBasePath: collectionEndpoint,
      type: collectionType,
      schema: collectionSchema,
      fields: deprecatedCollectionSchema,
      defaultState,
      indexes,
    } = collectionDefinition
    const isView = collectionType === VIEW_TYPE

    fastify.log.trace({ collectionEndpoint, collectionName }, 'Registering CRUD')
    const collectionIdType = getIdType(collectionDefinition)
    const collection = fastify.mongo[getDatabaseNameByType(collectionIdType)].db.collection(collectionName)

    const allFieldNames = !collectionSchema
      ? deprecatedCollectionSchema.map(({ name }) => name)
      : Object.keys(collectionDefinition.schema.properties)
    const pathsForRawSchema = generatePathFieldsForRawSchema(fastify.log, collectionDefinition)

    // TODO: make this configurable
    const crudService = new CrudService(
      collection,
      defaultState,
      { allowDiskUse: fastify.config.ALLOW_DISK_USE_IN_QUERIES },
    )
    const queryParser = new QueryParser(collectionDefinition, pathsForRawSchema)
    const resultCaster = new ResultCaster(collectionDefinition)
    const jsonSchemaGenerator = new JSONSchemaGenerator(
      collectionDefinition,
      {},
      fastify.config.CRUD_LIMIT_CONSTRAINT_ENABLED,
      fastify.config.CRUD_MAX_LIMIT
    )
    const jsonSchemaGeneratorWithNested = new JSONSchemaGenerator(
      collectionDefinition,
      pathsForRawSchema,
      fastify.config.CRUD_LIMIT_CONSTRAINT_ENABLED,
      fastify.config.CRUD_MAX_LIMIT
    )

    if (isView) {
      const existingCollectionCursor = await fastify.mongo[getDatabaseNameByType(collectionIdType)].db.listCollections(
        {
          name: collectionName,
        },
        {
          nameOnly: true,
        })
      const retrievedCollection = await existingCollectionCursor.next()
      if (retrievedCollection) {
        try {
          await fastify.mongo[getDatabaseNameByType(collectionIdType)].db.collection(collectionName).drop()
        } catch (error) {
          throw new Error('Failed to delete view', { cause: error })
        }
      }
      try {
        await fastify.mongo[getDatabaseNameByType(collectionIdType)].db.createCollection(
          collectionName,
          {
            viewOn: collectionDefinition.source,
            pipeline: collectionDefinition.pipeline,
          }
        )
      } catch (error) {
        throw new Error('Failed to create view', { cause: error })
      }
    } else {
      await createIndexes(collection, indexes || [], PREFIX_OF_INDEX_NAMES_TO_PRESERVE)
    }

    models[getCollectionNameFromEndpoint(collectionEndpoint)] = {
      definition: collectionDefinition,
      crudService,
      queryParser,
      castResultsAsStream: () => resultCaster.asStream(),
      castItem: (item) => resultCaster.castItem(item),
      allFieldNames,
      jsonSchemaGenerator,
      jsonSchemaGeneratorWithNested,
      isView,
    }
  }
  fastify.decorate('models', models)
}

function getCollectionNameFromEndpoint(endpointBasePath) {
  return endpointBasePath.replace('/', '').replace(/\//g, '-')
}

const validCrudFolder = path => !['.', '..'].includes(path) && /\.js(on)?$/.test(path)

async function setupCruds(fastify) {
  const collections = readdirSync(fastify.config.COLLECTION_DEFINITION_FOLDER)
    .filter(validCrudFolder)
    .map(path => join(fastify.config.COLLECTION_DEFINITION_FOLDER, path))
    .map(require)

  fastify.decorate('collections', collections)

  const viewsFolder = fastify.config.VIEWS_DEFINITION_FOLDER
  if (viewsFolder) {
    const views = readdirSync(viewsFolder)
      .filter(validCrudFolder)
      .map(path => join(viewsFolder, path))
      .map(require)

    fastify.decorate('views', views)
  }

  if (collections.length > 0) {
    fastify
      .register(registerDatabase)
      .register(fp(loadModels))
      .register(iterateOverCollectionDefinitionAndRegisterCruds)
      .register(joinPlugin, { prefix: '/join' })
  }
}

module.exports = async function plugin(fastify, opts) {
  fastify
    .register(fastifyEnv, { schema: fastifyEnvSchema, data: opts })
    .register(fp(setupCruds, { decorators: { fastify: ['config'] } }))
}

module.exports.options = {
  trustProxy: process.env.TRUSTED_PROXIES,
  // configure Fastify to employ Ajv Formats plugin,
  // which components were stripped from main Ajv implementation
  ajv: {
    customOptions: {
      validateFormats: true,
    },
    plugins: [ajvFormats],
  },
  // configure Fastify v3 to use Ajv 8 (AjvCompiler v2.x => Ajv 8)
  schemaController: {
    compilersFactory: {
      buildValidator: AjvCompiler(),
    },
  },
}

module.exports.swaggerDefinition = {
  openApiSpecification: 'swagger',
  info: {
    title: 'Crud Service',
    description: myPackage.description,
    version: myPackage.version,
  },
}

module.exports.transformSchemaForSwagger = ({ schema, url }) => {
  const {
    params = undefined,
    body = undefined,
    querystring = undefined,
    response = undefined,
    ...others
  } = schema
  const transformed = { ...others }
  const KEYS_TO_REMOVE = [
    SCHEMA_CUSTOM_KEYWORDS.UNIQUE_OPERATION_ID,
  ]

  if (params) { transformed.params = omit(KEYS_TO_REMOVE, params) }
  if (body) { transformed.body = omit(KEYS_TO_REMOVE, body) }
  if (querystring) { transformed.querystring = omit(KEYS_TO_REMOVE, querystring) }
  if (response) {
    transformed.response = {
      ...response,
      ...response['200'] ? { 200: omit(KEYS_TO_REMOVE, response['200']) } : {},
    }
  }

  return { schema: transformed, url }
}

module.exports.getMetrics = function getMetrics(prometheusClient) {
  const collectionInvocation = new prometheusClient.Counter({
    name: 'mia_platform_crud_service_collection_invocation',
    help: 'Count collection invocation, not the document considered',
    labelNames: ['collection_name', 'type'],
  })

  return {
    collectionInvocation,
  }
}

// Note: when operating on a cluster with limited resources, due to fastify delay in registering,
// plugins we may miss the connectionCreated and connectionReady events thus we preferred using
// the isUp function that simply checks connection status is up and usable.
const isMongoUp = async(fastify) => fastify.collections.length === 0 || fastify.mongoDBCheckIsUp()

async function statusHandler(fastify) {
  const statusOK = await isMongoUp(fastify)
  const message = statusOK ? undefined : 'MongoDB status is unhealthy'
  return { statusOK, message }
}

async function readinessHandler(fastify) {
  const statusOK = await isMongoUp(fastify)

  return { statusOK }
}

module.exports.readinessHandler = readinessHandler
module.exports.checkUpHandler = statusHandler
