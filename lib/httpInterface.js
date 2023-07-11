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

/* eslint-disable max-lines */

'use strict'

const Ajv = require('ajv')
const ajvFormats = require('ajv-formats')
const ajvKeywords = require('ajv-keywords')
const ndjson = require('ndjson')
const csvParse = require('csv-parse')
const csvStringify = require('csv-stringify')
const fastJson = require('fast-json-stringify')

const { pipeline } = require('stream/promises')
const lget = require('lodash.get')
const JSONStream = require('JSONStream')
const through2 = require('through2')

const lisEmpty = require('lodash.isempty')


const {
  SORT,
  PROJECTION,
  RAW_PROJECTION,
  QUERY,
  LIMIT,
  SKIP,
  STATE,
  INVALID_USERID,
  UPDATERID,
  UPDATEDAT,
  CREATORID,
  CREATEDAT,
  __STATE__,
  SCHEMA_CUSTOM_KEYWORDS,
  rawProjectionDictionary,
} = require('./consts')

const BadRequestError = require('./BadRequestError')
const { SCHEMAS_ID } = require('./schemaGetters')
const { getAjvResponseValidationFunction, shouldValidateStream, shouldValidateItem } = require('./validatorGetters')
const BatchWritableStream = require('./BatchWritableStream')

const BAD_REQUEST_ERROR_STATUS_CODE = 400
const INTERNAL_SERVER_ERROR_STATUS_CODE = 500
const OPTIONS_INCOMPATIBILITY_ERROR_CODE = 2
const UNIQUE_INDEX_ERROR_STATUS_CODE = 422
const UNIQUE_INDEX_MONGO_ERROR_CODE = 11000

const PROMETHEUS_OP_TYPE = {
  FETCH: 'fetch',
  INSERT_OR_UPDATE: 'insert_or_update',
  DELETE: 'delete',
  CHANGE_STATE: 'change_state',
}


