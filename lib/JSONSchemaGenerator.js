/* eslint-disable no-underscore-dangle */
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

const { ObjectId } = require('mongodb')
const { v4: uuidv4 } = require('uuid')

const {
  ARRAY,
  GEOPOINT,
  DATE,
  OBJECTID,
  RAWOBJECTTYPE,
  SORT,
  PROJECTION,
  RAW_PROJECTION,
  QUERY,
  LIMIT,
  SKIP,
  STATE,
  MONGOID,
  UPDATERID,
  UPDATEDAT,
  CREATORID,
  CREATEDAT,
  SETCMD,
  UNSETCMD,
  INCCMD,
  MULCMD,
  CURDATECMD,
  SETONINSERTCMD,
  PUSHCMD,
  ADDTOSETCMD,
  __STATE__,
  STATES,
  ARRAY_MERGE_ELEMENT_OPERATOR,
  ARRAY_REPLACE_ELEMENT_OPERATOR,
  JSON_SCHEMA_ARRAY_TYPE,
  JSON_SCHEMA_OBJECT_TYPE,
  SCHEMA_CUSTOM_KEYWORDS,
  DATE_FORMATS,
  PULLCMD,
} = require('./consts')

const EXAMPLE_DATE = new Date('2020-09-16T12:00:00Z').toISOString()

const mandatoryFields = new Set([MONGOID, UPDATERID, UPDATEDAT, CREATORID, CREATEDAT, __STATE__])

const typesToIgnoreInQuerystring = new Set([ARRAY, GEOPOINT, RAWOBJECTTYPE])

const objectIdType = () => {
  return {
    type: 'string',
    pattern: '^[a-fA-F\\d]{24}$',
    description: 'Hexadecimal identifier of the document in the collection',
    examples: [new ObjectId().toString()],
  }
}

const stringType = () => ({
  type: 'string',
  pattern: '^(?!\\s*$).+',
  description: 'String identifier of the document in the collection',
  examples: [uuidv4()],
})

const mongoIdTypeValidator = {
  ObjectId: objectIdType,
  string: stringType,
}

const geoPointValidateSchema = () => ({
  type: 'array',
  items: {
    type: 'number',
  },
  minItems: 2,
  maxItems: 3,
})

const geoPointSerializeSchema = () => ({
  type: 'array',
  items: {
    type: 'number',
  },
})

function validateDateSchema() {
  return {
    type: 'string',
    pattern: '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$',
    description: '"date-time" according with https://tools.ietf.org/html/rfc3339#section-5.6',
    examples: [EXAMPLE_DATE],
  }
}

const serializeDateSchema = () => ({
  type: 'string',
  format: 'date-time',
  examples: [EXAMPLE_DATE],
})

const dateTypeSchema = (jsonSchema) => ({
  type: 'string',
  format: jsonSchema?.schema?.format ?? 'date-time',
  examples: [EXAMPLE_DATE],
})

// any unformatted, unshaped and schemaless object, with no particular validation to perform
const rawObjectTypeSchema = ({ schema } = {}) => {
  const { required, additionalProperties = true, properties } = schema || {}
  return {
    type: 'object',
    additionalProperties,
    ...properties ? { properties } : {},
    ...required !== undefined ? { required } : {},
  }
}

const stateCreateValidationSchema = () => ({
  type: 'string',
  enum: Array.from(Object.values(STATES)),
  description: 'The state of the document',
})

const specialTypesValidationCompatibility = {
  [OBJECTID]: objectIdType,
  [GEOPOINT]: geoPointValidateSchema,
  [DATE]: validateDateSchema,
  [RAWOBJECTTYPE]: rawObjectTypeSchema,
}

const specialTypesSerializationCompatibility = {
  [OBJECTID]: objectIdType,
  [GEOPOINT]: geoPointSerializeSchema,
  [DATE]: serializeDateSchema,
  [RAWOBJECTTYPE]: rawObjectTypeSchema,
}

const specialTypesValidation = {
  [OBJECTID]: objectIdType,
  [GEOPOINT]: geoPointValidateSchema,
  [DATE]: dateTypeSchema,
  [RAWOBJECTTYPE]: rawObjectTypeSchema,
}

const specialTypesSerialization = {
  [OBJECTID]: objectIdType,
  [GEOPOINT]: geoPointSerializeSchema,
  [DATE]: dateTypeSchema,
  [RAWOBJECTTYPE]: rawObjectTypeSchema,
}

const getInheritedType = (jsonSchema) => {
  if (jsonSchema.__mia_configuration?.type) { return jsonSchema.__mia_configuration.type }
  if (jsonSchema.type === 'string' && DATE_FORMATS.includes(jsonSchema.format ?? '')) { return DATE }
  if (jsonSchema.type === JSON_SCHEMA_OBJECT_TYPE) { return RAWOBJECTTYPE }
  return jsonSchema.type
}

const defaultGetQueryParams = {
  [QUERY]: {
    type: 'string',
    description: 'Additional query part to forward to MongoDB',
  },
}

function defaultGetListQueryParams(enableLimitConstraints, maxLimit) {
  const limitConstraints = enableLimitConstraints
    ? {
      default: 25,
      maximum: maxLimit,
      minimum: 1,
      description: `Limits the number of documents, max ${maxLimit} elements, minimum 1`,
    }
    : {}
  return {
    [LIMIT]: {
      type: 'integer',
      minimum: 1,
      description: 'Limits the number of documents',
      ...limitConstraints,
    },
    [SKIP]: {
      type: 'integer',
      minimum: 0,
      description: 'Skip the specified number of documents',
    },
    ...defaultGetQueryParams,
  }
}

