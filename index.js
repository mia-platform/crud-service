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
const ajvFormats = require('ajv-formats')

const { readdirSync } = require('fs')
const { join } = require('path')
const { omit, clone } = require('ramda')

const myPackage = require('./package')
const QueryParser = require('./lib/QueryParser')
const CrudService = require('./lib/CrudService')
const ResultCaster = require('./lib/ResultCaster')
const httpInterface = require('./lib/httpInterface')
const JSONSchemaGenerator = require('./lib/JSONSchemaGenerator')
const createIndexes = require('./lib/createIndexes')
const { castCollectionId, getDatabaseNameByType } = require('./lib/pkFactories')
const { SCHEMA_CUSTOM_KEYWORDS, OBJECTID, SETCMD, aggregationConversion } = require('./lib/consts')
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
  const prefix = model.definition.endpointBasePath

  fastify.decorate('crudService', model.crudService)
  fastify.decorate('queryParser', model.queryParser)
  fastify.decorate('castResultsAsStream', model.castResultsAsStream)
  fastify.decorate('castItem', model.castItem)
  fastify.decorate('allFieldNames', model.allFieldNames)
  fastify.decorate('jsonSchemaGenerator', model.jsonSchemaGenerator)
  fastify.decorate('jsonSchemaGeneratorWithNested', model.jsonSchemaGeneratorWithNested)
  fastify.decorate('modelName', modelName)
  fastify.register(httpInterface, { prefix, registerGetters: true, registerSetters: !isView })
}

async function registerViewCrud(fastify, { modelName, lookups }) {
  if (!fastify.mongo) { throw new Error('`fastify.mongo` is undefined!') }
  if (!modelName) { throw new Error('`modelName` is undefined!') }

  fastify.log.trace({ modelName }, 'Registering View CRUD')

  const { definition, viewDependencies, crudService } = fastify.models[modelName]
  const prefix = definition.endpointBasePath

  fastify.decorate('crudService', viewDependencies.crudService)
  fastify.decorate('queryParser', viewDependencies.queryParser)
  fastify.decorate('castResultsAsStream', viewDependencies.castResultsAsStream)
  fastify.decorate('castItem', viewDependencies.castItem)
  fastify.decorate('allFieldNames', viewDependencies.allFieldNames)
  fastify.decorate('jsonSchemaGenerator', viewDependencies.jsonSchemaGenerator)
  fastify.decorate('jsonSchemaGeneratorWithNested', viewDependencies.jsonSchemaGenerator)
  fastify.decorate('modelName', modelName)
  fastify.addHook('preHandler', (request, _reply, done) => {
    for (const { as, localField } of lookups) {
      if (request?.body?.[as]) {
        request.body[localField] = request.body[as].value
        delete request.body[as]
      }
      if (request?.body?.[SETCMD]?.[as]) {
        request.body[SETCMD][localField] = request.body[SETCMD][as].value
        delete request.body[SETCMD][as]
      }
    }
    done()
  })

  fastify.addHook('preSerialization', async(request, _reply, payload) => {
    const { _id } = payload
    if (request.method === 'PATCH' && _id) {
      // eslint-disable-next-line no-underscore-dangle
      const doc = await crudService._mongoCollection.findOne({ _id })
      return doc
    }
    return payload
  })

  fastify.register(httpInterface, { prefix, registerGetters: false, registerSetters: true })
}

async function registerViewCrudLookup(fastify, { modelName, lookupModel }) {
  if (!fastify.mongo) { throw new Error('`fastify.mongo` is undefined!') }

  fastify.log.trace({ modelName }, 'Registering ViewLookup CRUD')

  const {
    as: modelField,
  } = lookupModel.lookup

  const { definition } = fastify.models[modelName]
  const prefix = definition.endpointBasePath
  const lookupPrefix = join(prefix, 'lookup', modelField)


  fastify.decorate('crudService', lookupModel.crudService)
  fastify.decorate('queryParser', lookupModel.queryParser)
  fastify.decorate('castResultsAsStream', lookupModel.castResultsAsStream)
  fastify.decorate('castItem', lookupModel.castItem)
  fastify.decorate('allFieldNames', lookupModel.allFieldNames)
  fastify.decorate('jsonSchemaGenerator', lookupModel.jsonSchemaGenerator)
  fastify.decorate('jsonSchemaGeneratorWithNested', lookupModel.jsonSchemaGenerator)
  fastify.decorate('modelName', modelName)
  fastify.decorate('lookupProjection', lookupModel.parsedLookupProjection)
  fastify.register(httpInterface, {
    prefix: lookupPrefix,
    registerGetters: false,
    registerSetters: false,
    registerLookup: true,
  })
}