// eslint-disable-next-line max-statements
module.exports = async function getHttpInterface(fastify, options) {
  if (!fastify.crudService) { throw new Error('`fastify.crudService` is undefined') }
  if (!fastify.queryParser) { throw new Error('`fastify.queryParser` is undefined') }
  if (!fastify.castCollectionId) { throw new Error('`fastify.castCollectionId` is undefined') }
  if (!fastify.castResultsAsStream) { throw new Error('`fastify.castResultsAsStream` is undefined') }
  if (!fastify.castItem) { throw new Error('`fastify.castItem` is undefined') }
  if (!fastify.allFieldNames) { throw new Error('`fastify.allFieldNames` is undefined') }
  if (!fastify.jsonSchemaGenerator) { throw new Error('`fastify.jsonSchemaGenerator` is undefined') }
  if (!fastify.jsonSchemaGeneratorWithNested) { throw new Error('`fastify.jsonSchemaGeneratorWithNested` is undefined') }
  if (!fastify.userIdHeaderKey) { throw new Error('`fastify.userIdHeaderKey` is undefined') }
  if (!fastify.modelName) { throw new Error('`fastify.modelName` is undefined') }

  const {
    registerGetters = true,
    registerSetters = true,
    registerLookup = false,
  } = options

  const validateOutput = fastify.validateOutput ?? false

  const NESTED_SCHEMAS_BY_ID = {
    [SCHEMAS_ID.GET_LIST]: fastify.jsonSchemaGeneratorWithNested.generateGetListJSONSchema(),
    [SCHEMAS_ID.GET_LIST_LOOKUP]: fastify.jsonSchemaGeneratorWithNested.generateGetListLookupJSONSchema(),
    [SCHEMAS_ID.GET_ITEM]: fastify.jsonSchemaGeneratorWithNested.generateGetItemJSONSchema(),
    [SCHEMAS_ID.EXPORT]: fastify.jsonSchemaGeneratorWithNested.generateExportJSONSchema(),
    [SCHEMAS_ID.POST_ITEM]: fastify.jsonSchemaGeneratorWithNested.generatePostJSONSchema(),
    [SCHEMAS_ID.POST_BULK]: fastify.jsonSchemaGeneratorWithNested.generateBulkJSONSchema(),
    // it is not possible to validate a stream
    [SCHEMAS_ID.POST_FILE]: { body: {} },
    [SCHEMAS_ID.PATCH_FILE]: { body: {} },
    [SCHEMAS_ID.DELETE_ITEM]: fastify.jsonSchemaGeneratorWithNested.generateDeleteJSONSchema(),
    [SCHEMAS_ID.DELETE_LIST]: fastify.jsonSchemaGeneratorWithNested.generateDeleteListJSONSchema(),
    [SCHEMAS_ID.PATCH_ITEM]: fastify.jsonSchemaGeneratorWithNested.generatePatchJSONSchema(),
    [SCHEMAS_ID.PATCH_MANY]: fastify.jsonSchemaGeneratorWithNested.generatePatchManyJSONSchema(),
    [SCHEMAS_ID.PATCH_BULK]: fastify.jsonSchemaGeneratorWithNested.generatePatchBulkJSONSchema(),
    [SCHEMAS_ID.UPSERT_ONE]: fastify.jsonSchemaGeneratorWithNested.generateUpsertOneJSONSchema(),
    [SCHEMAS_ID.COUNT]: fastify.jsonSchemaGeneratorWithNested.generateCountJSONSchema(),
    [SCHEMAS_ID.VALIDATE]: fastify.jsonSchemaGeneratorWithNested.generateValidateJSONSchema(),
    [SCHEMAS_ID.CHANGE_STATE]: fastify.jsonSchemaGeneratorWithNested.generateChangeStateJSONSchema(),
    [SCHEMAS_ID.CHANGE_STATE_MANY]: fastify.jsonSchemaGeneratorWithNested.generateChangeStateManyJSONSchema(),
  }

  // for each collection define its dedicated validator instance
  const ajv = new Ajv({
    coerceTypes: true,
    useDefaults: true,
    allowUnionTypes: true,
    // allow properties and pattern properties to overlap -> this should help validating nested fields
    allowMatchingProperties: true,
  })
  ajvFormats(ajv)
  ajvKeywords(ajv, 'instanceof')
  ajv.addVocabulary(Object.values(SCHEMA_CUSTOM_KEYWORDS))

  fastify.setValidatorCompiler(({ schema }) => {
    const uniqueId = schema[SCHEMA_CUSTOM_KEYWORDS.UNIQUE_OPERATION_ID]
    const [collectionName, schemaId, subSchemaPath] = uniqueId.split('__MIA__')
    const nestedSchema = NESTED_SCHEMAS_BY_ID[schemaId]
    const subSchema = lget(nestedSchema, subSchemaPath)
    fastify.log.debug({ collectionName, schemaPath: subSchemaPath, schemaId }, 'collection schema info')

    // this is made to prevent to shows on swagger all properties with dot notation of RawObject with schema.
    return ajv.compile(subSchema)
  })

  fastify.addHook('preHandler', injectContextInRequest)
  fastify.addHook('preHandler', request => parseEncodedJsonQueryParams(fastify.log, request))
  fastify.setErrorHandler(customErrorHandler)

  if (registerSetters) {
    fastify.post(
      '/',
      { schema: fastify.jsonSchemaGenerator.generatePostJSONSchema() },
      handleInsertOne
    )
    fastify.post(
      '/validate',
      { schema: fastify.jsonSchemaGenerator.generateValidateJSONSchema() },
      handleValidate
    )
    fastify.delete(
      '/:id',
      { schema: fastify.jsonSchemaGenerator.generateDeleteJSONSchema() },
      handleDeleteId
    )
    fastify.delete(
      '/',
      { schema: fastify.jsonSchemaGenerator.generateDeleteListJSONSchema() },
      handleDeleteList
    )

    const patchIdSchema = fastify.jsonSchemaGenerator.generatePatchJSONSchema()
    fastify.patch(
      '/:id',
      {
        schema: patchIdSchema,
        config: {
          itemValidator: shouldValidateItem(patchIdSchema.response['200'], validateOutput),
        },
      },
      handlePatchId
    )
    fastify.patch(
      '/',
      { schema: fastify.jsonSchemaGenerator.generatePatchManyJSONSchema() },
      handlePatchMany
    )

    const upsertOneSchema = fastify.jsonSchemaGenerator.generateUpsertOneJSONSchema()
    fastify.post(
      '/upsert-one', {
        schema: upsertOneSchema,
        config: {
          itemValidator: shouldValidateItem(upsertOneSchema.response['200'], validateOutput),
        },
      },
      handleUpsertOne
    )

    fastify.post('/bulk', {
      schema: fastify.jsonSchemaGenerator.generateBulkJSONSchema(),
    }, handleInsertMany)
    fastify.patch('/bulk', {
      schema: fastify.jsonSchemaGenerator.generatePatchBulkJSONSchema(),
    }, handlePatchBulk)
    fastify.post(
      '/:id/state',
      { schema: fastify.jsonSchemaGenerator.generateChangeStateJSONSchema() },
      handleChangeStateById
    )
    fastify.post(
      '/state',
      { schema: fastify.jsonSchemaGenerator.generateChangeStateManyJSONSchema() },
      handleChangeStateMany
    )

    const importPostSchema = fastify.jsonSchemaGenerator.generatePostImportJSONSchema()
    fastify.post(
      '/import',
      {
        schema: importPostSchema,
        config: {
          itemValidator: getAjvResponseValidationFunction(importPostSchema.streamBody),
          validateImportOptions: getAjvResponseValidationFunction(importPostSchema.optionSchema,
            { removeAdditional: false }
          ),
        },
      },
      handleCollectionImport
    )

    const importPatchSchema = fastify.jsonSchemaGenerator.generatePatchImportJSONSchema()
    fastify.patch(
      '/import',
      {
        schema: importPatchSchema,
        config: {
          itemValidator: getAjvResponseValidationFunction(importPatchSchema.streamBody),
          validateImportOptions: getAjvResponseValidationFunction(importPatchSchema.optionSchema,
            { removeAdditional: false }
          ),
        },
      },
      handleCollectionImport
    )
  }

  if (registerLookup) {
    if (!fastify.lookupProjection) { throw new Error('`fastify.lookupProjection` is undefined') }
    const listLookupSchema = fastify.jsonSchemaGenerator.generateGetListLookupJSONSchema()
    fastify.get('/', {
      schema: listLookupSchema,
      config: {
        streamValidator: shouldValidateStream(listLookupSchema.response['200'], validateOutput),
        replyType: () => 'application/json',
      },
    }, handleGetListLookup)
  }

  if (registerGetters) {
    const getItemJSONSchema = fastify.jsonSchemaGenerator.generateGetItemJSONSchema()
    fastify.get('/export', {
      schema: fastify.jsonSchemaGenerator.generateExportJSONSchema(),
      config: {
        streamValidator: shouldValidateStream(getItemJSONSchema.response['200'], validateOutput),
        replyType: (accept) => accept ?? 'application/x-ndjson',
      },
    }, handleGetList)
    fastify.get('/count', { schema: fastify.jsonSchemaGenerator.generateCountJSONSchema() }, handleCount)
    fastify.setNotFoundHandler(notFoundHandler)
    fastify.get('/', {
      schema: fastify.jsonSchemaGenerator.generateGetListJSONSchema(),
      config: {
        streamValidator: shouldValidateStream(getItemJSONSchema.response['200'], validateOutput),
        replyType: () => 'application/json',
      },
    }, handleGetList)
    fastify.get('/:id', {
      schema: getItemJSONSchema,
      config: {
        itemValidator: shouldValidateItem(getItemJSONSchema.response['200'], validateOutput),
      },
    }, handleGetId)
  }
}