function formatEndpointTag(endpointBasePath) {
  return endpointBasePath
    .replace(/\//g, '')
    .replace(/\W|_/g, ' ')
    .replace(/ (\w)/g, found => ` ${found[1].toUpperCase()}`)
    .replace(/^(\w)/g, found => found[0].toUpperCase())
}

const SCHEMAS_ID = {
  GET_LIST: 'getList',
  EXPORT: 'export',
  GET_ITEM: 'getItem',
  POST_ITEM: 'postItem',
  VALIDATE: 'validate',
  DELETE_ITEM: 'deleteItem',
  DELETE_LIST: 'deleteList',
  COUNT: 'count',
  POST_BULK: 'postBulk',
  PATCH_ITEM: 'patchItem',
  UPSERT_ONE: 'upsertOne',
  PATCH_BULK: 'patchBulk',
  PATCH_MANY: 'patchMany',
  CHANGE_STATE: 'changeState',
  CHANGE_STATE_MANY: 'changeStateMany',
}

module.exports = class JSONSchemaGenerator {
  constructor(
    collectionDefinition,
    pathFieldsRawSchema,
    enableLimitConstraint = true,
    maxLimit = 200
  ) {
    const {
      endpointBasePath,
      name: collectionName,
      defaultState: collectionDefaultState,
    } = collectionDefinition
    this._pathFieldsRawSchema = pathFieldsRawSchema
    this._collectionName = collectionName
    this._collectionDefinition = collectionDefinition
    this._collectionBasePath = formatEndpointTag(endpointBasePath)

    const idType = getIdType(collectionDefinition)
    this._idType = idType
    this._requiredFields = getRequiredFields(collectionDefinition)

    this._serializationProperties = collectionFieldsProperties(structuredClone(collectionDefinition), false)
    this._propertiesGetListValidation = propertiesGetListValidation(
      structuredClone(collectionDefinition),
      enableLimitConstraint,
      maxLimit,
      idType
    )
    this._propertiesGetExportValidation = propertiesGetExportValidation(structuredClone(collectionDefinition), idType)
    this._propertiesGetValidation = propertiesGetValidation(structuredClone(collectionDefinition))
    this._propertiesDeleteValidation = propertiesDeleteValidation(structuredClone(collectionDefinition))
    this._propertiesPatchCommandsValidation = propertiesPatchCommandsValidation(
      structuredClone(collectionDefinition),
      pathFieldsRawSchema
    )
    this._propertiesUpsertCommandsValidation = propertiesUpsertCommandsValidation(structuredClone(collectionDefinition))
    this._propertiesPostValidation = {
      ...collectionFieldsProperties(structuredClone(collectionDefinition), true),
      __STATE__: {
        ...stateCreateValidationSchema(),
        default: collectionDefaultState,
      },
    }
    this._propertiesPatchQueryValidation = propertiesDeleteValidation(structuredClone(collectionDefinition))
    this._propertiesFilterChangeStateMany = propertiesFilterChangeStateMany(structuredClone(collectionDefinition))
    this._propertiesCountValidation = {
      [MONGOID]: { ...mongoIdTypeValidator[idType]() },
      ...propertiesDeleteValidation(structuredClone(collectionDefinition)),
    }
    this._propertiesPatchManyQueryValidation = {
      [MONGOID]: { ...mongoIdTypeValidator[idType]() },
      ...propertiesDeleteValidation(structuredClone(collectionDefinition)),
    }
  }

  getSchemaDetail(operationName) {
    // TODO: follow comment below
    /* schemaDetail identifies the subschemas (params, querystring, response.200, body)
     * in the "setValidatorCompiler" function.
     * It could be removed after update to fastify 3.x and change to `setValidatorCompiler`
     * const that have schema, method, url, httpPart to identify the schema.
     * */
    const schemaDetail = (subSchemaPath) =>
      ({ [SCHEMA_CUSTOM_KEYWORDS.UNIQUE_OPERATION_ID]: `${this._collectionName}__MIA__${operationName}__MIA__${subSchemaPath}` })
    return {
      params: schemaDetail('params'),
      querystring: schemaDetail('querystring'),
      'response.200': schemaDetail('response.200'),
      body: schemaDetail('body'),
    }
  }

  generateGetListJSONSchema() {
    const patternProperties = getQueryStringFromRawSchema(this._pathFieldsRawSchema.patternProperties)
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.GET_LIST)

    return {
      summary: `Returns a list of documents in ${this._collectionName}`,
      description: 'Results can be filtered specifying the following parameters:',
      tags: [this._collectionBasePath],
      querystring: {
        ...schemaDetail.querystring,
        type: 'object',
        properties: {
          ...this._propertiesGetListValidation,
          ...getQueryStringFromRawSchema(this._pathFieldsRawSchema.paths),
        },
        ...Object.keys(patternProperties).length > 0 ? { patternProperties } : {},
        additionalProperties: false,
      },
      response: {
        200: {
          ...schemaDetail['response.200'],
          type: 'array',
          items: {
            type: 'object',
            properties: this._serializationProperties,
          },
        },
      },
    }
  }

  generateExportJSONSchema() {
    const patternProperties = getQueryStringFromRawSchema(this._pathFieldsRawSchema.patternProperties)
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.EXPORT)

    return {
      summary: `Export the ${this._collectionName} collection`,
      description: 'The exported documents are sent as newline separated JSON objects to facilitate large dataset streaming and parsing',
      tags: [this._collectionBasePath],
      querystring: {
        ...schemaDetail.querystring,
        type: 'object',
        properties: {
          ...this._propertiesGetExportValidation,
          ...getQueryStringFromRawSchema(this._pathFieldsRawSchema.paths),
        },
        ...Object.keys(patternProperties).length > 0 ? { patternProperties } : {},
        additionalProperties: false,
      },
    }
  }

  generateGetItemJSONSchema() {
    const patternProperties = {
      ...collectionFieldsRawObject(this._collectionDefinition),
      ...getQueryStringFromRawSchema(this._pathFieldsRawSchema.patternProperties),
    }
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.GET_ITEM)

    return {
      summary: `Returns the item with specific ID from the ${this._collectionName} collection.`,
      tags: [this._collectionBasePath],
      params: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The ID of the item to retrieve information for',
          },
        },
        ...schemaDetail.params,
      },
      querystring: {
        ...schemaDetail.querystring,
        type: 'object',
        properties: {
          ...this._propertiesGetValidation,
          ...getQueryStringFromRawSchema(this._pathFieldsRawSchema.paths),
        },
        ...Object.keys(patternProperties).length > 0 ? { patternProperties } : {},
        additionalProperties: false,
      },
      response: {
        200: {
          ...schemaDetail['response.200'],
          type: 'object',
          properties: this._serializationProperties,
        },
      },
    }
  }

  generatePostJSONSchema() {
    const requiredFields = this._requiredFields
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.POST_ITEM)

    return {
      summary: `Add a new item to the ${this._collectionName} collection.`,
      tags: [this._collectionBasePath],
      body: {
        ...schemaDetail.body,
        type: 'object',
        ...requiredFields.length > 0 ? { required: requiredFields } : {},
        properties: this._propertiesPostValidation,
        additionalProperties: false,
      },
      response: {
        200: {
          ...schemaDetail['response.200'],
          type: 'object',
          properties: {
            [MONGOID]: { ...mongoIdTypeValidator[this._idType]() },
          },
        },
      },
    }
  }

  generateValidateJSONSchema() {
    const requiredFields = this._requiredFields
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.VALIDATE)

    return {
      summary: `Verify if the body is valid for an insertion in the ${this._collectionName} collection.`,
      tags: [this._collectionBasePath],
      body: {
        ...schemaDetail.body,
        type: 'object',
        ...requiredFields.length > 0 ? { required: requiredFields } : {},
        properties: this._propertiesPostValidation,
        additionalProperties: false,
      },
      response: {
        200: {
          ...schemaDetail['response.200'],
          type: 'object',
          properties: {
            result: {
              type: 'string',
              enum: ['ok'],
            },
          },
        },
      },
    }
  }

  generateDeleteJSONSchema() {
    const patternProperties = getQueryStringFromRawSchema(this._pathFieldsRawSchema.patternProperties)
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.DELETE_ITEM)

    return {
      summary: `Delete an item with specific ID from the ${this._collectionName} collection.`,
      tags: [this._collectionBasePath],
      params: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The ID of the item to delete',
          },
        },
        ...schemaDetail.params,
      },
      querystring: {
        ...schemaDetail.querystring,
        type: 'object',
        properties: {
          ...this._propertiesDeleteValidation,
          ...getQueryStringFromRawSchema(this._pathFieldsRawSchema.paths),
        },
        ...Object.keys(patternProperties).length > 0 ? { patternProperties } : {},
        additionalProperties: false,
      },
    }
  }

  generateDeleteListJSONSchema() {
    const patternProperties = getQueryStringFromRawSchema(this._pathFieldsRawSchema.patternProperties)
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.DELETE_LIST)

    return {
      summary: `Delete multiple items from the ${this._collectionName} collection.`,
      tags: [this._collectionBasePath],
      querystring: {
        ...schemaDetail.querystring,
        type: 'object',
        properties: {
          ...this._propertiesDeleteValidation,
          ...getQueryStringFromRawSchema(this._pathFieldsRawSchema.paths),
        },
        ...Object.keys(patternProperties).length > 0 ? { patternProperties } : {},
        additionalProperties: false,
      },
    }
  }

  generateCountJSONSchema() {
    const patternProperties = getQueryStringFromRawSchema(this._pathFieldsRawSchema.patternProperties)
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.COUNT)

    return {
      summary: `Returns the number of items in the ${this._collectionName} collection.`,
      tags: [this._collectionBasePath],
      querystring: {
        ...schemaDetail.querystring,
        type: 'object',
        properties: {
          ...this._propertiesCountValidation,
          ...getQueryStringFromRawSchema(this._pathFieldsRawSchema.paths),
        },
        ...Object.keys(patternProperties).length > 0 ? { patternProperties } : {},
        additionalProperties: false,
      },
      response: {
        200: {
          ...schemaDetail['response.200'],
          type: 'integer',
          minimum: 0,
        },
      },
    }
  }

  generateBulkJSONSchema() {
    const requiredFields = this._requiredFields
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.POST_BULK)

    return {
      summary: `Insert new items in the ${this._collectionName} collection.`,
      tags: [this._collectionBasePath],
      body: {
        ...schemaDetail.body,
        type: 'array',
        items: {
          type: 'object',
          ...requiredFields.length > 0 ? { required: requiredFields } : {},
          properties: this._propertiesPostValidation,
          additionalProperties: false,
        },
      },
      response: {
        200: {
          ...schemaDetail['response.200'],
          type: 'array',
          items: {
            type: 'object',
            properties: {
              [MONGOID]: { ...mongoIdTypeValidator[this._idType]() },
            },
          },
        },
      },
    }
  }

  generatePatchJSONSchema() {
    const patternProperties = getQueryStringFromRawSchema(this._pathFieldsRawSchema.patternProperties)
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.PATCH_ITEM)

    return {
      summary: `Update the item with specific ID in the ${this._collectionName} collection.`,
      tags: [this._collectionBasePath],
      params: {
        properties: {
          id: {
            type: 'string',
            description: 'The ID of the item to update information for',
          },
        },
        type: 'object',
        ...schemaDetail.params,
      },
      querystring: {
        ...schemaDetail.querystring,
        type: 'object',
        properties: {
          ...this._propertiesPatchQueryValidation,
          ...getQueryStringFromRawSchema(this._pathFieldsRawSchema.paths),
        },
        ...Object.keys(patternProperties).length > 0 ? { patternProperties } : {},
        additionalProperties: false,
      },
      body: {
        ...schemaDetail.body,
        type: 'object',
        properties: this._propertiesPatchCommandsValidation,
        additionalProperties: false,
      },
      response: {
        200: {
          ...schemaDetail['response.200'],
          type: 'object',
          properties: this._serializationProperties,
        },
      },
    }
  }

  generateUpsertOneJSONSchema() {
    const patternProperties = getQueryStringFromRawSchema(this._pathFieldsRawSchema.patternProperties)
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.UPSERT_ONE)

    return {
      summary: `Update an item in the ${this._collectionName} collection. If the item is not in the collection, it will be inserted.`,
      tags: [this._collectionBasePath],
      querystring: {
        ...schemaDetail.querystring,
        type: 'object',
        properties: {
          ...this._propertiesPatchQueryValidation,
          ...getQueryStringFromRawSchema(this._pathFieldsRawSchema.paths),
        },
        ...Object.keys(patternProperties).length > 0 ? { patternProperties } : {},
        additionalProperties: false,
      },
      body: {
        ...schemaDetail.body,
        type: 'object',
        properties: this._propertiesUpsertCommandsValidation,
        additionalProperties: false,
      },
      response: {
        200: {
          ...schemaDetail['response.200'],
          type: 'object',
          properties: this._serializationProperties,
        },
      },
    }
  }

  generatePatchBulkJSONSchema() {
    const filterPatternProperties = getFilterFromRawSchema(this._pathFieldsRawSchema.patternProperties)
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.PATCH_BULK)

    return {
      summary: `Update multiple items of ${this._collectionName}, each one with its own modifications`,
      tags: [this._collectionBasePath],
      body: {
        ...schemaDetail.body,
        type: 'array',
        items: {
          type: 'object',
          properties: {
            filter: {
              type: 'object',
              properties: {
                [MONGOID]: { ...mongoIdTypeValidator[this._idType]() },
                [STATE]: { enum: Object.keys(STATES), default: 'PUBLIC' },
                ...copyPropertiesFilteringAttributes(this._propertiesPatchQueryValidation),
                ...getFilterFromRawSchema(this._pathFieldsRawSchema.paths),
              },
              ...Object.keys(filterPatternProperties).length > 0 ? { patternProperties: filterPatternProperties } : {},
              additionalProperties: false,
            },
            update: {
              type: 'object',
              properties: this._propertiesPatchCommandsValidation,
              additionalProperties: false,
            },
          },
          required: ['filter', 'update'],
        },
        minItems: 1,
      },
      response: {
        200: {
          ...schemaDetail['response.200'],
          type: 'integer',
          minimum: 0,
        },
      },
    }
  }

  generatePatchManyJSONSchema() {
    const patternProperties = getQueryStringFromRawSchema(this._pathFieldsRawSchema.patternProperties)
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.PATCH_MANY)

    return {
      summary: `Update the items of the ${this._collectionName} collection that match the query.`,
      tags: [this._collectionBasePath],
      querystring: {
        ...schemaDetail.querystring,
        type: 'object',
        properties: {
          ...this._propertiesPatchManyQueryValidation,
          ...getQueryStringFromRawSchema(this._pathFieldsRawSchema.paths),
        },
        ...Object.keys(patternProperties).length > 0 ? { patternProperties } : {},
        additionalProperties: false,
      },
      body: {
        ...schemaDetail.body,
        type: 'object',
        properties: this._propertiesPatchCommandsValidation,
        additionalProperties: false,
      },
      response: {
        200: {
          ...schemaDetail['response.200'],
          type: 'number',
          description: 'the number of documents that were modified',
        },
      },
    }
  }

  generateChangeStateJSONSchema() {
    const patternProperties = getQueryStringFromRawSchema(this._pathFieldsRawSchema.patternProperties)
    const properties = {
      ...copyPropertiesFilteringAttributes(this._propertiesPatchQueryValidation),
    }

    delete properties[STATE]
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.CHANGE_STATE)

    return {
      summary: `Change state of an item of ${this._collectionName} collection.`,
      tags: [this._collectionBasePath],
      params: {
        ...schemaDetail.params,
        properties: {
          id: {
            type: 'string',
            description: 'the ID of the item to have the property __STATE__ updated',
          },
        },
        type: 'object',
      },
      querystring: {
        ...schemaDetail.querystring,
        type: 'object',
        properties: {
          ...properties,
          ...getQueryStringFromRawSchema(this._pathFieldsRawSchema.paths),
        },
        ...Object.keys(patternProperties).length > 0 ? { patternProperties } : {},
        additionalProperties: false,
      },
      body: {
        ...schemaDetail.body,
        type: 'object',
        required: ['stateTo'],
        properties: {
          stateTo: {
            type: 'string',
            enum: ['PUBLIC', 'TRASH', 'DRAFT', 'DELETED'],
          },
        },
      },
    }
  }

  generateChangeStateManyJSONSchema() {
    const otherParams = {
      ...copyPropertiesFilteringAttributes(this._propertiesFilterChangeStateMany),
    }
    const filterPatternProperties = this._pathFieldsRawSchema.patternProperties || {}
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.CHANGE_STATE_MANY)

    return {
      summary: `Change state of multiple items of ${this._collectionName}.`,
      tags: [this._collectionBasePath],
      body: {
        ...schemaDetail.body,
        type: 'array',
        items: {
          type: 'object',
          properties: {
            filter: {
              type: 'object',
              properties: {
                [MONGOID]: { ...mongoIdTypeValidator[this._idType]() },
                ...otherParams,
                ...this._pathFieldsRawSchema.paths,
              },
              ...Object.keys(filterPatternProperties).length > 0 ? { patternProperties: filterPatternProperties } : {},
            },
            stateTo: {
              type: 'string',
              enum: ['PUBLIC', 'DRAFT', 'TRASH', 'DELETED'],
            },
          },
          required: ['filter', 'stateTo'],
          additionalProperties: false,
        },
        minItems: 1,
      },
      response: {
        200: {
          ...schemaDetail['response.200'],
          type: 'integer',
          minimum: 0,
          description: `Number of updated ${this._collectionName}`,
        },
      },
    }
  }
}

