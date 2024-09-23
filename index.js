/* eslint-disable no-await-in-loop */
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
const fastifyEnv = require('@fastify/env')
const fastifyMultipart = require('@fastify/multipart')

const ajvFormats = require('ajv-formats')

const { unset: lunset } = require('lodash')
const { readdirSync } = require('fs')
const { join } = require('path')
const { JSONPath } = require('jsonpath-plus')


const myPackage = require('./package')
const fastifyEnvSchema = require('./envSchema')

const httpInterface = require('./lib/httpInterface')
const loadModels = require('./lib/loadModels')
const joinPlugin = require('./lib/joinPlugin')

const { castCollectionId } = require('./lib/pkFactories')
const {
  SCHEMA_CUSTOM_KEYWORDS,
} = require('./lib/consts')
const { registerMongoInstances } = require('./lib/mongo/mongo-plugin')
const { ajvSerializer } = require('./lib/validatorGetters')
const { pointerSeparator } = require('./lib/JSONPath.utils')
const { registerHelperRoutes } = require('./lib/helpersRoutes')
const AdditionalCaster = require('./lib/AdditionalCaster')
const { addSerializerCompiler } = require('./lib/compilers')
const {
  addAclHook,
  addHealthHooks,
  addPreHandlerHooks,
  addLookupHook,
  addPatchViewHook,
  addModelNameHook,
} = require('./lib/hooks')

function decorateCrud(fastify, model, modelName) {
  fastify.decorate('crudService', model.crudService)
  fastify.decorate('queryParser', model.queryParser)
  fastify.decorate('allFieldNames', model.allFieldNames)
  fastify.decorate('jsonSchemaGenerator', model.jsonSchemaGenerator)
  fastify.decorate('jsonSchemaGeneratorWithNested', model.jsonSchemaGenerator)
  fastify.decorate('modelName', modelName)
  addModelNameHook(fastify, modelName)
}

async function registerCrud(fastify, { modelName, isView }) {
  if (!fastify.mongo) {
    throw new Error('`fastify.mongo` is undefined!')
  }
  if (!modelName) {
    throw new Error('`modelName` is undefined!')
  }

  fastify.log.trace({ modelName }, 'Registering CRUD')

  const model = fastify.models[modelName]
  const prefix = model.definition.endpointBasePath

  decorateCrud(fastify, model, modelName)

  await fastify.register(httpInterface, { prefix, registerGetters: true, registerSetters: !isView })
}

async function registerViewCrud(fastify, { modelName }) {
  if (!fastify.mongo) {
    throw new Error('`fastify.mongo` is undefined!')
  }
  if (!modelName) {
    throw new Error('`modelName` is undefined!')
  }

  fastify.log.trace({ modelName }, 'Registering View CRUD')

  const { definition, viewDependencies } = fastify.models[modelName]
  const prefix = definition.endpointBasePath

  decorateCrud(fastify, viewDependencies, modelName)
  await fastify.register(httpInterface, { prefix, registerGetters: false, registerSetters: true })
}