// eslint-disable-next-line max-statements
async function handleCollectionImport(request, reply) {
  if (this.customMetrics) {
    this.customMetrics.collectionInvocation.inc({
      collection_name: this.modelName,
      type: PROMETHEUS_OP_TYPE.IMPORT,
    })
  }

  if (!request.isMultipart()) {
    return reply.getHttpError(BAD_REQUEST_ERROR_STATUS_CODE, 'Request is not multipart')
  }

  const data = await request.file()
  if (!data) {
    return reply.getHttpError(BAD_REQUEST_ERROR_STATUS_CODE, 'Missing file')
  }
  const { file, mimetype, fields } = data
  const parsingOptions = Object.fromEntries(Object.values(fields)
    .filter(field => field.type === 'field')
    .map(({ fieldname, value }) => [fieldname, value]))

  const { itemValidator, validateImportOptions } = reply.context.config
  const isValid = validateImportOptions(parsingOptions)
  if (!isValid) {
    return reply.getHttpError(BAD_REQUEST_ERROR_STATUS_CODE, `Invalid options`)
  }

  const bodyParser = getFileMimeParser(mimetype, parsingOptions)
  if (!bodyParser) {
    return reply.getHttpError(BAD_REQUEST_ERROR_STATUS_CODE, `Unsupported file type ${mimetype}`)
  }

  const { crudService, queryParser } = this
  const { log, crudContext } = request

  let documentIndex = 0
  const parseDocument = through2.obj((chunk, _enc, callback) => {
    try {
      itemValidator(chunk)
      if (itemValidator.errors) { throw itemValidator.errors }
      queryParser.parseAndCastBody(chunk)
    } catch (error) {
      return callback(error, chunk)
    }
    documentIndex += 1
    return callback(null, chunk)
  })

  // POST
  let returnCode = 201
  let processBatch = async(batch) => crudService.insertMany(crudContext, batch)
  if (request.method === 'PATCH') {
    returnCode = 200
    processBatch = async(batch) => {
      return crudService.patchBulk(crudContext, batch.map(document => ({
        _id: document._id,
        commands: {
          $set: document,
        },
      })))
    }
  }

  const batchConsumer = new BatchWritableStream({
    batchSize: 5000,
    highWaterMark: 1000,
    objectMode: true,
    processBatch,
  })

  try {
    await pipeline(
      file,
      bodyParser.parser(...bodyParser.args),
      parseDocument,
      batchConsumer
    )
  } catch (error) {
    if (error.code === OPTIONS_INCOMPATIBILITY_ERROR_CODE) {
      log.debug('stream error')
      return reply.getHttpError(BAD_REQUEST_ERROR_STATUS_CODE, error.message)
    }

    if (error.code === UNIQUE_INDEX_MONGO_ERROR_CODE) {
      log.debug('unique index violation')
      return reply.getHttpError(UNIQUE_INDEX_ERROR_STATUS_CODE, error.message)
    }

    if (Array.isArray(error)) {
      log.debug('error parsing input file')
      const { message, instancePath } = error?.[0] ?? {}
      const errorDetails = instancePath ? `, ${instancePath}` : ''
      const errorMessage = `(index: ${documentIndex}${errorDetails}) ${message ?? 'error in parsing record'}`
      return reply.getHttpError(BAD_REQUEST_ERROR_STATUS_CODE, errorMessage)
    }

    return reply.getHttpError(INTERNAL_SERVER_ERROR_STATUS_CODE, error.message || 'something went wrong')
  }

  return reply.code(returnCode).send({ message: 'File uploaded successfully' })
}