const registerDatabase = fp(registerMongoInstances, { decorators: { fastify: ['config'] } })

async function iterateOverCollectionDefinitionAndRegisterCruds(fastify) {
  fastify.decorate('castCollectionId', castCollectionId(fastify))
  fastify.decorate('userIdHeaderKey', fastify.config.USER_ID_HEADER_KEY.toLowerCase())

  for (const [modelName, model] of Object.entries(fastify.models)) {
    const { isView, viewHasLookupEndpints, viewDependencies } = model
    fastify.register(registerCrud, {
      modelName,
      isView,
    })

    if (viewHasLookupEndpints) {
      const lookups = viewDependencies.lookupsModels.map(({ lookup }) => lookup)
      fastify.register(registerViewCrud, {
        modelName,
        lookups,
      })

      for (const lookupModel of viewDependencies.lookupsModels) {
        fastify.register(registerViewCrudLookup, {
          modelName,
          lookupModel,
        })
      }
    }
  }
}

function buildModelDependencies(fastify, collection, collectionDefinition) {
  const {
    defaultState,
  } = collectionDefinition

  const allFieldNames = collectionDefinition.fields
    ? collectionDefinition.fields.map(field => field.name)
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

  return {
    crudService,
    queryParser,
    castResultsAsStream: () => resultCaster.asStream(),
    castItem: (item) => resultCaster.castItem(item),
    allFieldNames,
    jsonSchemaGenerator,
    jsonSchemaGeneratorWithNested,
  }
}

function createLookupModel(fastify, viewDefinition, mergedCollections) {
  const lookupModels = []
  const viewLookups = viewDefinition.pipeline
    .filter(pipeline => '$lookup' in pipeline)
    .map(lookup => Object.values(lookup).shift())

  for (const lookup of viewLookups) {
    const { from, pipeline } = lookup
    const lookupCollection = clone(mergedCollections.find(({ name }) => name === from))
    const lookupIdType = getIdType(lookupCollection)
    const lookupCollectionMongo = fastify.mongo[getDatabaseNameByType(lookupIdType)].db.collection(from)

    const lookupProjection = pipeline.find(({ $project }) => $project !== undefined)?.$project ?? {}
    const parsedLookupProjection = []
    const lookupCollectionDefinition = { ...viewDefinition, fields: [] }

    Object.entries(lookupProjection)
      .forEach(([key, value]) => {
        parsedLookupProjection.push({ [key]: value })
        const conversion = Object.keys(value).shift()
        if (value !== 0) {
          lookupCollectionDefinition.fields.push({
            name: key,
            type: aggregationConversion[conversion],
          })
        }
      })

    const lookupModel = {
      ...buildModelDependencies(fastify, lookupCollectionMongo, lookupCollectionDefinition),
      definition: lookupCollectionDefinition,
      lookup,
      parsedLookupProjection,
    }
    lookupModels.push(lookupModel)
  }
  return lookupModels
}