module.exports.SCHEMAS_ID = SCHEMAS_ID

function getQueryStringFromRawSchema(pathsMap = {}) {
  const TYPES_TO_SKIP = [JSON_SCHEMA_OBJECT_TYPE]
  const ITEMS_TYPE_TO_SKIP = [JSON_SCHEMA_OBJECT_TYPE, JSON_SCHEMA_ARRAY_TYPE]

  return Object.keys(pathsMap).reduce((acc, path) => {
    const { type } = pathsMap[path]
    if (
      TYPES_TO_SKIP.includes(type)
      || (type === JSON_SCHEMA_ARRAY_TYPE && ITEMS_TYPE_TO_SKIP.includes(pathsMap[path].items.type))
    ) {
      return acc
    }
    if (type === JSON_SCHEMA_ARRAY_TYPE) {
      return {
        ...acc,
        [path]: pathsMap[path].items,
      }
    }
    return {
      ...acc,
      [path]: pathsMap[path],
    }
  }, {})
}

function getFilterFromRawSchema(pathsMap = {}) {
  return Object.keys(pathsMap).reduce((acc, path) => {
    const { type } = pathsMap[path]
    if (type !== JSON_SCHEMA_ARRAY_TYPE) {
      return {
        ...acc,
        [path]: pathsMap[path],
      }
    }

    return {
      ...acc,
      [path]: {
        oneOf: [
          pathsMap[path],
          pathsMap[path].items,
        ],
      },
    }
  }, {})
}