// eslint-disable-next-line max-statements
async function handleGetListLookup(request, reply) {
  if (this.customMetrics) {
    this.customMetrics.collectionInvocation.inc({
      collection_name: this.modelName,
      type: PROMETHEUS_OP_TYPE.FETCH,
    })
  }

  const { query, headers, crudContext, log } = request

  const {
    [QUERY]: clientQueryString,
    [PROJECTION]: clientProjectionString = '',
    [SORT]: sortQuery,
    [LIMIT]: limit,
    [SKIP]: skip,
    [STATE]: state,
    ...otherParams
  } = query
  const { acl_rows, acl_read_columns } = headers

  let projection = resolveProjection(
    clientProjectionString,
    acl_read_columns,
    this.allFieldNames,
    '',
    log
  )

  projection = this.lookupProjection.filter(proj => projection.includes(Object.keys(proj)[0]))
  if (projection.length === 0) {
    reply.getHttpError(BAD_REQUEST_ERROR_STATUS_CODE, 'No allowed colums')
  }

  const LookupProjectionFieldsToOmit = this.lookupProjection.filter(field => Object.values(field).shift() === 0)
  projection.push(...LookupProjectionFieldsToOmit)

  const isTextSearchQuery = query._q && this.queryParser.isTextSearchQuery(JSON.parse(query._q))
  const mongoQuery = resolveMongoQuery(this.queryParser, clientQueryString, acl_rows, otherParams, isTextSearchQuery)
  let sort
  if (sortQuery) {
    sort = Object.fromEntries(sortQuery.toString().split(',')
      .map((param) => (param[0] === '-' ? [param.substr(1), -1] : [param, 1])))
  }

  const stateArr = state?.split(',')
  const { replyType, streamValidator } = reply.context.config
  const contentType = replyType()
  const responseParser = getFileMimeStringify(contentType)
  if (!responseParser) {
    return reply.getHttpError(BAD_REQUEST_ERROR_STATUS_CODE, `Unsupported file type ${contentType}`)
  }

  reply.raw.setHeader('Content-Type', contentType)

  try {
    return await pipeline(
      this.crudService
        .aggregate(crudContext, mongoQuery, projection, sort, skip, limit, stateArr, isTextSearchQuery)
        .stream(),
      this.castResultsAsStream(),
      streamValidator(),
      responseParser.stringify(...responseParser.args),
      reply.raw
    )
  } catch (error) {
    request.log.error({ error }, 'Error during findAll lookup stream')
    request.log.debug({ error: { ...error, message: error.message } }, 'Error during findAll lookup stream with message')
    if (error.code === OPTIONS_INCOMPATIBILITY_ERROR_CODE) {
      request.log.info(BAD_REQUEST_ERROR_STATUS_CODE)
    }
  }
}

async function handleGetList(request, reply) {
  if (this.customMetrics) {
    this.customMetrics.collectionInvocation.inc({
      collection_name: this.modelName,
      type: PROMETHEUS_OP_TYPE.FETCH,
    })
  }

  const { query, headers, crudContext, log, routeSchema } = request
  const {
    [QUERY]: clientQueryString,
    [PROJECTION]: clientProjectionString = '',
    [RAW_PROJECTION]: clientRawProjectionString = '',
    [SORT]: sortQuery,
    [LIMIT]: limit,
    [SKIP]: skip,
    [STATE]: state,
    ...otherParams
  } = query
  const { acl_rows, acl_read_columns, accept } = headers
  const { replyType, streamValidator } = reply.context.config
  const contentType = replyType(accept)

  const projection = resolveProjection(
    clientProjectionString,
    acl_read_columns,
    this.allFieldNames,
    clientRawProjectionString,
    log
  )

  const isTextSearchQuery = query._q && this.queryParser.isTextSearchQuery(JSON.parse(query._q))
  const mongoQuery = resolveMongoQuery(this.queryParser, clientQueryString, acl_rows, otherParams, isTextSearchQuery)

  let sort
  if (sortQuery) {
    sort = Object.fromEntries(sortQuery.toString().split(',')
      .map((param) => (param[0] === '-' ? [param.substr(1), -1] : [param, 1])))
  }

  const stateArr = state.split(',')

  const responseParser = getFileMimeStringify(contentType, { schema: routeSchema.response['200'].items })
  if (!responseParser) {
    return reply.getHttpError(BAD_REQUEST_ERROR_STATUS_CODE, `Unsupported file type ${contentType}`)
  }

  reply.raw.setHeader('Content-Type', contentType)

  try {
    await pipeline(
      this.crudService
        .findAll(crudContext, mongoQuery, projection, sort, skip, limit, stateArr, isTextSearchQuery)
        .stream(),
      this.castResultsAsStream(),
      streamValidator(),
      responseParser.stringify(...responseParser.args),
      reply.raw
    )
  } catch (error) {
    request.log.error({ error }, 'Error during findAll stream')
    request.log.debug({ error: { ...error, message: error.message } }, 'Error during findAll stream with message')
    if (error.code === OPTIONS_INCOMPATIBILITY_ERROR_CODE) {
      request.log.info(BAD_REQUEST_ERROR_STATUS_CODE)
    }
  }
}

