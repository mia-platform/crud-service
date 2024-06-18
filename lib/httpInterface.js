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

const { pipeline } = require('stream/promises')
const { isEmpty: lisEmpty } = require('lodash')
const through2 = require('through2')

const {
  SORT,
  PROJECTION,
  RAW_PROJECTION,
  EXPORT_OPTIONS,
  QUERY,
  LIMIT,
  SKIP,
  STATE,
  UPDATERID,
  UPDATEDAT,
  CREATORID,
  CREATEDAT,
  __STATE__,
  rawProjectionDictionary,
  USE_ESTIMATE,
  BAD_REQUEST_ERROR_STATUS_CODE,
  INTERNAL_SERVER_ERROR_STATUS_CODE,
  UNIQUE_INDEX_ERROR_STATUS_CODE,
  NOT_ACCEPTABLE,
  UNSUPPORTED_MIME_TYPE_STATUS_CODE,
  ACL_WRITE_COLUMNS,
  ACL_ROWS,
} = require('./consts')

const getAccept = require('./acceptHeaderParser')
const BadRequestError = require('./BadRequestError')
const BatchWritableStream = require('./BatchWritableStream')

const { getAjvResponseValidationFunction, shouldValidateStream, shouldValidateItem } = require('./validatorGetters')
const { getFileMimeParser, getFileMimeStringifiers } = require('./mimeTypeTransform')
const resolveMongoQuery = require('./resolveMongoQuery')
const { addValidatorCompiler } = require('./compilers')