function propertiesGetValidationCompatibility(collectionDefinition) {
  let properties = {}

  for (const field of collectionDefinition.fields) {
    if (!typesToIgnoreInQuerystring.has(field.type) && field.name !== MONGOID) {
      properties[field.name] = specialTypesValidationCompatibility[field.type]
        ? ({ ...specialTypesValidationCompatibility[field.type]() })
        : { type: field.type }

      if (field.description) {
        properties[field.name].description = field.description
      }
    }
  }

  properties = Object.assign(properties, defaultGetQueryParams, {
    [PROJECTION]: {
      type: 'string',
      description: 'Return only the properties specified in a comma separated list',
      examples: ['field1,field2,field3.nestedField'],
    },
    [STATE]: {
      type: 'string',
      pattern: '(PUBLIC|DRAFT|TRASH|DELETED)(,(PUBLIC|DRAFT|TRASH|DELETED))*',
      default: 'PUBLIC',
      description: 'Filter by \\_\\_STATE__, multiple states can be specified in OR by providing a comma separated list',
    },
    [RAW_PROJECTION]: {
      type: 'string',
      description: 'Additional raw stringified projection for MongoDB',
    },
  })

  delete properties.__STATE__

  return properties
}

function propertiesGetValidation(collectionDefinition) {
  if (!collectionDefinition.schema) {
    return propertiesGetValidationCompatibility(collectionDefinition)
  }

  const properties = Object
    .entries(collectionDefinition.schema.properties)
    .filter(([propertyName, jsonSchema]) =>
      ![...typesToIgnoreInQuerystring, JSON_SCHEMA_ARRAY_TYPE].includes(getInheritedType(jsonSchema))
      && propertyName !== MONGOID
      && propertyName !== __STATE__
    )
    .reduce((acc, [propertyName, jsonSchema]) => {
      const inheritedType = getInheritedType(jsonSchema)
      const itemDefinitions = { schema: jsonSchema }
      acc[propertyName] = specialTypesValidation[inheritedType]
        ? specialTypesValidation[inheritedType](itemDefinitions)
        : { type: inheritedType }
      if (jsonSchema.description) { acc[propertyName].description = jsonSchema.description }
      return acc
    }, {
      [PROJECTION]: {
        type: 'string',
        description: 'Return only the properties specified in a comma separated list',
        examples: ['field1,field2,field3.nestedField'],
      },
      [STATE]: {
        type: 'string',
        pattern: '(PUBLIC|DRAFT|TRASH|DELETED)(,(PUBLIC|DRAFT|TRASH|DELETED))*',
        default: 'PUBLIC',
        description: 'Filter by \\_\\_STATE__, multiple states can be specified in OR by providing a comma separated list',
      },
      [RAW_PROJECTION]: {
        type: 'string',
        description: 'Additional raw stringified projection for MongoDB',
      },
      ...defaultGetQueryParams,
    })

  return properties
}