async function handleGetId(request, reply) {
  if (this.customMetrics) {
    this.customMetrics.collectionInvocation.inc({
      collection_name: this.modelName,
      type: PROMETHEUS_OP_TYPE.FETCH,
    })
  }

  const { crudContext, log } = request
  const docId = request.params.id
  const { acl_rows, acl_read_columns } = request.headers
  const {
    itemValidator,
  } = reply.context.config

  const {
    [QUERY]: clientQueryString,
    [PROJECTION]: clientProjectionString = '',
    [RAW_PROJECTION]: clientRawProjectionString = '',
    [STATE]: state,
    ...otherParams
  } = request.query

  const projection = resolveProjection(
    clientProjectionString,
    acl_read_columns,
    this.allFieldNames,
    clientRawProjectionString,
    log
  )
  const filter = resolveMongoQuery(
    this.queryParser,
    clientQueryString,
    acl_rows,
    otherParams,
    false
  )
  const _id = this.castCollectionId(docId)

  const stateArr = state.split(',')
  const doc = await this.crudService.findById(crudContext, _id, filter, projection, stateArr)
  if (!doc) {
    return reply.notFound()
  }

  const response = this.castItem(doc)
  itemValidator(response)
  return response
}

async function handleInsertOne(request, reply) {
  if (this.customMetrics) {
    this.customMetrics.collectionInvocation.inc({
      collection_name: this.modelName,
      type: PROMETHEUS_OP_TYPE.INSERT_OR_UPDATE,
    })
  }

  const { body: doc, crudContext } = request

  this.queryParser.parseAndCastBody(doc)

  try {
    const insertedDoc = await this.crudService.insertOne(crudContext, doc)
    return mapToObjectWithOnlyId(insertedDoc)
  } catch (error) {
    if (error.code === UNIQUE_INDEX_MONGO_ERROR_CODE) {
      request.log.error('unique index violation')
      return reply.getHttpError(UNIQUE_INDEX_ERROR_STATUS_CODE, error.message)
    }
    throw error
  }
}

async function handleValidate() {
  return { result: 'ok' }
}

async function handleDeleteId(request, reply) {
  if (this.customMetrics) {
    this.customMetrics.collectionInvocation.inc({
      collection_name: this.modelName,
      type: PROMETHEUS_OP_TYPE.DELETE,
    })
  }

  const { query, headers, params, crudContext } = request

  const docId = params.id
  const _id = this.castCollectionId(docId)

  const {
    [QUERY]: clientQueryString,
    [STATE]: state,
    ...otherParams
  } = query
  const { acl_rows } = headers

  const filter = resolveMongoQuery(this.queryParser, clientQueryString, acl_rows, otherParams, false)

  const stateArr = state.split(',')
  const doc = await this.crudService.deleteById(crudContext, _id, filter, stateArr)

  if (!doc) {
    return reply.notFound()
  }

  // the document should not be returned:
  // we don't know which projection the user is able to see
  reply.code(204)
}

async function handleDeleteList(request) {
  if (this.customMetrics) {
    this.customMetrics.collectionInvocation.inc({
      collection_name: this.modelName,
      type: PROMETHEUS_OP_TYPE.DELETE,
    })
  }

  const { query, headers, crudContext } = request

  const {
    [QUERY]: clientQueryString,
    [STATE]: state,
    ...otherParams
  } = query
  const { acl_rows } = headers

  const filter = resolveMongoQuery(this.queryParser, clientQueryString, acl_rows, otherParams, false)

  const stateArr = state.split(',')
  return this.crudService.deleteAll(crudContext, filter, stateArr)
}

async function handleCount(request) {
  if (this.customMetrics) {
    this.customMetrics.collectionInvocation.inc({
      collection_name: this.modelName,
      type: PROMETHEUS_OP_TYPE.FETCH,
    })
  }

  const { query, headers, crudContext } = request
  const {
    [QUERY]: clientQueryString,
    [STATE]: state,
    ...otherParams
  } = query
  const { acl_rows } = headers

  const mongoQuery = resolveMongoQuery(this.queryParser, clientQueryString, acl_rows, otherParams, false)

  const stateArr = state.split(',')
  return this.crudService.count(crudContext, mongoQuery, stateArr)
}

async function handlePatchId(request, reply) {
  if (this.customMetrics) {
    this.customMetrics.collectionInvocation.inc({
      collection_name: this.modelName,
      type: PROMETHEUS_OP_TYPE.INSERT_OR_UPDATE,
    })
  }

  const { query, headers, params, crudContext, log } = request
  const {
    [QUERY]: clientQueryString,
    [STATE]: state,
    ...otherParams
  } = query
  const {
    acl_rows,
    acl_write_columns: aclWriteColumns,
    acl_read_columns: aclColumns = '',
  } = headers
  const {
    itemValidator,
  } = reply.context.config

  const commands = request.body

  const editableFields = getEditableFields(aclWriteColumns, this.allFieldNames)

  const mongoQuery = resolveMongoQuery(this.queryParser, clientQueryString, acl_rows, otherParams, false)

  this.queryParser.parseAndCastCommands(commands, editableFields)
  const projection = resolveProjection('', aclColumns, this.allFieldNames, '', log)

  const docId = params.id
  const _id = this.castCollectionId(docId)

  const stateArr = state.split(',')
  const doc = await this.crudService.patchById(crudContext, _id, commands, mongoQuery, projection, stateArr)

  if (!doc) {
    return reply.notFound()
  }

  const response = this.castItem(doc)
  itemValidator(response)
  return response
}

