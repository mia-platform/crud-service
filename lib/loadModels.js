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
const { omit: lomit } = require('lodash')

const mergeViewsInCollections = require('./mergeViewsInCollections')
const { compatibilityModelJsonSchema, modelJsonSchema } = require('./model.jsonschema')
const createIndexes = require('./createIndexes')
const { OBJECTID, aggregationConversion } = require('./consts')
const JSONSchemaGenerator = require('./JSONSchemaGenerator')
const QueryParser = require('./QueryParser')
const CrudService = require('./CrudService')
const generatePathFieldsForRawSchema = require('./generatePathFieldsForRawSchema')
const { getIdType } = require('./mongo/mongo-plugin')
const { getDatabaseNameByType, getPrefixedDatabaseName } = require('./pkFactories')

const ajv = new Ajv({ useDefaults: true })
ajvFormats(ajv)
ajvKeywords(ajv)

const compatibilityValidate = ajv.compile(compatibilityModelJsonSchema)
const validate = ajv.compile(modelJsonSchema)

const PREFIX_OF_INDEX_NAMES_TO_PRESERVE = 'preserve_'
const VIEW_TYPE = 'view'

async function loadModels(fastify) {
  const { default: plimit } = await import('p-limit')
  const limiter = plimit(5)

  const { collections, views = [] } = fastify
  const mergedCollections = mergeViewsInCollections(collections, views)

  fastify.log.trace({ collectionNames: mergedCollections.map(coll => coll.name) }, 'Registering CRUDs and Views')

  // A side-effect from the collectionModelMapper updates the following data models.
  const models = {}
  const existingStringCollection = []
  const existingObjectIdCollection = []

  const promises = mergedCollections.map(
    (collectionDefinition) => limiter(() =>
      collectionModelMapper(
        fastify,
        mergedCollections,
        { models, existingStringCollection, existingObjectIdCollection }
      )(collectionDefinition)
    )
  )

  try {
    await Promise.all(promises)
    fastify.decorate('models', models)
  } catch (error) {
    fastify.log.error({ cause: error }, 'failed to load models')
    throw error
  }
}

function collectionModelMapper(
  fastify,
  mergedCollections,
  // The previous implementation of the mapper was with a closure function that applied a
  // side-effect on these values. During the refactor to apply p-limit I've decided not to
  // change the implementation, therefore I've wrapped the params to isolate them.
  { models, existingStringCollection, existingObjectIdCollection }
) {
  // eslint-disable-next-line max-statements
  return async(collectionDefinition) => {
    // avoid validating the collection definition twice, since it would only
    // match one of the two, depending on the existence of schema property
    if (!collectionDefinition.schema) {
      if (!compatibilityValidate(collectionDefinition)) {
        fastify.log.error({ collection: collectionDefinition.name }, compatibilityValidate.errors)
        throw new Error(`invalid collection definition: ${JSON.stringify(compatibilityValidate.errors)}`)
      }
    } else if (!validate(collectionDefinition)) {
      fastify.log.error(validate.errors)
      throw new Error(`invalid collection definition: ${JSON.stringify(validate.errors)}`)
    }

    const {
      source: viewSourceCollectionName,
      name: collectionName,
      endpointBasePath: collectionEndpoint,
      type,
      indexes = [],
      enableLookup,
      pipeline,
    } = collectionDefinition ?? {}
    const isView = type === VIEW_TYPE
    const viewLookupsEnabled = isView && enableLookup

    fastify.log.trace({ collectionEndpoint, collectionName }, 'Registering CRUD')

    const collectionIdType = getIdType(collectionDefinition)
    const collection = await fastify
      .mongo[getDatabaseNameByType(collectionIdType)]
      .db
      .collection(collectionName)
    const modelDependencies = buildModelDependencies(fastify, collectionDefinition, collection)

    let viewDependencies = {}
    if (viewLookupsEnabled) {
      const sourceCollection = mergedCollections.find(mod => mod.name === viewSourceCollectionName)
      const sourceCollectionDependencies = buildModelDependencies(fastify, sourceCollection)

      const viewIdType = getIdType(sourceCollection)
      const sourceCollectionMongo = await fastify
        .mongo[getDatabaseNameByType(viewIdType)]
        .db
        .collection(viewSourceCollectionName)
      viewDependencies = buildModelDependencies(fastify, collectionDefinition, sourceCollectionMongo)
      viewDependencies.queryParser = sourceCollectionDependencies.queryParser
      viewDependencies.allFieldNames = sourceCollectionDependencies.allFieldNames
      viewDependencies.lookupsModels = createLookupModel(fastify, collectionDefinition, mergedCollections)
    }

    models[getCollectionNameFromEndpoint(collectionEndpoint)] = {
      definition: collectionDefinition,
      ...modelDependencies,
      viewDependencies,
      isView,
      viewLookupsEnabled,
    }

    if (isView) {
      // check whether it exists a Mongo instance dedicated to creating Mongo Views before using the standard one
      const mongoInstance = fastify
        .mongo[getPrefixedDatabaseName(collectionIdType)] ?? fastify
        .mongo[getDatabaseNameByType(collectionIdType)]

      const existingCollections = collectionIdType === OBJECTID ? existingObjectIdCollection : existingStringCollection
      if (existingCollections.length === 0) {
        existingCollections.push(
          ...(
            await mongoInstance
              .db
              .listCollections({}, { nameOnly: true })
              .toArray()
          )
            .filter(({ type: collectionType }) => collectionType === VIEW_TYPE)
            .map(({ name }) => name)
        )
      }

      if (existingCollections.includes(collectionName)) {
        await mongoInstance
          .db
          .collection(collectionName)
          .drop()
      }

      return mongoInstance
        .db
        .createCollection(
          collectionName,
          {
            viewOn: viewSourceCollectionName,
            pipeline,
          }
        )
    }

    try {
      await createIndexes(collection, indexes, PREFIX_OF_INDEX_NAMES_TO_PRESERVE)
    } catch (error) {
      fastify.log.error({ cause: error, collectionName }, 'failed to create/update/delete an index on collection')
      throw new Error('failed setting up an index for collection', { cause: error })
    }
  }
}

