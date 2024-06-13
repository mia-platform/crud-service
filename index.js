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
const fastJson = require('fast-json-stringify')

const ajvFormats = require('ajv-formats')

const { unset: lunset } = require('lodash')
const { readdirSync } = require('fs')
const { join } = require('path')
const { ObjectId } = require('mongodb')
const { JSONPath } = require('jsonpath-plus')
const { hrtime } = require('node:process')

const myPackage = require('./package')
const fastifyEnvSchema = require('./envSchema')

const httpInterface = require('./lib/httpInterface')
const loadModels = require('./lib/loadModels')
const joinPlugin = require('./lib/joinPlugin')

const { castCollectionId } = require('./lib/pkFactories')
const {
  SCHEMA_CUSTOM_KEYWORDS,
  SETCMD,
  PUSHCMD,
  PULLCMD,
  UNSETCMD,
  ADDTOSETCMD,
} = require('./lib/consts')
const { registerMongoInstances } = require('./lib/mongo/mongo-plugin')
const { getAjvResponseValidationFunction, ajvSerializer } = require('./lib/validatorGetters')
const { pointerSeparator } = require('./lib/JSONPath.utils')
const { registerHelperRoutes } = require('./lib/helpersRoutes')

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
  await fastify.register(httpInterface, { prefix, registerGetters: true, registerSetters: !isView })
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

  // To allow writing views without having to rewrite all the logic of the HttpInterface,
  // it was decided to adapt the fields of the calls towards the view by converting them
  // to the fields of the underlying collection, thus hiding the complexity on the client
  // side while maintaining consistent interfaces.
  // This assumes that the key of the value is in the field "value" and should be made configurable.
  fastify.addHook('preHandler', (request, _reply, done) => {
    for (const { as, localField } of lookups) {
      if (request?.body?.[as]) {
        const lookupReference = request.body[as]
        delete request.body[as]

        request.body[localField] = mapLookupToObjectId(lookupReference)
      }

      for (const command of [SETCMD, UNSETCMD, PUSHCMD, PULLCMD, ADDTOSETCMD]) {
        if (request?.body?.[command]?.[as]) {
          const lookupReference = request.body[command][as]
          delete request.body[command][as]

          request.body[command][localField] = mapLookupToObjectId(lookupReference)
        }
      }
    }

    done()
  })

  // To obtain the updated object with a consistent interface after a patch,
  // it is necessary to retrieve the view object again before returning it to the client.
  fastify.addHook('preSerialization', async function preSerializer(request, _reply, payload) {
    const { _id } = payload
    if (request.method === 'PATCH' && _id) {
      const docId = this.castCollectionId(_id)
      // eslint-disable-next-line no-underscore-dangle
      const doc = await crudService._mongoCollection.findOne({ _id: docId })

      const validatePatch = getAjvResponseValidationFunction(request.routeSchema.response['200'])
      validatePatch(doc)
      return doc
    }
    return payload
  })

  await fastify.register(httpInterface, { prefix, registerGetters: false, registerSetters: true })
}

function mapLookupToObjectId(reference) {
  // consider both one-to-one and one-to-many relationships
  if (Array.isArray(reference)) {
    return reference
      .map(ref => (ref?.value ? new ObjectId(ref.value) : undefined))
      .filter(Boolean)
  }

  return reference?.value ? new ObjectId(reference.value) : undefined
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
      const lookups = viewDependencies.lookupsModels.map(({ lookup }) => lookup)
      await fastify.register(registerViewCrud, {
        modelName,
        lookups,
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
    fastify.setSerializerCompiler(({ schema, url, method }) => {
      const stringify = fastJson(schema)
      if (url.includes('/bulk') && method !== 'GET') {
        return data => stringify(data)
      }
      const validateFunction = schema?.operationId && ENABLE_STRICT_OUTPUT_VALIDATION
        ? ajvSerializer.compile(schema) : null

      return data => {
        const stringifiedValue = JSON.stringify(data, (_, value) => {
          if (typeof value === 'object' && value !== null && value.type === 'Point' && Array.isArray(value.coordinates)) {
            return value.coordinates
          } else if (value instanceof ObjectId) {
            return value.toString()
          } else if (value instanceof Date) {
            return value.toISOString()
          }
          return value
        })

        if (validateFunction) {
          const validate = ajvSerializer.compile(schema)
          const updatedData = JSON.parse(stringifiedValue)

          validate(updatedData)
          return stringify(updatedData)
        }
        return stringify(JSON.parse(stringifiedValue))
      }
    })
    await fastify.register(registerDatabase)
    await fastify.register(fp(loadModels))
    await fastify.register(iterateOverCollectionDefinitionAndRegisterCruds)
    await fastify.register(joinPlugin, { prefix: '/join' })
    await fastify.register(registerHelperRoutes, { prefix: HELPERS_PREFIX })
  }
}

/* =============================================================================== */

module.exports = async function plugin(fastify, opts) {
  const start = hrtime.bigint()

  fastify.addHook('onReady', () => {
    fastify.log.info({ elapsedMs: Number(hrtime.bigint() - start) / 1_000_000 }, 'ready event reached')
  })
  fastify.addHook('onListen', () => {
    fastify.log.info({ elapsedMs: Number(hrtime.bigint() - start) / 1_000_000 }, 'listen event reached')
  })


  await fastify.register(fastifyEnv, { schema: fastifyEnvSchema, data: opts })
  await fastify.register(fastifyMultipart, {
    limits: {
      fields: 5,
      // Conversion Byte to Mb
      fileSize: fastify.config.MAX_MULTIPART_FILE_BYTES * 1000000,
      files: 1,
    },
  })
  await fastify.register(fp(setupCruds, { decorators: { fastify: ['config'] } }))
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

  if (params) { transformed.params = getTransformedSchema(params) }
  if (body) { transformed.body = getTransformedSchema(body) }
  if (querystring) { transformed.querystring = getTransformedSchema(querystring) }
  if (response) {
    transformed.response = {
      ...response,
      ...response['200'] ? { 200: getTransformedSchema(response['200']) } : {},
    }
  }

  return { schema: transformed, url }
}

function getTransformedSchema(httpPartSchema) {
  if (!httpPartSchema) { return }
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