async function handlePatchMany(request) {
  if (this.customMetrics) {
    this.customMetrics.collectionInvocation.inc({
      collection_name: this.modelName,
      type: PROMETHEUS_OP_TYPE.INSERT_OR_UPDATE,
    })
  }

  const { query, headers, crudContext } = request
  const {
    [QUERY]: clientQueryString,
    [STATE]: state,
    ...otherParams
  } = query
  const {
    acl_rows,
    acl_write_columns: aclWriteColumns,
  } = headers

  const commands = request.body
  const editableFields = getEditableFields(aclWriteColumns, this.allFieldNames)
  const mongoQuery = resolveMongoQuery(this.queryParser, clientQueryString, acl_rows, otherParams, false)
  this.queryParser.parseAndCastCommands(commands, editableFields)

  const stateArr = state.split(',')
  const nModified = await this.crudService.patchMany(crudContext, commands, mongoQuery, stateArr)

  return nModified
}

async function handleUpsertOne(request, reply) {
  if (this.customMetrics) {
    this.customMetrics.collectionInvocation.inc({
      collection_name: this.modelName,
      type: PROMETHEUS_OP_TYPE.INSERT_OR_UPDATE,
    })
  }

  const { query, headers, crudContext, log } = request
  const {
    [QUERY]: clientQueryString,
    [STATE]: state,
    ...otherParams
  } = query
  const {
    acl_rows,
    acl_write_columns: aclWriteColumns,
    acl_read_columns: aclColumns = '',
  } = headers
  const {
    itemValidator,
  } = reply.context.config

  const commands = request.body

  const editableFields = getEditableFields(aclWriteColumns, this.allFieldNames)

  const mongoQuery = resolveMongoQuery(this.queryParser, clientQueryString, acl_rows, otherParams, false)

  this.queryParser.parseAndCastCommands(commands, editableFields)
  const projection = resolveProjection('', aclColumns, this.allFieldNames, '', log)

  const stateArr = state.split(',')
  const doc = await this.crudService.upsertOne(crudContext, commands, mongoQuery, projection, stateArr)

  const response = this.castItem(doc)

  itemValidator(response)
  return response
}

async function handlePatchBulk(request) {
  if (this.customMetrics) {
    this.customMetrics.collectionInvocation.inc({
      collection_name: this.modelName,
      type: PROMETHEUS_OP_TYPE.INSERT_OR_UPDATE,
    })
  }

  const { body: filterUpdateCommands, crudContext, headers } = request

  const {
    acl_rows,
    acl_write_columns: aclWriteColumns,
  } = headers

  const parsedAndCastedCommands = new Array(filterUpdateCommands.length)
  for (let i = 0; i < filterUpdateCommands.length; i++) {
    const { filter, update } = filterUpdateCommands[i]
    const {
      _id,
      [QUERY]: clientQueryString,
      [STATE]: state,
      ...otherParams
    } = filter

    const commands = update

    const editableFields = getEditableFields(aclWriteColumns, this.allFieldNames)

    const mongoQuery = resolveMongoQuery(this.queryParser, clientQueryString, acl_rows, otherParams, false)

    this.queryParser.parseAndCastCommands(commands, editableFields)

    parsedAndCastedCommands[i] = {
      commands,
      state: state.split(','),
      query: mongoQuery,
    }
    if (_id) {
      parsedAndCastedCommands[i].query._id = this.castCollectionId(_id)
    }
  }

  const nModified = await this.crudService.patchBulk(crudContext, parsedAndCastedCommands)
  return nModified
}

async function handleInsertMany(request, reply) {
  if (this.customMetrics) {
    this.customMetrics.collectionInvocation.inc({
      collection_name: this.modelName,
      type: PROMETHEUS_OP_TYPE.INSERT_OR_UPDATE,
    })
  }

  const { body: docs, crudContext } = request

  docs.forEach(this.queryParser.parseAndCastBody)

  try {
    const insertedDocs = await this.crudService.insertMany(crudContext, docs)
    return insertedDocs.map(mapToObjectWithOnlyId)
  } catch (error) {
    if (error.code === UNIQUE_INDEX_MONGO_ERROR_CODE) {
      request.log.error('unique index violation')
      return reply.getHttpError(UNIQUE_INDEX_ERROR_STATUS_CODE, error.message)
    }
    throw error
  }
}

