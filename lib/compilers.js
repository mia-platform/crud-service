'use strict'

const { SCHEMA_CUSTOM_KEYWORDS } = require('./consts')
const { SCHEMAS_ID } = require('./schemaGetters')
const { get: lget } = require('lodash')
const fastJson = require('fast-json-stringify')

/**
 * @type {Record<string, (models: unknown, modelName: string) => unknown>}
 */
const NESTED_SCHEMAS_BY_ID = {
  [SCHEMAS_ID.GET_LIST]: (model) =>
    model.jsonSchemaGeneratorWithNested?.generateGetListJSONSchema(),
  [SCHEMAS_ID.GET_LIST_LOOKUP]: (model, url) => {
    return model
      ?.lookupsModels
      ?.filter(({ lookup: { as: modelField } }) => {
        return url.endsWith(`/lookup/${modelField}`) || url.endsWith(`/lookup/${modelField}/`)
      })
      .shift()
      .jsonSchemaGeneratorWithNested
      ?.generateGetListLookupJSONSchema()
  },
  [SCHEMAS_ID.GET_ITEM]: (model) =>
    model.jsonSchemaGeneratorWithNested?.generateGetItemJSONSchema(),
  [SCHEMAS_ID.EXPORT]: (model) =>
    model.jsonSchemaGeneratorWithNested?.generateExportJSONSchema(),
  [SCHEMAS_ID.POST_ITEM]: (model) =>
    model.jsonSchemaGeneratorWithNested?.generatePostJSONSchema(),
  [SCHEMAS_ID.POST_BULK]: (model) =>
    model.jsonSchemaGeneratorWithNested?.generateBulkJSONSchema(),
  // it is not possible to validate a stream
  [SCHEMAS_ID.POST_FILE]: () => ({ body: {} }),
  [SCHEMAS_ID.PATCH_FILE]: () => ({ body: {} }),
  [SCHEMAS_ID.DELETE_ITEM]: (model) =>
    model.jsonSchemaGeneratorWithNested?.generateDeleteJSONSchema(),
  [SCHEMAS_ID.DELETE_LIST]: (model) =>
    model.jsonSchemaGeneratorWithNested?.generateDeleteListJSONSchema(),
  [SCHEMAS_ID.PATCH_ITEM]: (model) =>
    model.jsonSchemaGeneratorWithNested?.generatePatchJSONSchema(),
  [SCHEMAS_ID.PATCH_MANY]: (model) =>
    model.jsonSchemaGeneratorWithNested?.generatePatchManyJSONSchema(),
  [SCHEMAS_ID.PATCH_BULK]: (model) =>
    model.jsonSchemaGeneratorWithNested?.generatePatchBulkJSONSchema(),
  [SCHEMAS_ID.UPSERT_ONE]: (model) =>
    model.jsonSchemaGeneratorWithNested?.generateUpsertOneJSONSchema(),
  [SCHEMAS_ID.COUNT]: (model) =>
    model.jsonSchemaGeneratorWithNested?.generateCountJSONSchema(),
  [SCHEMAS_ID.VALIDATE]: (model) =>
    model.jsonSchemaGeneratorWithNested?.generateValidateJSONSchema(),
  [SCHEMAS_ID.CHANGE_STATE]: (model) =>
    model.jsonSchemaGeneratorWithNested?.generateChangeStateJSONSchema(),
  [SCHEMAS_ID.CHANGE_STATE_MANY]: (model) =>
    model.jsonSchemaGeneratorWithNested?.generateChangeStateManyJSONSchema(),
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
        const rootModel = fastify.models[modelName]
        let model

        if (rootModel.viewLookupsEnabled) {
          model = rootModel.viewDependencies
        } else {
          model = rootModel
        }
        const nestedSchema = NESTED_SCHEMAS_BY_ID[schemaId](model, url)

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
