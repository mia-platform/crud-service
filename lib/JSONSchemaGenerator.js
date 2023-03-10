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

const specialTypesValidation = {
  [OBJECTID]: objectIdType,
  [GEOPOINT]: geoPointValidateSchema,
  [DATE]: validateDateSchema,
  [RAWOBJECTTYPE]: rawObjectTypeSchema,
}

const specialTypesSerialization = {
  [OBJECTID]: objectIdType,
  [GEOPOINT]: geoPointSerializeSchema,
  [DATE]: serializeDateSchema,
  [RAWOBJECTTYPE]: rawObjectTypeSchema,
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
  return endpointBasePath.replace(/\//g, '')
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
    const copy = () => JSON.parse(JSON.stringify(collectionDefinition))

    this._collectionName = collectionDefinition.name
    this._collectionBasePath = formatEndpointTag(collectionDefinition.endpointBasePath)
    this._collectionDefinition = collectionDefinition
    this._requiredFields = getRequiredFields(collectionDefinition.fields)
    this._pathFieldsRawSchema = pathFieldsRawSchema

    this._serializationProperties = collectionFieldsProperties(copy(), false)
    this._idType = collectionDefinition.fields.find(field => field.name === MONGOID).type
    this._propertiesGetListValidation = propertiesGetListValidation.call(this, copy(), enableLimitConstraint, maxLimit)
    this._propertiesGetExportValidation = propertiesGetExportValidation.call(this, copy())
    this._propertiesGetValidation = propertiesGetValidation(copy())
    this._propertiesDeleteValidation = propertiesDeleteValidation(copy())
    this._propertiesPatchCommandsValidation = propertiesPatchCommandsValidation(copy(), this._pathFieldsRawSchema)
    this._propertiesUpsertCommandsValidation = propertiesUpsertCommandsValidation(copy())
    this._propertiesPostValidation = {
      ...collectionFieldsProperties(copy(), true),
      __STATE__: {
        ...stateCreateValidationSchema(),
        default: collectionDefinition.defaultState,
      },
    }
    this._propertiesPatchQueryValidation = this._propertiesDeleteValidation
    this._propertiesFilterChangeStateMany = propertiesFilterChangeStateMany(copy())
    this._propertiesCountValidation = {
      [MONGOID]: { ...mongoIdTypeValidator[this._idType]() },
      ...this._propertiesDeleteValidation,
    }
    this._propertiesPatchManyQueryValidation = this._propertiesCountValidation
  }

  getSchemaDetail(operationName) {
    // TODO: follow comment below
    /* schemaDetail identifies the subschemas (params, querystring, response.200, body)
     * in the "setValidatorCompiler" function.
     * It could be removed after update to fastify 3.x and change to `setValidatorCompiler`
     * function that have schema, method, url, httpPart to identify the schema.
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

function propertiesGetValidation(collectionDefinition) {
  let properties = {}

  for (const field of collectionDefinition.fields) {
    if (!typesToIgnoreInQuerystring.has(field.type) && field.name !== MONGOID) {
      properties[field.name] = specialTypesValidation[field.type]
        ? ({ ...specialTypesValidation[field.type]() })
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

function propertiesFilterChangeStateMany(collectionDefinition) {
  const typesToIgnore = new Set([GEOPOINT])
  const properties = {}

  for (const field of collectionDefinition.fields) {
    if (!typesToIgnore.has(field.type) && field.name !== MONGOID) {
      if (field.type === ARRAY) {
        if (field.items.type === RAWOBJECTTYPE) {
          properties[field.name] = generateArrayProperty(field, specialTypesSerialization)
        }
        // ignore array with items that are not RawObject
        continue
      }

      const fieldOptionFilter = {
        schema: field.schema,
      }
      properties[field.name] = specialTypesValidation[field.type]
        ? ({ ...specialTypesValidation[field.type](fieldOptionFilter) })
        : { type: field.type }

      if (field.description) {
        properties[field.name].description = field.description
      }
    }
  }

  delete properties.__STATE__

  return properties
}

function propertiesDeleteValidation(collectionDefinition) {
  const properties = { ...propertiesGetValidation(collectionDefinition) }
  delete properties[PROJECTION]
  return properties
}

function propertiesGetListValidation(collectionDefinition, enableLimitConstraints, maxLimit) {
  let properties = propertiesGetValidation(collectionDefinition)
  properties = Object.assign(
    properties,
    defaultGetListQueryParams(enableLimitConstraints, maxLimit),
    {
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
  )

  return {
    [MONGOID]: { ...mongoIdTypeValidator[this._idType]() },
    ...properties,
  }
}

function propertiesGetExportValidation(collectionDefinition) {
  return {
    [MONGOID]: { ...mongoIdTypeValidator[this._idType]() },
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
  const arrayProperties = getArrayProperties(collectionDefinition, rawPathsAndPatternProperties.paths)
  const arrayPatternProperties = getArrayPatternProperties(rawPathsAndPatternProperties.patternProperties)
  const propertiesTypeNumber = {
    ...getPropertiesFilteredByType(collectionDefinition, 'number'),
    ...getRawSchemaPathsFilteredByType(rawPathsAndPatternProperties.paths, 'number'),
  }
  const patternPropertiesTypeNumber = getRawSchemaPathsFilteredByType(rawPathsAndPatternProperties.patternProperties, 'number')

  return {
    [SETCMD]: {
      type: 'object',
      properties: {
        ...collectionFieldsProperties(collectionDefinition, true),
        ...collectionFieldsArrayOperationsProperties(collectionDefinition),
        ...rawPathsAndPatternProperties.paths,
        ...rawPathsAndPatternProperties.pathsOperators,
      },
      additionalProperties: false,
      patternProperties: {
        ...patternProperties,
        ...rawPathsAndPatternProperties.patternProperties,
        ...rawPathsAndPatternProperties.patternPropertiesOperators,
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
    [ADDTOSETCMD]: {
      type: 'object',
      properties: arrayProperties,
      ...Object.keys(arrayPatternProperties).length > 0 ? { patternProperties: arrayPatternProperties } : {},
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

function unsetProperties(collectionDefinition) {
  return collectionDefinition
    .fields
    .filter(notRequired)
    .reduce((properties, field) => {
      return Object.assign(properties, { [field.name]: { type: 'boolean', enum: [true] } })
    }, {})
}

function getUnsetPatternProperties(collectionDefinition) {
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

function getCurDateProperties(collectionDefinition) {
  return collectionDefinition
    .fields
    .filter(notMandatory)
    .filter(field => field.type === DATE)
    .reduce((properties, field) => ({
      ...properties,
      [field.name]: { type: 'boolean', enum: [true] },
    }), {})
}

function getArrayProperties(collectionDefinition, rawPaths = {}) {
  const fromFields = collectionDefinition
    .fields
    .filter(field => field.type === ARRAY)
    .reduce((properties, field) => {
      const itemDefinitions = {
        schema: field.items.schema,
      }

      return {
        ...properties,
        [field.name]: specialTypesValidation[field.items.type]
          ? specialTypesValidation[field.items.type](itemDefinitions)
          : { type: field.items.type },
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

function getArrayPatternProperties(rawPatternProperties = {}) {
  return Object.keys(rawPatternProperties).reduce((acc, key) => {
    if (rawPatternProperties[key].type !== JSON_SCHEMA_ARRAY_TYPE) {
      return acc
    }
    return {
      ...acc,
      [key]: rawPatternProperties[key].items,
    }
  }, {})
}

function getPropertiesFilteredByType(collectionDefinition, type) {
  return collectionDefinition
    .fields
    .filter(notMandatory)
    .filter(field => field.type === type)
    .reduce((properties, field) => {
      return Object.assign(properties, {
        [field.name]: specialTypesSerialization[type] || { type },
      })
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
function sortRegex(collectionDefinition) {
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

function collectionFieldsArrayOperationsProperties(collectionDefinition) {
  return collectionDefinition
    .fields
    .filter(field => field.type === ARRAY)
    .reduce((properties, field) => {
      const itemType = field.items.type
      const replacePropertyName = `${field.name}.$.${ARRAY_REPLACE_ELEMENT_OPERATOR}`
      const replaceFieldItemsOption = {
        schema: field.items.schema,
      }

      properties[replacePropertyName] = specialTypesValidation[itemType]
        ? ({ ...specialTypesValidation[itemType](replaceFieldItemsOption) })
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

function collectionFieldsRawObject(collectionDefinition) {
  const arrayOperationsProperties = collectionDefinition
    .fields
    .filter(field => field.type === RAWOBJECTTYPE && !field.schema)
    .reduce((properties, field) => {
      const { name } = field
      // this function is used in patternProperties. This '.' character is not correct
      // because patternProperties accept a regex and the dot character matches every character, not just the dot.
      // We have to keep it to prevent breaking changes.
      properties[`${name}.`] = true
      return properties
    }, {})

  return arrayOperationsProperties
}

function collectionFieldsProperties(collectionDefinition, validation) {
  const specialTypes = validation ? specialTypesValidation : specialTypesSerialization

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

function getRequiredFields(fields) {
  return fields
    .filter(field => field.required && !mandatoryFields.has(field.name))
    .map(field => field.name)
}

function generateArrayProperty(field, typesMap) {
  const itemType = field.items.type
  const itemDefinitions = {
    schema: field.items.schema,
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