function propertiesFilterChangeStateManyCompatibility(collectionDefinition) {
  const typesToIgnore = new Set([GEOPOINT])
  const properties = {}

  for (const field of collectionDefinition.fields) {
    if (!typesToIgnore.has(field.type) && field.name !== MONGOID) {
      if (field.type === ARRAY) {
        if (field.items.type === RAWOBJECTTYPE) {
          properties[field.name] = generateArrayProperty(field, specialTypesSerializationCompatibility)
        }
        // ignore array with items that are not RawObject
        continue
      }

      const fieldOptionFilter = {
        schema: field.schema,
      }
      properties[field.name] = specialTypesValidationCompatibility[field.type]
        ? ({ ...specialTypesValidationCompatibility[field.type](fieldOptionFilter) })
        : { type: field.type }

      if (field.description) {
        properties[field.name].description = field.description
      }
    }
  }

  delete properties.__STATE__

  return properties
}

function propertiesFilterChangeStateMany(collectionDefinition) {
  if (!collectionDefinition.schema) {
    return propertiesFilterChangeStateManyCompatibility(collectionDefinition)
  }

  const typesToIgnore = new Set([GEOPOINT])
  const properties = Object
    .entries(collectionDefinition.schema.properties)
    .filter(([propertyName, jsonSchema]) =>
      !typesToIgnore.has(jsonSchema.__mia_configuration?.type) && propertyName !== MONGOID && propertyName !== __STATE__
    )
    .reduce((propertiesAccumulator, [propertyName, jsonSchema]) => {
      if (jsonSchema.type === JSON_SCHEMA_ARRAY_TYPE && jsonSchema.items.type !== JSON_SCHEMA_OBJECT_TYPE) {
        return propertiesAccumulator
      }
      const isArrayOfObject = jsonSchema.type === JSON_SCHEMA_ARRAY_TYPE
        && jsonSchema.items.type === JSON_SCHEMA_OBJECT_TYPE

      if (isArrayOfObject) {
        return {
          ...propertiesAccumulator,
          [propertyName]: generateArrayProperty(jsonSchema, specialTypesSerialization),
        }
      }
      const itemDefinitions = {
        schema: jsonSchema,
      }

      const inheritedType = getInheritedType(jsonSchema)
      propertiesAccumulator[propertyName] = specialTypesValidation[inheritedType]
        ? ({ ...specialTypesValidation[inheritedType](itemDefinitions) })
        : { type: inheritedType }
      if (jsonSchema.description) { propertiesAccumulator[propertyName].description = jsonSchema.description }
      return propertiesAccumulator
    }, {})

  return properties
}

function propertiesDeleteValidation(collectionDefinition) {
  const properties = { ...propertiesGetValidation(collectionDefinition) }
  delete properties[PROJECTION]
  return properties
}

function propertiesGetListValidation(collectionDefinition, enableLimitConstraints, maxLimit, idType) {
  const properties = {
    ...propertiesGetValidation(collectionDefinition),
    ...defaultGetListQueryParams(enableLimitConstraints, maxLimit),
    [SORT]: {
      anyOf: [
        {
          type: 'string',
          pattern: sortRegex(collectionDefinition),
        },
        {
          type: 'array',
          items: { type: 'string', pattern: sortRegex(collectionDefinition) },
        },
      ],
      description: 'Sort by the specified property/properties (Start with a "-" to invert the sort order)',
    },
  }

  return {
    [MONGOID]: { ...mongoIdTypeValidator[idType]() },
    ...properties,
  }
}

function propertiesGetExportValidation(collectionDefinition, idType) {
  return {
    [MONGOID]: { ...mongoIdTypeValidator[idType]() },
    ...propertiesGetValidation(collectionDefinition),
    ...defaultGetListQueryParams(false),
    [SORT]: {
      anyOf: [
        {
          type: 'string',
          pattern: sortRegex(collectionDefinition),
        },
        {
          type: 'array',
          items: { type: 'string', pattern: sortRegex(collectionDefinition) },
        },
      ],
      description: 'Sort by the specified property/properties (Start with a "-" to invert the sort order)',
    },
  }
}