// eslint-disable-next-line max-statements
async function loadModels(fastify) {
  const { collections, views = [] } = fastify
  const mergedCollections = mergeViewsInCollections(collections, views)

  fastify.log.trace({ collectionNames: mergedCollections.map(coll => coll.name) }, 'Registering CRUDs and Views')

  const models = {}
  const existingStringCollection = []
  const existingObjectIdCollection = []

  // eslint-disable-next-line max-statements
  const promises = mergedCollections.map(async(collectionDefinition) => {
    // avoid validating the collection definition twice, since it would only
    // match one of the two, depending on the existence of schema property
    if (!collectionDefinition.schema) {
      if (!compatibilityValidate(collectionDefinition)) {
        fastify.log.error(compatibilityValidate.errors)
        throw new Error(`invalid collection definition: ${JSON.stringify(compatibilityValidate.errors)}`)
      }
    } else if (!validate(collectionDefinition)) {
      fastify.log.error(validate.errors)
      throw new Error(`invalid collection definition: ${JSON.stringify(validate.errors)}`)
    }

    const {
      source: viewSourceCollectionName,
      fields: collectionFields,
      name: collectionName,
      endpointBasePath: collectionEndpoint,
      type,
      indexes = [],
      enableLookup,
      source,
      pipeline,
    } = collectionDefinition ?? {}
    const isView = type === VIEW_TYPE
    const viewHasLookupEndpints = isView && enableLookup

    fastify.log.trace({ collectionEndpoint, collectionName }, 'Registering CRUD')

    const collectionIdType = getIdType(collectionDefinition)
    const collection = await fastify
      .mongo[getDatabaseNameByType(collectionIdType)]
      .db
      .collection(collectionName)

    const modelDependencies = buildModelDependencies(fastify, collection, collectionDefinition)

    let viewDependencies = {}
    if (viewHasLookupEndpints) {
      const sourceCollection = clone(mergedCollections.find(mod => mod.name === viewSourceCollectionName))
      for (const field of collectionFields) {
        if (sourceCollection.fields.findIndex(fie => fie.name === field.name) === -1) {
          sourceCollection.fields.push(field)
        }
      }
      const dependencyWithFieldIntersection = buildModelDependencies(fastify, {}, sourceCollection)

      const viewIdType = getIdType(sourceCollection)
      const sourceCollectionMongo = fastify.mongo[getDatabaseNameByType(viewIdType)].db
        .collection(viewSourceCollectionName)
      viewDependencies = buildModelDependencies(fastify, sourceCollectionMongo, collectionDefinition)
      viewDependencies.queryParser = dependencyWithFieldIntersection.queryParser
      viewDependencies.allFieldNames = dependencyWithFieldIntersection.allFieldNames
      viewDependencies.lookupsModels = createLookupModel(fastify, collectionDefinition, mergedCollections)
    }

    models[getCollectionNameFromEndpoint(collectionEndpoint)] = {
      definition: collectionDefinition,
      ...modelDependencies,
      viewDependencies,
      isView,
      viewHasLookupEndpints,
    }

    if (isView) {
      const existingCollections = collectionIdType === OBJECTID ? existingObjectIdCollection : existingStringCollection
      if (existingCollections.length === 0) {
        existingCollections.push(
          ...(
            await fastify
              .mongo[getDatabaseNameByType(collectionIdType)]
              .db
              .listCollections({}, { nameOnly: true })
              .toArray()
          )
            .filter(({ type: collectionType }) => collectionType === VIEW_TYPE)
            .map(({ name }) => name)
        )
      }

      if (existingCollections.includes(collectionName)) {
        await fastify
          .mongo[getDatabaseNameByType(collectionIdType)]
          .db
          .collection(collectionName)
          .drop()
      }

      return fastify
        .mongo[getDatabaseNameByType(collectionIdType)]
        .db
        .createCollection(
          collectionName,
          {
            viewOn: source,
            pipeline,
          }
        )
    }

    return createIndexes(collection, indexes, PREFIX_OF_INDEX_NAMES_TO_PRESERVE)
  })
  while (promises.length) {
    await Promise.all(promises.splice(0, 5))
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
}

module.exports.swaggerDefinition = {
  openApiSpecification: 'swagger',
  info: {
    title: 'Crud Service',
    description: myPackage.description,
    version: myPackage.version,
  },
}

module.exports.transformSchemaForSwagger = ({ schema, url } = {}) => {
  // route with undefined schema will not be shown
  if (!schema) {
    return {
      url,
      schema: {
        hide: true,
      },
    }
  }

  const {
    params = undefined,
    body = undefined,
    querystring = undefined,
    response = undefined,
    ...others
  } = schema ?? {}
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
