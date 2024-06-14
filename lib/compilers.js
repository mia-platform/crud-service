'use strict'

const { SCHEMA_CUSTOM_KEYWORDS } = require('./consts')
const { SCHEMAS_ID } = require('./schemaGetters')
const { get: lget } = require('lodash')
const fastJson = require('fast-json-stringify')

/**
 * @type {Record<string, (models: unknown, modelName: string) => unknown>}
 */
const NESTED_SCHEMAS_BY_ID = {
  [SCHEMAS_ID.GET_LIST]: (models, modelName) =>
    models[modelName].jsonSchemaGeneratorWithNested?.generateGetListJSONSchema(),
  [SCHEMAS_ID.GET_LIST_LOOKUP]: (models, modelName) =>
    models[modelName].jsonSchemaGeneratorWithNested?.generateGetListLookupJSONSchema(),
  [SCHEMAS_ID.GET_ITEM]: (models, modelName) =>
    models[modelName].jsonSchemaGeneratorWithNested?.generateGetItemJSONSchema(),
  [SCHEMAS_ID.EXPORT]: (models, modelName) =>
    models[modelName].jsonSchemaGeneratorWithNested?.generateExportJSONSchema(),
  [SCHEMAS_ID.POST_ITEM]: (models, modelName) =>
    models[modelName].jsonSchemaGeneratorWithNested?.generatePostJSONSchema(),
  [SCHEMAS_ID.POST_BULK]: (models, modelName) =>
    models[modelName].jsonSchemaGeneratorWithNested?.generateBulkJSONSchema(),
  // it is not possible to validate a stream
  [SCHEMAS_ID.POST_FILE]: () => ({ body: {} }),
  [SCHEMAS_ID.PATCH_FILE]: () => ({ body: {} }),
  [SCHEMAS_ID.DELETE_ITEM]: (models, modelName) =>
    models[modelName].jsonSchemaGeneratorWithNested?.generateDeleteJSONSchema(),
  [SCHEMAS_ID.DELETE_LIST]: (models, modelName) =>
    models[modelName].jsonSchemaGeneratorWithNested?.generateDeleteListJSONSchema(),
  [SCHEMAS_ID.PATCH_ITEM]: (models, modelName) =>
    models[modelName].jsonSchemaGeneratorWithNested?.generatePatchJSONSchema(),
  [SCHEMAS_ID.PATCH_MANY]: (models, modelName) =>
    models[modelName].jsonSchemaGeneratorWithNested?.generatePatchManyJSONSchema(),
  [SCHEMAS_ID.PATCH_BULK]: (models, modelName) =>
    models[modelName].jsonSchemaGeneratorWithNested?.generatePatchBulkJSONSchema(),
  [SCHEMAS_ID.UPSERT_ONE]: (models, modelName) =>
    models[modelName].jsonSchemaGeneratorWithNested?.generateUpsertOneJSONSchema(),
  [SCHEMAS_ID.COUNT]: (models, modelName) =>
    models[modelName].jsonSchemaGeneratorWithNested?.generateCountJSONSchema(),
  [SCHEMAS_ID.VALIDATE]: (models, modelName) =>
    models[modelName].jsonSchemaGeneratorWithNested?.generateValidateJSONSchema(),
  [SCHEMAS_ID.CHANGE_STATE]: (models, modelName) =>
    models[modelName].jsonSchemaGeneratorWithNested?.generateChangeStateJSONSchema(),
  [SCHEMAS_ID.CHANGE_STATE_MANY]: (models, modelName) =>
    models[modelName].jsonSchemaGeneratorWithNested?.generateChangeStateManyJSONSchema(),
}

function findModelNameByUrl(models, url) {
  return Object.entries(models)
    .filter(([, model]) => url.startsWith(model.definition.endpointBasePath))
    .map(([name]) => name)
    .shift()
}

/**
 *
 * @param {import('fastify').FastifyInstance} fastify
 * @param {unknown} models
 * @param {import('ajv').Ajv} ajv
 * @param {{HELPERS_PREFIX: string}?} config
 */
function addValidatorCompiler(fastify, models, ajv, config = {}) {
  const { HELPERS_PREFIX } = config
  fastify.setValidatorCompiler(({ schema, url }) => {
    if (!url.startsWith(HELPERS_PREFIX)) {
      const uniqueId = schema[SCHEMA_CUSTOM_KEYWORDS.UNIQUE_OPERATION_ID]
      const [collectionName, schemaId, subSchemaPath] = uniqueId?.split('__MIA__')

      if (collectionName) {
        
        const modelName = findModelNameByUrl(models, url)
        console.log(collectionName, modelName, url, schemaId)
        const nestedSchema = NESTED_SCHEMAS_BY_ID[schemaId](models, modelName)

        const subSchema = lget(nestedSchema, subSchemaPath)
        fastify.log.trace({ collectionName, schemaPath: subSchemaPath, schemaId }, 'collection schema info')

        // this is made to prevent to shows on swagger all properties with dot notation of RawObject with schema.
        return ajv.compile(subSchema)
      }
      throw new Error(`Invalid collection ${collectionName} provided.`)
    }
    ajv.compile(schema)
  })
}

/**
 *
 * @param {import('fastify').FastifyInstance} fastify
 * @param {import('ajv').Ajv} ajv
 * @param {boolean} ENABLE_STRICT_OUTPUT_VALIDATION
 */
function addSerializerCompiler(fastify, ajv, ENABLE_STRICT_OUTPUT_VALIDATION) {
  fastify.setSerializerCompiler(({ schema, url, method }) => {
    const stringify = fastJson(schema)
    if (url.includes('/bulk') && method !== 'GET') {
      return data => stringify(data)
    }
    const validateFunction = schema?.operationId && ENABLE_STRICT_OUTPUT_VALIDATION
      ? ajv.compile(schema) : null

    return data => {
      const castedItem = fastify.castItem(data)
      if (validateFunction) {
        validateFunction(castedItem)
      }
      const stringifiedData = stringify(castedItem)
      return stringifiedData
    }
  })
}

module.exports = {
  addValidatorCompiler,
  addSerializerCompiler,
}