async function handleChangeStateById(request, reply) {
  if (this.customMetrics) {
    this.customMetrics.collectionInvocation.inc({
      collection_name: this.modelName,
      type: PROMETHEUS_OP_TYPE.CHANGE_STATE,
    })
  }

  const { body, crudContext, headers, query } = request
  const {
    [QUERY]: clientQueryString,
    ...otherParams
  } = query

  const { acl_rows } = headers
  const mongoQuery = resolveMongoQuery(this.queryParser, clientQueryString, acl_rows, otherParams, false)

  const docId = request.params.id
  const _id = this.castCollectionId(docId)

  const doc = await this.crudService.changeStateById(crudContext, _id, body.stateTo, mongoQuery)

  if (!doc) {
    return reply.notFound()
  }

  reply.code(204)
}

async function handleChangeStateMany(request) {
  if (this.customMetrics) {
    this.customMetrics.collectionInvocation.inc({
      collection_name: this.modelName,
      type: PROMETHEUS_OP_TYPE.CHANGE_STATE,
    })
  }

  const { body: filterUpdateCommands, crudContext, headers } = request

  const {
    acl_rows,
  } = headers

  const parsedAndCastedCommands = new Array(filterUpdateCommands.length)
  for (let i = 0; i < filterUpdateCommands.length; i++) {
    const {
      filter,
      stateTo,
    } = filterUpdateCommands[i]

    const mongoQuery = resolveMongoQuery(this.queryParser, null, acl_rows, filter, false)

    parsedAndCastedCommands[i] = {
      query: mongoQuery,
      stateTo,
    }
  }

  return this.crudService.changeStateMany(crudContext, parsedAndCastedCommands)
}

async function injectContextInRequest(request) {
  const userIdHeader = request.headers[this.userIdHeaderKey]
  const isUserHeaderInvalid = INVALID_USERID.includes(userIdHeader)

  let userId = 'public'

  if (userIdHeader && !isUserHeaderInvalid) {
    userId = userIdHeader
  }

  request.crudContext = {
    log: request.log,
    userId,
    now: new Date(),
  }
}

async function parseEncodedJsonQueryParams(logger, request) {
  if (request.headers.json_query_params_encoding) {
    logger.warn('You\'re using the json_query_params_encoding header but it\'s deprecated and its support is going to be dropped in the next major release. Use json-query-params-encoding instead.')
  }

  // TODO remove request.headers.json_query_params_encoding fallback in v7.0.0
  const jsonQueryParamsEncoding = request.headers['json-query-params-encoding'] || request.headers.json_query_params_encoding
  switch (jsonQueryParamsEncoding) {
  case 'base64': {
    const queryJsonFields = [QUERY, RAW_PROJECTION]
    for (const field of queryJsonFields) {
      if (request.query[field]) {
        request.query[field] = Buffer.from(request.query[field], jsonQueryParamsEncoding).toString()
      }
    }
    break
  }
  default: break
  }
}

async function notFoundHandler(request, reply) {
  reply
    .code(404)
    .send({
      error: 'not found',
    })
}

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

function resolveMongoQuery(
  queryParser,
  clientQueryString,
  rawAclRows,
  otherParams,
  textQuery
) {
  const mongoQuery = {
    $and: [],
  }
  if (clientQueryString) {
    const clientQuery = JSON.parse(clientQueryString)
    mongoQuery.$and.push(clientQuery)
  }
  if (otherParams) {
    for (const key of Object.keys(otherParams)) {
      const value = otherParams[key]
      mongoQuery.$and.push({ [key]: value })
    }
  }

  if (rawAclRows) {
    const aclRows = JSON.parse(rawAclRows)
    if (rawAclRows[0] === '[') {
      mongoQuery.$and.push({ $and: aclRows })
    } else {
      mongoQuery.$and.push(aclRows)
    }
  }

  if (textQuery) {
    queryParser.parseAndCastTextSearchQuery(mongoQuery)
  } else {
    queryParser.parseAndCast(mongoQuery)
  }

  if (mongoQuery.$and && !mongoQuery.$and.length) {
    return { }
  }

  return mongoQuery
}

function resolveProjection(clientProjectionString, aclColumns, allFieldNames, rawProjection, log) {
  log.debug('Resolving projections')
  const acls = splitACLs(aclColumns)

  if (clientProjectionString && rawProjection) {
    log.error('Use of both _p and _rawp is not permitted')
    throw new BadRequestError(
      'Use of both _rawp and _p parameter is not allowed')
  }

  if (!clientProjectionString && !rawProjection) {
    return removeAclColumns(allFieldNames, acls)
  } else if (rawProjection) {
    return resolveRawProjectionString(rawProjection, acls, allFieldNames, log)
  } else if (clientProjectionString) {
    return resolveClientProjectionString(clientProjectionString, acls)
  }
}

function resolveClientProjectionString(clientProjectionString, _acls) {
  const clientProjection = getClientProjection(clientProjectionString)
  return removeAclColumns(clientProjection, _acls)
}

function resolveRawProjectionString(rawProjection, _acls, allFieldNames, log) {
  try {
    checkAllowedOperators(
      rawProjection,
      rawProjectionDictionary,
      _acls.length > 0 ? _acls : allFieldNames, log)

    const rawProjectionObject = resolveRawProjection(rawProjection)
    const projection = removeAclColumnsFromRawProjection(rawProjectionObject, _acls)

    return !lisEmpty(projection) ? [projection] : []
  } catch (errorMessage) {
    log.error(errorMessage.message)
    throw new BadRequestError(errorMessage.message)
  }
}