function propertiesPatchCommandsValidation(collectionDefinition, rawPathsAndPatternProperties = {}) {
  const patternProperties = collectionFieldsRawObject(collectionDefinition)
  const unsetPatternProperties = getUnsetPatternProperties(collectionDefinition)

  const {
    paths: rawPaths,
    pathsOperators: rawPathsOperators,
    patternProperties: rawPatternProperties,
    patternPropertiesOperators: rawPatternPropertiesOperators,
  } = rawPathsAndPatternProperties

  const arrayProperties = getArrayProperties(collectionDefinition, rawPaths)
  const arrayPropertiesWithMongoConditions = getArrayProperties(collectionDefinition, rawPaths, true)
  const arrayPatternProperties = getArrayPatternProperties(rawPatternProperties)
  const arrayPatternPropertiesWithMongoConditions = getArrayPatternProperties(rawPatternProperties, true)

  const propertiesTypeNumber = {
    ...getPropertiesFilteredByType(collectionDefinition, 'number'),
    ...getRawSchemaPathsFilteredByType(rawPaths, 'number'),
  }
  const patternPropertiesTypeNumber = getRawSchemaPathsFilteredByType(rawPatternProperties, 'number')

  return {
    [SETCMD]: {
      type: 'object',
      properties: {
        ...collectionFieldsProperties(collectionDefinition, true),
        ...collectionFieldsArrayOperationsProperties(collectionDefinition),
        ...rawPaths,
        ...rawPathsOperators,
      },
      additionalProperties: false,
      patternProperties: {
        ...patternProperties,
        ...rawPatternProperties,
        ...rawPatternPropertiesOperators,
      },
    },
    [UNSETCMD]: {
      type: 'object',
      properties: unsetProperties(collectionDefinition),
      additionalProperties: false,
      patternProperties: {
        ...patternProperties,
        ...unsetPatternProperties,
      },
    },
    [INCCMD]: {
      type: 'object',
      properties: propertiesTypeNumber,
      additionalProperties: false,
      patternProperties: {
        ...patternProperties,
        ...patternPropertiesTypeNumber,
      },
    },
    [MULCMD]: {
      type: 'object',
      properties: propertiesTypeNumber,
      additionalProperties: false,
      patternProperties: {
        ...patternProperties,
        ...patternPropertiesTypeNumber,
      },
    },
    [CURDATECMD]: {
      type: 'object',
      properties: getCurDateProperties(collectionDefinition),
      additionalProperties: false,
    },
    [PUSHCMD]: {
      type: 'object',
      properties: arrayProperties,
      ...Object.keys(arrayPatternProperties).length > 0 ? { patternProperties: arrayPatternProperties } : {},
      additionalProperties: false,
    },
    [PULLCMD]: {
      type: 'object',
      properties: arrayPropertiesWithMongoConditions,
      ...Object.keys(arrayPatternProperties).length > 0
        ? { patternProperties: arrayPatternPropertiesWithMongoConditions }
        : {},
      additionalProperties: false,
    },
    [ADDTOSETCMD]: {
      type: 'object',
      properties: arrayPropertiesWithMongoConditions,
      ...Object.keys(arrayPatternProperties).length > 0
        ? { patternProperties: arrayPatternPropertiesWithMongoConditions }
        : {},
      additionalProperties: false,
    },
  }
}

function propertiesUpsertCommandsValidation(collectionDefinition) {
  return {
    ...propertiesPatchCommandsValidation(collectionDefinition),
    [SETONINSERTCMD]: {
      type: 'object',
      properties: collectionFieldsProperties(collectionDefinition, true),
      additionalProperties: false,
    },
  }
}

function notMandatory(field) {
  return !mandatoryFields.has(field.name)
}

function notRequired(field) {
  return !field.required
}

function unsetPropertiesCompatibility(collectionDefinition) {
  return collectionDefinition
    .fields
    .filter(notRequired)
    .reduce((properties, field) => {
      return Object.assign(properties, { [field.name]: { type: 'boolean', enum: [true] } })
    }, {})
}


function unsetProperties(collectionDefinition) {
  if (!collectionDefinition.schema) {
    return unsetPropertiesCompatibility(collectionDefinition)
  }

  return Object
    .keys(collectionDefinition.schema.properties)
    .filter((propertyName) => !collectionDefinition.schema.required.includes(propertyName))
    .reduce((properties, propertyName) => ({
      ...properties,
      [propertyName]: { type: 'boolean', enum: [true] },
    }), {})
}

function getUnsetPatternPropertiesCompatibility(collectionDefinition) {
  return collectionDefinition
    .fields
    .filter(field => {
      const isRawObjectWithSchema = field.type === RAWOBJECTTYPE && field.schema
      const isArrayOfRawObjectWithSchema = field.type === ARRAY
        && field.items
        && field.items.type === RAWOBJECTTYPE
        && field.items.schema

      return isRawObjectWithSchema || isArrayOfRawObjectWithSchema
    })
    .reduce((properties, field) => ({
      ...properties,
      [`^${field.name}\\..+`]: { type: 'boolean', enum: [true] },
    }), {})
}

function getUnsetPatternProperties(collectionDefinition) {
  if (!collectionDefinition.schema) {
    return getUnsetPatternPropertiesCompatibility(collectionDefinition)
  }

  return Object
    .entries(collectionDefinition.schema.properties)
    .filter(([, jsonSchema]) => {
      const isObject = jsonSchema.type === JSON_SCHEMA_OBJECT_TYPE && Boolean(jsonSchema.properties)
      const isArrayOfObject = jsonSchema.type === JSON_SCHEMA_ARRAY_TYPE
        && jsonSchema.items.type === JSON_SCHEMA_OBJECT_TYPE
        && Boolean(jsonSchema.items.properties)

      return isObject || isArrayOfObject
    })
    .reduce((properties, [propertyName]) => ({
      ...properties,
      [`^${propertyName}\\..+`]: { type: 'boolean', enum: [true] },
    }), {})
}

function getCurDatePropertiesCompatibility(collectionDefiniton) {
  return collectionDefiniton
    .fields
    .filter(notMandatory)
    .filter(field => field.type === DATE)
    .reduce((properties, field) => ({
      ...properties,
      [field.name]: { type: 'boolean', enum: [true] },
    }), {})
}

function getCurDateProperties(collectionDefinition) {
  if (!collectionDefinition.schema) {
    return getCurDatePropertiesCompatibility(collectionDefinition)
  }

  return Object
    .entries(collectionDefinition.schema.properties)
    .filter(([propertyName, jsonSchema]) =>
      !mandatoryFields.has(propertyName) && DATE_FORMATS.includes(jsonSchema.format)
    )
    .reduce((properties, [propertyName]) => {
      return {
        ...properties,
        [propertyName]: { type: 'boolean', enum: [true] },
      }
    }, {})
}

const mongoOperatorSchema = { type: 'object', patternProperties: { '^$': {} } }

function getArrayPropertiesCompatibility(collectionDefinition, rawPaths = {}, withMongoDBConditionsSupport = false) {
  const fromFields = collectionDefinition
    .fields
    .filter(field => field.type === ARRAY)
    .reduce((properties, field) => {
      const itemDefinitions = {
        schema: field.items.schema,
      }

      const fieldItemType = field.items.type
      const fieldSchema = withMongoDBConditionsSupport
        ? { oneOf: [{ type: fieldItemType }, mongoOperatorSchema] }
        : { type: fieldItemType }

      return {
        ...properties,
        [field.name]: specialTypesValidation[fieldItemType]
          ? specialTypesValidation[fieldItemType](itemDefinitions)
          : fieldSchema,
      }
    }, {})

  const fromRaw = Object.keys(rawPaths).reduce((acc, key) => {
    if (rawPaths[key].type !== JSON_SCHEMA_ARRAY_TYPE) {
      return acc
    }
    return {
      ...acc,
      [key]: rawPaths[key].items,
    }
  }, {})

  return {
    ...fromFields,
    ...fromRaw,
  }
}