const OPTIONS_INCOMPATIBILITY_ERROR_CODE = 2
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


  addValidatorCompiler(fastify, fastify.models, { HELPERS_PREFIX: fastify.config.HELPERS_PREFIX })

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
            true
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
            true
          ),
        },
      },
      handleCollectionImport
    )

    fastify.log.debug({ collection: fastify?.modelName }, 'setters endpoints registered')
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
    fastify.log.debug({ collection: fastify?.modelName }, 'lookup endpoint registered')
  }

  if (registerGetters) {
    const getItemJSONSchemaWithoutRequired = fastify.jsonSchemaGenerator.generateGetItemJSONSchema()
    const getItemJSONSchemaWithRequired = fastify.jsonSchemaGenerator.generateGetItemJSONSchema(true)
    fastify.get('/export', {
      schema: fastify.jsonSchemaGenerator.generateExportJSONSchema(),
      config: {
        streamValidator: shouldValidateStream(getItemJSONSchemaWithoutRequired.response['200'], validateOutput),
        replyType: (acceptHeader) => {
          const accept = getAccept(acceptHeader)

          if (!accept || accept === '*/*') { return 'application/x-ndjson' }

          return accept
        },
      },
    }, handleGetList)
    fastify.get('/count', { schema: fastify.jsonSchemaGenerator.generateCountJSONSchema() }, handleCount)
    fastify.get(
      '/schema',
      {
        schema: fastify.jsonSchemaGenerator.generateGetSchemaJSONSchema(),
      },
      () => ({
        type: getItemJSONSchemaWithRequired.response['200'].type,
        properties: getItemJSONSchemaWithRequired.response['200'].properties,
        required: getItemJSONSchemaWithRequired.response['200'].required,
      })
    )

    fastify.get('/', {
      schema: fastify.jsonSchemaGenerator.generateGetListJSONSchema(),
      config: {
        streamValidator: shouldValidateStream(getItemJSONSchemaWithoutRequired.response['200'], validateOutput),
        replyType: () => 'application/json',
      },
    }, handleGetList)
    fastify.get('/:id', {
      schema: getItemJSONSchemaWithoutRequired,
      config: {
        itemValidator: shouldValidateItem(getItemJSONSchemaWithoutRequired.response['200'], validateOutput),
      },
    }, handleGetId)

    fastify.log.debug({ collection: fastify?.modelName }, 'getters endpoints registered')
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

  const {
    log,
    crudContext,
    routeOptions: { config: { itemValidator, validateImportOptions } },
  } = request
  const isValid = validateImportOptions(parsingOptions)
  if (!isValid) {
    return reply.getHttpError(BAD_REQUEST_ERROR_STATUS_CODE, `Invalid options`)
  }

  const bodyParser = getFileMimeParser(mimetype, parsingOptions)
  if (!bodyParser) {
    return reply.getHttpError(UNSUPPORTED_MIME_TYPE_STATUS_CODE, `Unsupported file type ${mimetype}`)
  }

  const { crudService, queryParser } = this

  let documentIndex = 0
  const parseDocument = through2.obj((chunk, _enc, callback) => {
    try {
      itemValidator(chunk)
      if (itemValidator.errors) { throw itemValidator.errors }
    } catch (error) {
      return callback(error, chunk)
    }
    documentIndex += 1
    return callback(null, chunk)
  })

  // POST
  let returnCode = 201
  let processBatch = async(batch) => crudService.insertMany(crudContext, batch, queryParser)

  // PATCH
  if (request.method === 'PATCH') {
    returnCode = 200
    processBatch = async(batch) => {
      return crudService.upsertMany(crudContext, batch, queryParser)
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
      bodyParser(),
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

function getExportColumns(projection) {
  const columns = Object.keys(projection).filter(key => projection[key] !== 0)
  if (!columns.includes('_id') && projection['_id'] !== 0) {
    columns.unshift('_id')
  }
  return columns
}

// eslint-disable-next-line max-statements
async function handleGetListLookup(request, reply) {
  if (this.customMetrics) {
    this.customMetrics.collectionInvocation.inc({
      collection_name: this.modelName,
      type: PROMETHEUS_OP_TYPE.FETCH,
    })
  }

  const {
    query,
    headers,
    crudContext,
    log,
    routeOptions: { config: { replyType, streamValidator } },
  } = request

  const {
    [QUERY]: clientQueryString,
    [PROJECTION]: clientProjectionString = '',
    [SORT]: sortQuery,
    [LIMIT]: limit,
    [SKIP]: skip,
    [STATE]: state,
    [EXPORT_OPTIONS]: exportOpts = '',
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
  delete projection._id

  projection = this.lookupProjection.reduce((acc, proj) => {
    if (projection[Object.keys(proj)[0]]) {
      return { ...acc, ...proj }
    }
    return acc
  }, {})
  if (Object.keys(projection).length === 0) {
    reply.getHttpError(BAD_REQUEST_ERROR_STATUS_CODE, 'No allowed colums')
  }

  const lookupProjectionFieldsToOmit = this.lookupProjection.reduce((acc, field) => {
    if (Object.values(field).shift() === 0) {
      return { ...acc, ...field }
    }
    return acc
  },
  {})
  projection = {
    ...projection,
    ...lookupProjectionFieldsToOmit,
  }

  const isTextSearchQuery = query._q && this.queryParser.isTextSearchQuery(JSON.parse(query._q))
  const mongoQuery = resolveMongoQuery(this.queryParser, clientQueryString, acl_rows, otherParams, isTextSearchQuery)
  let sort
  if (sortQuery) {
    sort = Object.fromEntries(sortQuery.toString().split(',')
      .map((param) => (param[0] === '-' ? [param.substr(1), -1] : [param, 1])))
  }

  const stateArr = state?.split(',')
  const contentType = replyType()
  const parsingOptions = contentType === 'text/csv' && exportOpts ? JSON.parse(exportOpts) : {}

  const responseStringifiers = getFileMimeStringifiers(contentType, parsingOptions)
  if (!responseStringifiers) {
    return reply.getHttpError(UNSUPPORTED_MIME_TYPE_STATUS_CODE, `Unsupported file type ${contentType}`)
  }

  reply.raw.setHeader('Content-Type', contentType)

  try {
    return await pipeline(
      this.crudService
        .aggregate(crudContext, mongoQuery, projection, sort, skip, limit, stateArr, isTextSearchQuery)
        .stream(),
      this.castResultsAsStream(),
      streamValidator(),
      ...responseStringifiers({ fields: getExportColumns(projection) }),
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

// eslint-disable-next-line max-statements
async function handleGetList(request, reply) {
  if (this.customMetrics) {
    this.customMetrics.collectionInvocation.inc({
      collection_name: this.modelName,
      type: PROMETHEUS_OP_TYPE.FETCH,
    })
  }

  const {
    query,
    headers,
    crudContext,
    log,
    routeOptions: { config: { replyType, streamValidator } },
  } = request
  const {
    [QUERY]: clientQueryString,
    [PROJECTION]: clientProjectionString = '',
    [RAW_PROJECTION]: clientRawProjectionString = '',
    [SORT]: sortQuery,
    [LIMIT]: limit,
    [SKIP]: skip,
    [STATE]: state,
    [EXPORT_OPTIONS]: exportOpts = '',
    ...otherParams
  } = query
  const { acl_rows, acl_read_columns, accept } = headers
  const contentType = replyType(accept)
  const parsingOptions = contentType === 'text/csv' && exportOpts ? JSON.parse(exportOpts) : {}

  const responseStringifiers = getFileMimeStringifiers(contentType, parsingOptions)
  if (!responseStringifiers) {
    return reply.getHttpError(NOT_ACCEPTABLE, `unsupported file type ${contentType}`)
  }

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

  reply.raw.setHeader('Content-Type', contentType)

  try {
    await pipeline(
      this.crudService
        .findAll(crudContext, mongoQuery, projection, sort, skip, limit, stateArr, isTextSearchQuery)
        .stream(),
      this.castResultsAsStream(),
      streamValidator(),
      ...responseStringifiers({ fields: getExportColumns(projection) }),
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

  const {
    crudContext,
    log,
  } = request
  const docId = request.params.id
  const { acl_rows, acl_read_columns } = request.headers

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

  return doc
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
    [USE_ESTIMATE]: useEstimate,
    ...otherParams
  } = query

  const { acl_rows } = headers

  if (useEstimate) {
    return this.crudService.estimatedDocumentCount(crudContext)
  }

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

  const {
    query,
    headers,
    params,
    crudContext,
    log,
  } = request

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

  return doc
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

async function handleUpsertOne(request) {
  if (this.customMetrics) {
    this.customMetrics.collectionInvocation.inc({
      collection_name: this.modelName,
      type: PROMETHEUS_OP_TYPE.INSERT_OR_UPDATE,
    })
  }

  const {
    query,
    headers,
    crudContext,
    log,
    routeOptions: { config: { itemValidator } },
  } = request
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

  const commands = request.body

  const editableFields = getEditableFields(aclWriteColumns, this.allFieldNames)
  const mongoQuery = resolveMongoQuery(this.queryParser, clientQueryString, acl_rows, otherParams, false)

  this.queryParser.parseAndCastCommands(commands, editableFields)
  const projection = resolveProjection('', aclColumns, this.allFieldNames, '', log)

  const stateArr = state.split(',')
  const doc = await this.crudService.upsertOne(crudContext, commands, mongoQuery, projection, stateArr)

  itemValidator(doc)
  return doc
}

async function handlePatchBulk(request) {
  if (this.customMetrics) {
    this.customMetrics.collectionInvocation.inc({
      collection_name: this.modelName,
      type: PROMETHEUS_OP_TYPE.INSERT_OR_UPDATE,
    })
  }

  const { body: filterUpdateCommands, crudContext, headers } = request


  const nModified = await this.crudService.patchBulk(
    crudContext,
    filterUpdateCommands,
    this.queryParser,
    this.castCollectionId,
    getEditableFields(headers[ACL_WRITE_COLUMNS], this.allFieldNames),
    headers[ACL_ROWS],
  )
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

  try {
    const ids = await this.crudService.insertMany(
      crudContext,
      docs,
      this.queryParser,
      { idOnly: true }
    )
    return ids
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

  try {
    const doc = await this.crudService.changeStateById(crudContext, _id, body.stateTo, mongoQuery)
    if (!doc) {
      return reply.notFound()
    }

    reply.code(204)
  } catch (error) {
    if (error.statusCode) {
      return reply.getHttpError(error.statusCode, error.message)
    }

    throw error
  }
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

function resolveProjection(clientProjectionString, aclColumns, allFieldNames, rawProjection, log) {
  log.debug('Resolving projections')
  const acls = splitACLs(aclColumns)

  if (clientProjectionString && rawProjection) {
    log.error('Use of both _p and _rawp is not permitted')
    throw new BadRequestError(
      'Use of both _rawp and _p parameter is not allowed')
  }

  let projection
  if (!clientProjectionString && !rawProjection) {
    projection = removeAclColumns(allFieldNames, acls)
  } else if (rawProjection) {
    projection = resolveRawProjectionString(rawProjection, acls, allFieldNames, log)
  } else if (clientProjectionString) {
    projection = resolveClientProjectionString(clientProjectionString, acls)
  }

  return getProjection(projection)
}

function getProjection(projection) {
  // In case of empty projection, we project only the _id
  if (!projection?.length) { return { _id: 1 } }

  return projection.reduce((acc, val) => {
    const propertiesToInclude = typeof val === 'string'
      // a string represents the name of a field to be projected
      ? { [val]: 1 }
      // an object represents a raw projection to be passed as it is
      : val

    return { ...acc, ...propertiesToInclude }
  }, {})
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