function splitACLs(acls) {
  if (acls) { return acls.split(',') }
  return []
}

function removeAclColumns(fieldsInProjection, aclColumns) {
  if (aclColumns.length > 0) {
    return fieldsInProjection.filter(field => {
      return aclColumns.indexOf(field) > -1
    })
  }

  return fieldsInProjection
}

function removeAclColumnsFromRawProjection(rawProjectionObject, aclColumns) {
  const isRawProjectionOverridingACLs = checkIfRawProjectionOverridesAcls(rawProjectionObject, aclColumns)
  if (isRawProjectionOverridingACLs) {
    throw Error('_rawp exclusive projection is overriding at least one acl_read_column value')
  }

  const rawProjectionFields = Object.keys(rawProjectionObject)
  const filteredFields = removeAclColumns(rawProjectionFields, aclColumns)

  return filteredFields.reduce((acc, current) => {
    if (rawProjectionObject[current] === 0 || rawProjectionObject[current]) {
      acc[current] = rawProjectionObject[current]
    }
    return acc
  }, {})
}

function getClientProjection(clientProjectionString) {
  if (clientProjectionString) {
    return clientProjectionString.split(',')
  }
  return []
}

function resolveRawProjection(clientRawProjectionString) {
  if (clientRawProjectionString) {
    return JSON.parse(clientRawProjectionString)
  }
  return {}
}

function checkAllowedOperators(rawProjection, projectionDictionary, additionalFields, log) {
  if (!rawProjection) {
    log.debug('No raw projection found: checkAllowedOperators returns true')
    return true
  }

  const { allowedOperators, notAllowedOperators } = projectionDictionary
  const allowedFields = [...allowedOperators]

  additionalFields.forEach(field => allowedFields.push(`$${field}`))

  log.debug({ allowedOperators: allowedFields }, 'Allowed operators for projection')
  log.debug({ notAllowedOperators }, 'Not allowed operators for projection')

  // to match both camelCase operators and snake mongo_systems variables
  const operatorsRegex = /\${1,2}[a-zA-Z_]+/g
  const matches = rawProjection.match(operatorsRegex)

  if (!matches) {
    log.debug('No operators found in raw projection: checkAllowedOperators returns true')
    return true
  }

  return !matches.some(match => {
    if (match.startsWith('$$')) {
      log.debug({ match }, 'Found $$ match in raw projection')
      if (notAllowedOperators.includes(match)) {
        throw Error(`Operator ${match} is not allowed in raw projection`)
      }

      return notAllowedOperators.includes(match)
    }

    if (!allowedFields.includes(match)) {
      throw Error(`Operator ${match} is not allowed in raw projection`)
    }

    return !allowedFields.includes(match)
  })
}

function checkIfRawProjectionOverridesAcls(rawProjection, acls) {
  return Object.keys(rawProjection).some(field =>
    acls.includes(field) && rawProjection[field] === 0
  )
}

function mapToObjectWithOnlyId(doc) {
  return { _id: doc._id.toString() }
}

const internalFields = [
  UPDATERID,
  UPDATEDAT,
  CREATORID,
  CREATEDAT,
  __STATE__,
]
function getEditableFields(aclWriteColumns, allFieldNames) {
  const editableFields = aclWriteColumns ? aclWriteColumns.split(',') : allFieldNames
  return editableFields.filter(ef => !internalFields.includes(ef))
}

function getFileMimeStringify(contentType, parsingOptions = {}) {
  const mimeStringify = {
    'application/x-ndjson': { stringify: (schema) => {
      const parse = fastJson(schema)
      return through2.obj((obj, _encoding, callback) => {
        callback(null, `${parse(obj)}\n`)
      })
    },
    args: [parsingOptions.schema] },
    'application/json': { stringify: JSONStream.stringify, args: [] },
    'text/csv': { stringify: csvStringify.stringify,
      args: [{
        encoding: 'utf8',
        delimiter: ',',
        escape: '\\',
        header: true,
        quote: false,
        ...parsingOptions,
        cast: (value) => {
          try {
            return JSON.stringify(value)
          } catch (errs) {
            return value
          }
        },
      }],
    },
  }

  return mimeStringify[contentType]
}

function getFileMimeParser(contentType, parsingOptions) {
  const mimeParser = {
    'application/x-ndjson': { parser: ndjson.parse, args: [] },
    'application/json': { parser: JSONStream.parse, args: ['*'] },
    'text/csv': { parser: csvParse.parse,
      args: [{
        encoding: 'utf8',
        delimiter: ',',
        columns: true,
        skip_empty_lines: true,
        relax_quotes: true,
        escape: '\\',
        ...parsingOptions,
        cast: (value) => {
          try {
            return JSON.parse(value)
          } catch (errs) {
            return value
          }
        },
      }],
    },
  }

  return mimeParser[contentType]
}