async function registerViewCrudLookup(fastify, { modelName, lookupModel }) {
  if (!fastify.mongo) {
    throw new Error('`fastify.mongo` is undefined!')
  }

  fastify.log.trace({ modelName }, 'Registering ViewLookup CRUD')

  const {
    as: modelField,
  } = lookupModel.lookup

  const { definition } = fastify.models[modelName]
  const prefix = definition.endpointBasePath
  const lookupPrefix = join(prefix, 'lookup', modelField)

  decorateCrud(fastify, lookupModel, modelName)

  fastify.decorate('lookupProjection', lookupModel.parsedLookupProjection)

  await fastify.register(httpInterface, {
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
    const { isView, viewLookupsEnabled, viewDependencies } = model
    if (viewLookupsEnabled) {
      await fastify.register(registerViewCrud, {
        modelName,
      })

      for (const lookupModel of viewDependencies.lookupsModels) {
        await fastify.register(registerViewCrudLookup, {
          modelName,
          lookupModel,
        })
      }
    }

    await fastify.register(registerCrud, {
      modelName,
      isView,
    })
  }
}

const validCrudFolder = path => !['.', '..'].includes(path) && /\.js(on)?$/.test(path)

async function customErrorHandler(error, request, reply) {
  if (error.statusCode === 404) {
    return notFoundHandler(request, reply)
  }

  request.log.error({ cause: error?.validation ?? error }, 'invalid request received')

  if (error.validation?.[0]?.message === 'must NOT have additional properties') {
    reply.code(error.statusCode)
    throw new Error(`${error.message}. Property "${error.validation[0].params.additionalProperty}" is not defined in validation schema`)
  }

  throw error
}

async function notFoundHandler(_, reply) {
  reply
    .code(404)
    .send({
      error: 'not found',
    })
}


async function setupCruds(fastify) {
  const {
    COLLECTION_DEFINITION_FOLDER,
    VIEWS_DEFINITION_FOLDER,
    HELPERS_PREFIX,
    ENABLE_STRICT_OUTPUT_VALIDATION,
  } = fastify.config

  const additionalCaster = new AdditionalCaster()

  fastify.decorate('castResultsAsStream', additionalCaster.castResultsAsStream)
  fastify.decorate('castItem', additionalCaster.castItem)
  fastify.decorate('validateOutput', ENABLE_STRICT_OUTPUT_VALIDATION)
  fastify.setNotFoundHandler(notFoundHandler)
  fastify.setErrorHandler(customErrorHandler)
  const collections = readdirSync(COLLECTION_DEFINITION_FOLDER)
    .filter(validCrudFolder)
    .map(path => join(COLLECTION_DEFINITION_FOLDER, path))
    .map(require)

  fastify.decorate('collections', collections)

  const viewsFolder = VIEWS_DEFINITION_FOLDER
  if (viewsFolder) {
    const views = readdirSync(viewsFolder)
      .filter(validCrudFolder)
      .map(path => join(viewsFolder, path))
      .map(require)

    fastify.decorate('views', views)
  }

  if (collections.length > 0) {
    addSerializerCompiler(fastify, ajvSerializer, ENABLE_STRICT_OUTPUT_VALIDATION)

    await fastify.register(registerDatabase)
    await fastify.register(fp(loadModels))

    await fastify.register(iterateOverCollectionDefinitionAndRegisterCruds)
    await fastify.register(joinPlugin, { prefix: '/join' })
    await fastify.register(registerHelperRoutes, { prefix: HELPERS_PREFIX })
  } else {
    fastify.log.warn('no collection definition provided')
  }

  /** ===============================  HOOKS  ===============================  */
  addLookupHook(fastify)
  addPatchViewHook(fastify)
}

/* =============================================================================== */

module.exports = async function plugin(fastify, opts) {
  addHealthHooks(fastify)
  addAclHook(fastify)
  addPreHandlerHooks(fastify)

  await fastify.register(fastifyEnv, { schema: fastifyEnvSchema, data: opts })
  await fastify.register(fastifyMultipart, {
    limits: {
      fields: 5,
      // Conversion Byte to Mb
      fileSize: fastify.config.MAX_MULTIPART_FILE_BYTES * 1000000,
      files: 1,
    },
  })

  try {
    await fastify.register(fp(setupCruds, { decorators: { fastify: ['config'] } }))
  } catch (error) {
    fastify.log.fatal({ cause: error }, 'failed to setup CRUD Service components')
  }
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
  openApiSpecification: process.env.OPEN_API_SPECIFICATION ?? 'swagger',
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
  } = schema
  const transformed = { ...others }

  if (params) {
    transformed.params = getTransformedSchema(params)
  }
  if (body) {
    transformed.body = getTransformedSchema(body)
  }
  if (querystring) {
    transformed.querystring = getTransformedSchema(querystring)
  }
  if (response) {
    transformed.response = {
      ...response,
      ...response['200'] ? { 200: getTransformedSchema(response['200']) } : {},
    }
  }

  return { schema: transformed, url }
}

function getTransformedSchema(httpPartSchema) {
  if (!httpPartSchema) {
    return
  }
  const KEYS_TO_UNSET = [
    SCHEMA_CUSTOM_KEYWORDS.UNIQUE_OPERATION_ID,
    ...JSONPath({
      json: httpPartSchema,
      resultType: 'pointer',
      path: '$..[?(@ && @.type && Array.isArray(@.type))]',
    })
      .map(pointer => [
        `${pointer
          .slice(1)
          .replace(pointerSeparator, '.')}.type`,
        `${pointer
          .slice(1)
          .replace(pointerSeparator, '.')}.nullable`,
      ])
      .flat(),
  ]

  const response = httpPartSchema
  KEYS_TO_UNSET.forEach(keyToUnset => {
    lunset(response, `${keyToUnset}`)
  })

  return response
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