function getArrayProperties(collectionDefinition, rawPaths = {}, withMongoDBConditionsSupport = false) {
  if (!collectionDefinition.schema) {
    return getArrayPropertiesCompatibility(collectionDefinition, rawPaths, withMongoDBConditionsSupport)
  }

  const fromFields = Object
    .entries(collectionDefinition.schema.properties)
    .filter(([, jsonSchema]) => jsonSchema.type === JSON_SCHEMA_ARRAY_TYPE)
    .reduce((properties, [propertyName, jsonSchema]) => {
      const itemDefinitions = {
        schema: jsonSchema.items,
      }

      const inheritedType = getInheritedType(jsonSchema.items)
      const fieldSchema = withMongoDBConditionsSupport
        ? { oneOf: [{ type: inheritedType }, mongoOperatorSchema] }
        : { type: inheritedType }
      properties[propertyName] = specialTypesValidation[inheritedType]
        ? specialTypesValidation[inheritedType](itemDefinitions)
        : fieldSchema
      return properties
    }, {})

  const fromRaw = Object
    .keys(rawPaths)
    .reduce((acc, key) => {
      if (rawPaths[key].type !== JSON_SCHEMA_ARRAY_TYPE) {
        return acc
      }
      return {
        ...acc,
        [key]: rawPaths[key].items,
      }
    }, {})

  return {
    ...fromFields,
    ...fromRaw,
  }
}

function getArrayPatternProperties(rawPatternProperties = {}, withMongoDBConditionsSupport = false) {
  return Object.keys(rawPatternProperties).reduce((acc, key) => {
    if (rawPatternProperties[key].type !== JSON_SCHEMA_ARRAY_TYPE) {
      return acc
    }

    const originalFieldItemSchema = rawPatternProperties[key].items
    const fieldSchema = withMongoDBConditionsSupport
      ? { oneOf: [originalFieldItemSchema, mongoOperatorSchema] }
      : originalFieldItemSchema

    return {
      ...acc,
      [key]: fieldSchema,
    }
  }, {})
}

function getPropertiesFilteredByTypeCompatibility(collectionDefinition, type) {
  return collectionDefinition
    .fields
    .filter(notMandatory)
    .filter(field => field.type === type)
    .reduce((properties, field) => {
      return Object.assign(properties, {
        [field.name]: specialTypesSerializationCompatibility[type] || { type },
      })
    }, {})
}

function getPropertiesFilteredByType(collectionDefinition, type) {
  if (!collectionDefinition.schema) {
    return getPropertiesFilteredByTypeCompatibility(collectionDefinition, type)
  }

  return Object
    .entries(collectionDefinition.schema.properties)
    .filter(([propertyName, jsonSchema]) => !mandatoryFields.has(propertyName) && jsonSchema.type === type)
    .reduce((properties, [propertyName, jsonSchema]) => {
      const inheritedType = getInheritedType(jsonSchema)
      return {
        ...properties,
        [propertyName]: specialTypesSerialization[inheritedType] || { type: inheritedType },
      }
    }, {})
}

function getRawSchemaPathsFilteredByType(rawPaths = {}, type) {
  return Object.keys(rawPaths).reduce((acc, path) => {
    if (rawPaths[path].type !== type) {
      return acc
    }
    return {
      ...acc,
      [path]: rawPaths[path],
    }
  }, {})
}

module.exports.sortRegex = sortRegex

function sortRegexCompatibility(collectionDefinition) {
  const typesToIgnore = new Set([GEOPOINT])
  const orFields = collectionDefinition
    .fields
    .filter(field => !typesToIgnore.has(field.type))
    .map(field => field.name)
    .join('|')
  const subFieldSuffix = '(\\.([^\\.,])+)*'
  const singleFieldMatcher = `-?(${orFields})${subFieldSuffix}`
  return `^${singleFieldMatcher}(,${singleFieldMatcher})*$`
}

function sortRegex(collectionDefinition) {
  if (!collectionDefinition.schema) {
    return sortRegexCompatibility(collectionDefinition)
  }

  const typesToIgnore = new Set([GEOPOINT])
  const orFields = Object
    .entries(collectionDefinition.schema.properties)
    .filter(([, jsonSchema]) => !typesToIgnore.has(jsonSchema.__mia_configuration?.type))
    .map(([name]) => name)
    .join('|')
  const subFieldSuffix = '(\\.([^\\.,])+)*'
  const singleFieldMatcher = `-?(${orFields})${subFieldSuffix}`

  return `^${singleFieldMatcher}(,${singleFieldMatcher})*$`
}

function collectionFieldsArrayOperationsPropertiesCompatibility(collectionDefinition) {
  return collectionDefinition
    .fields
    .filter(field => field.type === ARRAY)
    .reduce((properties, field) => {
      const itemType = field.items.type
      const replacePropertyName = `${field.name}.$.${ARRAY_REPLACE_ELEMENT_OPERATOR}`
      const replaceFieldItemsOption = {
        schema: field.items.schema,
      }

      properties[replacePropertyName] = specialTypesValidationCompatibility[itemType]
        ? ({ ...specialTypesValidationCompatibility[itemType](replaceFieldItemsOption) })
        : { type: itemType }

      if (itemType === RAWOBJECTTYPE) {
        const mergePropertyName = `${field.name}.$.${ARRAY_MERGE_ELEMENT_OPERATOR}`
        properties[mergePropertyName] = {
          type: 'object',
          ...field.items.schema ? { properties: field.items.schema.properties } : {},
          // additionalProperties true to support dot notation
          additionalProperties: true,
        }
      }
      return properties
    }, {})
}