function getCollectionNameFromEndpoint(endpointBasePath) {
  return endpointBasePath.replace('/', '').replace(/\//g, '-')
}

function createLookupModel(fastify, viewDefinition, mergedCollections) {
  const lookupModels = []
  const viewLookups = viewDefinition.pipeline
    .filter(pipeline => '$lookup' in pipeline)
    .map(lookup => Object.values(lookup).shift())

  for (const lookup of viewLookups) {
    const { from, pipeline } = lookup
    const lookupCollection = mergedCollections.find(({ name }) => name === from)
    const lookupIdType = getIdType(lookupCollection)
    const lookupCollectionMongo = fastify.mongo[getDatabaseNameByType(lookupIdType)].db.collection(from)

    const lookupProjection = pipeline?.find(({ $project }) => $project)?.$project ?? {}
    const parsedLookupProjection = []
    const lookupCollectionDefinition = {
      ...lomit(viewDefinition, ['fields']),
      schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    }

    Object.entries(lookupProjection)
      .forEach(([fieldName, schema]) => {
        parsedLookupProjection.push({ [fieldName]: schema })
        const conversion = Object.keys(schema).shift()
        if (schema !== 0) {
          if (!aggregationConversion[conversion]) {
            throw new Error(`Invalid view lookup definition: no explicit type found in ${JSON.stringify({ [fieldName]: schema })}`)
          }
          lookupCollectionDefinition.schema.properties[fieldName] = {
            type: aggregationConversion[conversion],
          }
        }
      })

    const lookupModel = {
      ...buildModelDependencies(fastify, lookupCollectionDefinition, lookupCollectionMongo),
      definition: lookupCollectionDefinition,
      lookup,
      parsedLookupProjection,
    }
    lookupModels.push(lookupModel)
  }
  return lookupModels
}

function buildModelDependencies(fastify, collectionDefinition, collection) {
  const {
    defaultState,
    defaultSorting,
  } = collectionDefinition

  const allFieldNames = collectionDefinition.fields
    ? collectionDefinition.fields.map(field => field.name)
    : Object.keys(collectionDefinition.schema.properties)
  const pathsForRawSchema = generatePathFieldsForRawSchema(fastify.log, collectionDefinition)

  // TODO: make this configurable
  const crudService = new CrudService(
    collection,
    defaultState,
    defaultSorting,
    { allowDiskUse: fastify.config.ALLOW_DISK_USE_IN_QUERIES },
  )
  const queryParser = new QueryParser(collectionDefinition, pathsForRawSchema)

  const jsonSchemaGenerator = new JSONSchemaGenerator(
    collectionDefinition,
    {},
    fastify.config.CRUD_LIMIT_CONSTRAINT_ENABLED,
    fastify.config.CRUD_MAX_LIMIT,
    fastify.config.ENABLE_STRICT_OUTPUT_VALIDATION,
    fastify.config.OPEN_API_SPECIFICATION,
  )
  const jsonSchemaGeneratorWithNested = new JSONSchemaGenerator(
    collectionDefinition,
    pathsForRawSchema,
    fastify.config.CRUD_LIMIT_CONSTRAINT_ENABLED,
    fastify.config.CRUD_MAX_LIMIT,
    fastify.config.ENABLE_STRICT_OUTPUT_VALIDATION,
    fastify.config.OPEN_API_SPECIFICATION,
  )

  return {
    crudService,
    queryParser,
    allFieldNames,
    jsonSchemaGenerator,
    jsonSchemaGeneratorWithNested,
  }
}

module.exports = loadModels