function collectionFieldsArrayOperationsProperties(collectionDefinition) {
  if (!collectionDefinition.schema) {
    return collectionFieldsArrayOperationsPropertiesCompatibility(collectionDefinition)
  }

  return Object
    .entries(collectionDefinition.schema.properties)
    .filter(([, jsonSchema]) => jsonSchema.type === JSON_SCHEMA_ARRAY_TYPE)
    .reduce((propertiesAccumulator, [propertyName, jsonSchema]) => {
      const replacePropertyName = `${propertyName}.$.${ARRAY_REPLACE_ELEMENT_OPERATOR}`
      const itemDefinitions = {
        schema: jsonSchema.items,
      }

      const inheritedType = getInheritedType(jsonSchema.items)

      propertiesAccumulator[replacePropertyName] = specialTypesValidation[inheritedType]
        ? ({ ...specialTypesValidation[inheritedType](itemDefinitions) })
        : { type: inheritedType }

      if (inheritedType === RAWOBJECTTYPE) {
        const mergePropertyName = `${propertyName}.$.${ARRAY_MERGE_ELEMENT_OPERATOR}`
        propertiesAccumulator[mergePropertyName] = {
          type: 'object',
          ...jsonSchema.items.properties ? { properties: jsonSchema.items.properties } : {},
          // additionalProperties true to support dot notation
          additionalProperties: true,
        }
      }

      return propertiesAccumulator
    }, {})
}

function collectionFieldsRawObjectCompatibility(collectionDefinition) {
  const arrayOperationsProperties = collectionDefinition
    .fields
    .filter(field => field.type === RAWOBJECTTYPE && !field.schema)
    .reduce((properties, field) => {
      const { name } = field
      // this const is used in patternProperties. This '.' character is not correct
      // because patternProperties accept a regex and the dot character matches every character, not just the dot.
      // We have to keep it to prevent breaking changes.
      properties[`${name}.`] = true
      return properties
    }, {})

  return arrayOperationsProperties
}

function collectionFieldsRawObject(collectionDefinition) {
  if (!collectionDefinition.schema) {
    return collectionFieldsRawObjectCompatibility(collectionDefinition)
  }

  const arrayOperationsProperties = Object
    .entries(collectionDefinition.schema.properties)
    .filter(([, jsonSchema]) => jsonSchema.type === JSON_SCHEMA_OBJECT_TYPE
      && !jsonSchema.properties
      && !jsonSchema.__mia_configuration?.type
    )
    .reduce((properties, [propertyName]) => {
      // this const is used in patternProperties. This '.' character is not correct
      // because patternProperties accept a regex and the dot character matches every character, not just the dot.
      // We have to keep it to prevent breaking changes.
      properties[`${propertyName}.`] = true
      return properties
    }, {})

  return arrayOperationsProperties
}

function collectionFieldsPropertiesCompatibility(collectionDefinition, validation) {
  const specialTypes = validation ? specialTypesValidationCompatibility : specialTypesSerializationCompatibility

  return collectionDefinition
    .fields
    .filter(field => !(validation && mandatoryFields.has(field.name)))
    .reduce((properties, field) => {
      if (field.type !== ARRAY) {
        const specialTypesType = { ...(specialTypes[field.type]
          ? specialTypes[field.type](field)
          : undefined),
        }
        properties[field.name] = specialTypes[field.type] ? specialTypesType : { type: field.type }
      } else {
        properties[field.name] = generateArrayProperty(field, specialTypes)
      }

      if (field.nullable === true) {
        properties[field.name].nullable = true
      }
      if (field.description) {
        properties[field.name].description = field.description
      }

      return properties
    }, {})
}

function collectionFieldsProperties(collectionDefinition, validation) {
  if (!collectionDefinition.schema) {
    return collectionFieldsPropertiesCompatibility(collectionDefinition, validation)
  }
  const specialTypes = validation ? specialTypesValidation : specialTypesSerialization

  return Object
    .entries(collectionDefinition.schema.properties)
    .filter(([propertyName]) => !(validation && mandatoryFields.has(propertyName)))
    .reduce((properties, [propertyName, jsonSchema]) => {
      if (jsonSchema.type === JSON_SCHEMA_ARRAY_TYPE) {
        properties[propertyName] = generateArrayProperty(jsonSchema, specialTypes)
      } else {
        const inheritedType = getInheritedType(jsonSchema)
        const itemDefinitions = { schema: jsonSchema }
        const specialTypesType = {
          ...(specialTypes[inheritedType] ? specialTypes[inheritedType](itemDefinitions) : undefined),
        }
        properties[propertyName] = specialTypes[inheritedType]
          ? specialTypesType
          : { type: inheritedType }
      }
      if (jsonSchema.description) { properties[propertyName].description = jsonSchema.description }
      if (jsonSchema.nullable) { properties[propertyName].nullable = jsonSchema.nullable ?? false }
      return properties
    }, {})
}

function getRequiredFieldsCompatibility(fields) {
  return fields
    .filter(field => field.required && !mandatoryFields.has(field.name))
    .map(field => field.name)
}

function getRequiredFields(collectionDefinition) {
  if (!collectionDefinition.schema) {
    return getRequiredFieldsCompatibility(collectionDefinition.fields)
  }

  return collectionDefinition.schema.required.filter(propertyName => !mandatoryFields.has(propertyName))
}

function generateArrayPropertyCompatibility(field, typesMap) {
  const itemType = field.items.type
  const itemDefinitions = {
    schema: field.items.schema,
  }

  return {
    type: 'array',
    items: typesMap[itemType] ? ({ ...typesMap[itemType](itemDefinitions) }) : { type: itemType },
  }
}

function generateArrayProperty(jsonSchema, typesMap) {
  if (!jsonSchema.items.properties && jsonSchema.items.schema) {
    return generateArrayPropertyCompatibility(jsonSchema, typesMap)
  }

  const itemType = getInheritedType(jsonSchema.items)
  const itemDefinitions = {
    schema: jsonSchema.items,
  }
  return {
    type: 'array',
    items: typesMap[itemType] ? ({ ...typesMap[itemType](itemDefinitions) }) : { type: itemType },
  }
}

function copyPropertiesFilteringAttributes(properties) {
  return Object.keys(properties).reduce(
    (acc, key) => {
      const item = properties[key]

      const itemCopy = { ...item }
      delete itemCopy.in
      delete itemCopy.name

      acc[key] = itemCopy
      return acc
    },
    {}
  )
}

function getIdTypeCompatibility(collectionDefinition) {
  const legacyReponse = (collectionDefinition.fields.find(field => field.name === MONGOID) ?? {})
  const { type: idType } = legacyReponse
  return idType
}

function getIdType(collectionDefinition) {
  if (!collectionDefinition.schema) {
    return getIdTypeCompatibility(collectionDefinition)
  }

  const response = collectionDefinition.schema.properties[MONGOID]
  const { __mia_configuration: miaConfiguration, type } = response ?? {}
  const { type: specialType } = miaConfiguration ?? {}
  return specialType ?? type
}


module.exports.sortRegex = sortRegex
