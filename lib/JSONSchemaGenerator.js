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
/* eslint-disable max-statements */
/* eslint-disable no-underscore-dangle */
/* eslint-disable max-lines */

'use strict'

const lomit = require('lodash.omit')

const {
  ARRAY,
  GEOPOINT,
  DATE,
  RAWOBJECTTYPE,
  SORT,
  PROJECTION,
  RAW_PROJECTION,
  STATE,
  MONGOID,
  SETCMD,
  UNSETCMD,
  INCCMD,
  MULCMD,
  CURDATECMD,
  SETONINSERTCMD,
  PUSHCMD,
  ADDTOSETCMD,
  STATES,
  ARRAY_MERGE_ELEMENT_OPERATOR,
  ARRAY_REPLACE_ELEMENT_OPERATOR,
  JSON_SCHEMA_ARRAY_TYPE,
  JSON_SCHEMA_OBJECT_TYPE,
  SCHEMA_CUSTOM_KEYWORDS,
  DATE_FORMATS,
  PULLCMD,
  UPDATERID,
  UPDATEDAT,
  CREATORID,
  CREATEDAT,
} = require('./consts')
const {
  stateCreateValidationSchema,
  mandatoryFieldsWithoutId,
  defaultGetQueryParams,
  defaultGetListQueryParams,
  mongoIdTypeValidator,
  mandatoryFields,
  specialTypesValidation,
  specialTypesSerializationCompatibility,
  specialTypesSerialization,
  specialTypesValidationCompatibility,
  SCHEMAS_ID,
} = require('./schemaGetters')

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
      tags = [],
    } = collectionDefinition

    const idType = getIdType(collectionDefinition) ?? 'ObjectId'
    const {
      collectionFields: validationProperties,
      collectionRawObject: patternProperties,
      required,
      sort,
      changeStateProperties,
      collectionFieldsArrayOperations,
      unsetPatternProperties,
      unsetProperties,
      dateProperties,
    } = collectionFieldsProperties(collectionDefinition, true)

    const {
      collectionFields: serializationProperties,
    } = collectionFieldsProperties(collectionDefinition, false)
    const validationGetProperties = propertiesGetValidation(
      structuredClone(validationProperties),
      Boolean(collectionDefinition.schema)
    )
    const validationGetListProperties = propertiesGetListValidation(
      structuredClone(validationGetProperties),
      enableLimitConstraint,
      maxLimit,
      idType,
      sort
    )
    const patchCommandsProperties = propertiesPatchCommandsValidation(
      collectionDefinition,
      validationProperties,
      patternProperties,
      collectionFieldsArrayOperations,
      unsetPatternProperties,
      unsetProperties,
      dateProperties,
      pathFieldsRawSchema
    )
    const deleteProperties = propertiesDeleteValidation(structuredClone(validationGetProperties))
    const countAndQueryValidation = {
      [MONGOID]: { ...mongoIdTypeValidator[idType]() },
      ...structuredClone(deleteProperties),
    }

    this._idType = idType
    this._pathFieldsRawSchema = pathFieldsRawSchema
    this._collectionName = collectionName
    this._collectionFieldsRawObject = patternProperties
    this._serializationProperties = serializationProperties
    this._collectionTags = [formatEndpointTag(endpointBasePath), ...tags]
    this._queryStringFromPatternProperties = getQueryStringFromRawSchema(pathFieldsRawSchema.patternProperties)
    this._queryStringFromPaths = getQueryStringFromRawSchema(pathFieldsRawSchema.paths)

    this._propertiesGetValidation = validationGetProperties
    this._requiredFields = required

    this._propertiesGetListValidation = validationGetListProperties
    this._propertiesGetExportValidation = propertiesGetExportValidation(
      validationGetListProperties,
      idType,
      sort
    )
    this._propertiesDeleteValidation = deleteProperties
    this._propertiesPatchCommandsValidation = patchCommandsProperties
    this._propertiesUpsertCommandsValidation = propertiesUpsertCommandsValidation(
      patchCommandsProperties,
      validationProperties
    )
    this._propertiesPostValidation = {
      ...validationProperties,
      __STATE__: {
        ...stateCreateValidationSchema(),
        default: collectionDefaultState,
      },
    }
    this._propertiesPatchQueryValidation = deleteProperties
    this._propertiesFilterChangeStateMany = changeStateProperties
    this._propertiesCountValidation = { ...countAndQueryValidation }
    this._propertiesPatchManyQueryValidation = { ...countAndQueryValidation }
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
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.GET_LIST)

    return {
      summary: `Returns a list of documents in ${this._collectionName}`,
      description: 'Results can be filtered specifying the following parameters:',
      tags: this._collectionTags,
      querystring: {
        ...schemaDetail.querystring,
        type: 'object',
        properties: {
          ...this._propertiesGetListValidation,
          ...this._queryStringFromPaths,
        },
        ...Object.keys(this._queryStringFromPatternProperties).length > 0
          ? { patternProperties: this._queryStringFromPatternProperties }
          : {},
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

  generatePostImportJSONSchema() {
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.POST_FILE)
    const requiredFields = this._requiredFields

    const schema = {
      summary: `Insert new items in the ${this._collectionName} collection by input file, it is possible to define the _id`,
      tags: this._collectionTags,
      consumes: ['multipart/form-data'],
      body: {
        ...schemaDetail.body,
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              file: {
                type: 'file',
                description: 'the supported content-type are: application/x-ndjson, application/json and text/csv',
              },
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              file: {
                type: 'file',
                description: 'the supported content-type are: application/x-ndjson, application/json and text/csv',
              },
              encoding: {
                type: 'string',
                enum: ['utf8', 'ucs2', 'utf16le', 'latin1', 'ascii', 'base64', 'hex'],
                description: 'CSV: The encoding to use to parse the file',
              },
              delimiter: {
                type: 'string',
                minLength: 1,
                maxLength: 10,
                description: 'CSV: The delimiter to use to parse the file',
              },
              escape: {
                type: 'string',
                minLength: 1,
                maxLength: 10,
                description: 'CSV: The escape to use to parse the file',
              },
            },
          },
        ],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
            },
          },
        },
      },
      streamBody: {
        type: 'object',
        ...schemaDetail.body,
        ...requiredFields.length > 0 ? { required: requiredFields } : {},
        properties: {
          ...this._propertiesPostValidation,
          ...mandatoryFieldsWithoutId(true),
          [MONGOID]: { ...mongoIdTypeValidator[this._idType]() },
        },
        additionalProperties: false,
      },
      optionSchema: {},
    }

    schema.optionSchema = removeFileTypeFromSchema(schema.body)
    return schema
  }

  generatePatchImportJSONSchema() {
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.PATCH_FILE)
    const requiredFields = [MONGOID, ...this._requiredFields]

    const schema = {
      summary: `Update items in the ${this._collectionName} collection by input file. It requires the _id. use /export as template`,
      tags: this._collectionTags,
      consumes: ['multipart/form-data'],
      body: {
        ...schemaDetail.body,
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              file: {
                type: 'file',
                description: 'the supported content-type are: application/x-ndjson, application/json and text/csv',
              },
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              file: {
                type: 'file',
                description: 'the supported content-type are: application/x-ndjson, application/json and text/csv',
              },
              encoding: {
                type: 'string',
                enum: ['utf8', 'ucs2', 'utf16le', 'latin1', 'ascii', 'base64', 'hex'],
                description: 'CSV: The encoding to use to parse the file',
              },
              delimiter: {
                type: 'string',
                minLength: 1,
                maxLength: 10,
                description: 'CSV: The delimiter to use to parse the file',
              },
              escape: {
                type: 'string',
                minLength: 1,
                maxLength: 10,
                description: 'CSV: The escape to use to parse the file',
              },
            },
          },
        ],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
            },
          },
        },
      },
      streamBody: {
        type: 'object',
        ...schemaDetail.body,
        required: requiredFields,
        properties: {
          ...this._propertiesPostValidation,
          ...mandatoryFieldsWithoutId(true),
          [MONGOID]: { ...mongoIdTypeValidator[this._idType]() },
        },
        additionalProperties: false,
      },
      optionSchema: {},
    }

    schema.optionSchema = removeFileTypeFromSchema(schema.body)
    return schema
  }

  generateGetListLookupJSONSchema() {
    const patternProperties = getQueryStringFromRawSchema(this._pathFieldsRawSchema.patternProperties)
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.GET_LIST_LOOKUP)

    const unsupportedQueryParams = [UPDATERID, UPDATEDAT, CREATORID, CREATEDAT, RAW_PROJECTION]

    const supportMongoID = this._collectionDefinition?.schema?.properties[MONGOID]
    || this._collectionDefinition?.fields?.findIndex((field) => field.name === MONGOID) > -1

    if (!supportMongoID) {
      unsupportedQueryParams.push(MONGOID)
    }

    return {
      summary: `Returns a list of documents in ${this._collectionName}`,
      description: 'Results can be filtered specifying the following parameters:',
      tags: this._collectionTags,
      querystring: {
        ...schemaDetail.querystring,
        type: 'object',
        properties: {
          ...lomit(this._propertiesGetListValidation, unsupportedQueryParams),
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
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.EXPORT)

    return {
      summary: `Export the ${this._collectionName} collection`,
      description: 'The exported documents are sent as newline separated JSON objects to facilitate large dataset streaming and parsing',
      tags: this._collectionTags,
      querystring: {
        ...schemaDetail.querystring,
        type: 'object',
        properties: {
          ...this._propertiesGetExportValidation,
          ...this._queryStringFromPaths,
        },
        ...Object.keys(this._queryStringFromPatternProperties).length > 0
          ? { patternProperties: this._queryStringFromPatternProperties }
          : {},
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

  generateGetItemJSONSchema() {
    const patternProperties = {
      ...this._collectionFieldsRawObject,
      ...this._queryStringFromPatternProperties,
    }
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.GET_ITEM)

    return {
      summary: `Returns the item with specific ID from the ${this._collectionName} collection.`,
      tags: this._collectionTags,
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
          ...this._queryStringFromPaths,
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
      tags: this._collectionTags,
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
      tags: this._collectionTags,
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
    const patternProperties = this._queryStringFromPatternProperties
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.DELETE_ITEM)

    return {
      summary: `Delete an item with specific ID from the ${this._collectionName} collection.`,
      tags: this._collectionTags,
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
          ...this._queryStringFromPaths,
        },
        ...Object.keys(patternProperties).length > 0 ? { patternProperties } : {},
        additionalProperties: false,
      },
    }
  }

  generateDeleteListJSONSchema() {
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.DELETE_LIST)

    return {
      summary: `Delete multiple items from the ${this._collectionName} collection.`,
      tags: this._collectionTags,
      querystring: {
        ...schemaDetail.querystring,
        type: 'object',
        properties: {
          ...this._propertiesDeleteValidation,
          ...this._queryStringFromPaths,
        },
        ...Object.keys(this._queryStringFromPatternProperties).length > 0
          ? { patternProperties: this._queryStringFromPatternProperties }
          : {},
        additionalProperties: false,
      },
    }
  }

  generateCountJSONSchema() {
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.COUNT)

    return {
      summary: `Returns the number of items in the ${this._collectionName} collection.`,
      tags: this._collectionTags,
      querystring: {
        ...schemaDetail.querystring,
        type: 'object',
        properties: {
          ...this._propertiesCountValidation,
          ...this._queryStringFromPaths,
        },
        ...Object.keys(this._queryStringFromPatternProperties).length > 0
          ? { patternProperties: this._queryStringFromPatternProperties }
          : {},
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
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.POST_BULK)

    return {
      summary: `Insert new items in the ${this._collectionName} collection.`,
      tags: this._collectionTags,
      body: {
        ...schemaDetail.body,
        type: 'array',
        items: {
          type: 'object',
          ...this._requiredFields.length > 0 ? { required: this._requiredFields } : {},
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
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.PATCH_ITEM)

    return {
      summary: `Update the item with specific ID in the ${this._collectionName} collection.`,
      tags: this._collectionTags,
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
          ...this._queryStringFromPaths,
        },
        ...Object.keys(this._queryStringFromPatternProperties).length > 0
          ? { patternProperties: this._queryStringFromPatternProperties }
          : {},
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
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.UPSERT_ONE)

    return {
      summary: `Update an item in the ${this._collectionName} collection. If the item is not in the collection, it will be inserted.`,
      tags: this._collectionTags,
      querystring: {
        ...schemaDetail.querystring,
        type: 'object',
        properties: {
          ...this._propertiesPatchQueryValidation,
          ...this._queryStringFromPaths,
        },
        ...Object.keys(this._queryStringFromPatternProperties).length > 0
          ? { patternProperties: this._queryStringFromPatternProperties }
          : {},
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
      tags: this._collectionTags,
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
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.PATCH_MANY)

    return {
      summary: `Update the items of the ${this._collectionName} collection that match the query.`,
      tags: this._collectionTags,
      querystring: {
        ...schemaDetail.querystring,
        type: 'object',
        properties: {
          ...this._propertiesPatchManyQueryValidation,
          ...this._queryStringFromPaths,
        },
        ...Object.keys(this._queryStringFromPatternProperties).length > 0
          ? { patternProperties: this._queryStringFromPatternProperties }
          : {},
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
    const properties = {
      ...copyPropertiesFilteringAttributes(this._propertiesPatchQueryValidation),
    }

    delete properties[STATE]
    const schemaDetail = this.getSchemaDetail(SCHEMAS_ID.CHANGE_STATE)

    return {
      summary: `Change state of an item of ${this._collectionName} collection.`,
      tags: this._collectionTags,
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
          ...this._queryStringFromPaths,
        },
        ...Object.keys(this._queryStringFromPatternProperties).length > 0
          ? { patternProperties: this._queryStringFromPatternProperties }
          : {},
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
      tags: this._collectionTags,
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

function propertiesGetValidation(validationProperties, isNewSchema) {
  const properties = {
    ...mandatoryFieldsWithoutId(isNewSchema, true),
    ...validationProperties,
    ...defaultGetQueryParams,
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
  }

  Object.keys(properties).forEach(property => {
    if ([
      JSON_SCHEMA_ARRAY_TYPE,
      JSON_SCHEMA_OBJECT_TYPE,
    ].includes(properties[property].type)) { delete properties[property] }
  })
  return properties
}

function propertiesDeleteValidation(propertiesGet) {
  delete propertiesGet[PROJECTION]
  return propertiesGet
}

function propertiesGetListValidation(propertiesGet, enableLimitConstraints, maxLimit, idType, sort) {
  const properties = {
    ...propertiesGet,
    ...defaultGetListQueryParams(enableLimitConstraints, maxLimit),
    [SORT]: {
      anyOf: [
        {
          type: 'string',
          pattern: sort,
        },
        {
          type: 'array',
          items: { type: 'string', pattern: sort },
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

function propertiesGetExportValidation(propertiesGetList, idType, sort) {
  return {
    [MONGOID]: { ...mongoIdTypeValidator[idType]() },
    ...propertiesGetList,
    ...defaultGetListQueryParams(false),
    [SORT]: {
      anyOf: [
        {
          type: 'string',
          pattern: sort,
        },
        {
          type: 'array',
          items: { type: 'string', pattern: sort },
        },
      ],
      description: 'Sort by the specified property/properties (Start with a "-" to invert the sort order)',
    },
  }
}


function propertiesPatchCommandsValidation(
  collectionDefinition,
  validationProperties,
  patternProperties,
  collectionFieldsArrayOperations,
  unsetPatternProperties,
  unsetProperties,
  dateProperties,
  rawPathsAndPatternProperties = {}
) {
  const {
    paths: rawPaths,
    pathsOperators: rawPathsOperators,
    patternProperties: rawPatternProperties,
    patternPropertiesOperators: rawPatternPropertiesOperators,
  } = rawPathsAndPatternProperties

  const {
    fromFields: arrayProperties,
    fromFieldsWithMongoSupport: arrayPropertiesWithMongoConditions,
  } = getArrayProperties(collectionDefinition, rawPaths)
  const {
    withMongoDBConditionsSupport: arrayPatternPropertiesWithMongoConditions,
    withoutMongoDBConditionsSupport: arrayPatternProperties,
  } = getArrayPatternProperties(rawPatternProperties)

  const propertiesTypeNumber = {
    ...getPropertiesFilteredByType(collectionDefinition, 'number'),
    ...getRawSchemaPathsFilteredByType(rawPaths, 'number'),
  }
  const patternPropertiesTypeNumber = getRawSchemaPathsFilteredByType(rawPatternProperties, 'number')

  return {
    [SETCMD]: {
      type: 'object',
      properties: {
        ...validationProperties,
        ...collectionFieldsArrayOperations,
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
      properties: unsetProperties,
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
      properties: dateProperties,
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
      ...Object.keys(arrayPatternPropertiesWithMongoConditions).length > 0
        ? { patternProperties: arrayPatternPropertiesWithMongoConditions }
        : {},
      additionalProperties: false,
    },
    [ADDTOSETCMD]: {
      type: 'object',
      properties: arrayPropertiesWithMongoConditions,
      ...Object.keys(arrayPatternPropertiesWithMongoConditions).length > 0
        ? { patternProperties: arrayPatternPropertiesWithMongoConditions }
        : {},
      additionalProperties: false,
    },
  }
}

function propertiesUpsertCommandsValidation(propertiesPatchCommands, validationProperties) {
  return {
    ...propertiesPatchCommands,
    [SETONINSERTCMD]: {
      type: 'object',
      properties: validationProperties,
      additionalProperties: false,
    },
  }
}

function notMandatory(field) {
  return !mandatoryFields.has(field.name)
}

function getUnsetProperties() {
  return { type: 'boolean', enum: [true] }
}

const mongoOperatorSchema = { type: 'object', patternProperties: { '^$': {} } }

function getArrayPropertiesCompatibility(collectionDefinition, rawPaths = {}) {
  const fromFieldsWithMongoSupport = {}
  const fromFields = {}

  for (const field of collectionDefinition.fields) {
    if (field.type !== ARRAY) { continue }
    const itemDefinitions = {
      schema: field.items.schema,
    }

    const fieldItemType = field.items.type

    fromFields[field.name] = specialTypesValidation[fieldItemType]
      ? specialTypesValidation[fieldItemType](itemDefinitions)
      : { type: fieldItemType }
    fromFieldsWithMongoSupport[field.name] = specialTypesValidation[fieldItemType]
      ? specialTypesValidation[fieldItemType](itemDefinitions)
      : { oneOf: [{ type: fieldItemType }, mongoOperatorSchema] }
  }

  const fromRaw = {}

  for (const key of Object.keys(rawPaths)) {
    if (rawPaths[key].type !== JSON_SCHEMA_ARRAY_TYPE) {
      continue
    }
    fromRaw[key] = rawPaths[key].items
  }

  return {
    fromFields: {
      ...fromFields,
      ...fromRaw,
    },
    fromFieldsWithMongoSupport: {
      ...fromFieldsWithMongoSupport,
      ...fromRaw,
    },
  }
}

function getArrayProperties(collectionDefinition, rawPaths = {}) {
  if (!collectionDefinition.schema) {
    return getArrayPropertiesCompatibility(collectionDefinition, rawPaths)
  }

  const fromFieldsWithMongoSupport = {}
  const fromFields = {}

  for (const [propertyName, jsonSchema] of Object.entries(collectionDefinition.schema.properties)) {
    if (!(jsonSchema.type === JSON_SCHEMA_ARRAY_TYPE)) { continue }
    const itemDefinitions = {
      schema: jsonSchema.items,
    }

    const inheritedType = getInheritedType(jsonSchema.items)
    fromFields[propertyName] = specialTypesValidation[inheritedType]
      ? specialTypesValidation[inheritedType](itemDefinitions)
      : { type: inheritedType }
    fromFieldsWithMongoSupport[propertyName] = specialTypesValidation[inheritedType]
      ? specialTypesValidation[inheritedType](itemDefinitions)
      : { oneOf: [{ type: inheritedType }, mongoOperatorSchema] }
  }

  const fromRaw = {}

  for (const key of Object.keys(rawPaths)) {
    if (rawPaths[key].type !== JSON_SCHEMA_ARRAY_TYPE) {
      continue
    }
    fromRaw[key] = rawPaths[key].items
  }

  return {
    fromFields: {
      ...fromFields,
      ...fromRaw,
    },
    fromFieldsWithMongoSupport: {
      ...fromFieldsWithMongoSupport,
      ...fromRaw,
    },
  }
}

function getArrayPatternProperties(rawPatternProperties = {}) {
  const withMongoDBConditionsSupport = {}
  const withoutMongoDBConditionsSupport = {}
  Object.keys(rawPatternProperties).forEach((key) => {
    if (typeof rawPatternProperties[key] === 'boolean' && rawPatternProperties[key]) {
      withMongoDBConditionsSupport[key] = { oneOf: [{}, mongoOperatorSchema] }
      withoutMongoDBConditionsSupport[key] = {}
      return
    }
    if (rawPatternProperties[key].type !== JSON_SCHEMA_ARRAY_TYPE) {
      return
    }

    const originalFieldItemSchema = rawPatternProperties[key].items

    withMongoDBConditionsSupport[key] = { oneOf: [originalFieldItemSchema, mongoOperatorSchema] }
    withoutMongoDBConditionsSupport[key] = originalFieldItemSchema
  })

  return {
    withMongoDBConditionsSupport,
    withoutMongoDBConditionsSupport,
  }
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

function sortRegex(orFields, propertyName, type) {
  const typesToIgnore = new Set([GEOPOINT])
  if (typesToIgnore.has(type)) { return orFields }
  return orFields.concat(propertyName)
}

function buildSortRegex(orFields) {
  const fields = [...mandatoryFields, ...orFields]
  const subFieldSuffix = '(\\.([^\\.,])+)*'
  const singleFieldMatcher = `-?(${fields.join('|')})${subFieldSuffix}`
  return `^${singleFieldMatcher}(,${singleFieldMatcher})*$`
}

function collectionFieldsArrayOperationsPropertiesCompatibility(field, collectionFieldsArrayOperations = {}) {
  const itemType = field.items.type
  const replacePropertyName = `${field.name}.$.${ARRAY_REPLACE_ELEMENT_OPERATOR}`
  const replaceFieldItemsOption = {
    schema: field.items.schema,
  }

  const propertyOperation = {
    [replacePropertyName]: specialTypesValidationCompatibility[itemType]
      ? ({ ...specialTypesValidationCompatibility[itemType](replaceFieldItemsOption) })
      : { type: itemType },
  }

  if (itemType === RAWOBJECTTYPE) {
    const mergePropertyName = `${field.name}.$.${ARRAY_MERGE_ELEMENT_OPERATOR}`
    propertyOperation[mergePropertyName] = {
      type: 'object',
      ...field.items.schema ? { properties: field.items.schema.properties } : {},
      // additionalProperties true to support dot notation
      additionalProperties: true,
    }
  }
  return { ...collectionFieldsArrayOperations, ...propertyOperation }
}

function collectionFieldsArrayOperationsProperties(propertyName, jsonSchema, collectionFieldsArrayOperations = {}) {
  const replacePropertyName = `${propertyName}.$.${ARRAY_REPLACE_ELEMENT_OPERATOR}`
  const itemDefinitions = {
    schema: jsonSchema.items,
  }

  const inheritedType = getInheritedType(jsonSchema.items)

  const propertyOperation = {
    [replacePropertyName]: specialTypesValidation[inheritedType]
      ? { ...specialTypesValidation[inheritedType](itemDefinitions) }
      : { type: inheritedType },
  }

  if (inheritedType === RAWOBJECTTYPE) {
    const mergePropertyName = `${propertyName}.$.${ARRAY_MERGE_ELEMENT_OPERATOR}`
    propertyOperation[mergePropertyName] = {
      type: 'object',
      ...jsonSchema.items.properties ? { properties: jsonSchema.items.properties } : {},
      // additionalProperties true to support dot notation
      additionalProperties: true,
    }
  }

  return { ...collectionFieldsArrayOperations, ...propertyOperation }
}

function collectionFieldsPropertiesCompatibility(collectionDefinition, validation) {
  const specialTypes = validation ? specialTypesValidationCompatibility : specialTypesSerializationCompatibility
  const collectionRawObject = {}
  const required = []
  let changeStateProperties = mandatoryFieldsWithoutId(false, validation)
  const unsetPatternProperties = {}
  const unsetProperties = {}
  const dateProperties = {}

  let collectionFields = {}
  let orFields = []
  let collectionFieldsArrayOperations = {}

  for (let i = 0; i < collectionDefinition.fields.length; i++) {
    if (validation && mandatoryFields.has(collectionDefinition.fields[i].name)) {
      continue
    }
    collectionFields = generateCollectionFields(
      collectionDefinition.fields[i],
      collectionDefinition.fields[i].name,
      specialTypes,
      collectionFields,
      true
    )
    changeStateProperties = generateChangeStateProperties(
      collectionDefinition.fields[i],
      collectionDefinition.fields[i].name,
      specialTypes,
      changeStateProperties,
      true
    )

    orFields = sortRegex(orFields, collectionDefinition.fields[i].name, collectionDefinition.fields[i].type)

    if (collectionDefinition.fields[i].type === ARRAY) {
      collectionFieldsArrayOperations = collectionFieldsArrayOperationsPropertiesCompatibility(
        collectionDefinition.fields[i],
        collectionFieldsArrayOperations
      )
      if (collectionDefinition.fields[i].items.type === RAWOBJECTTYPE) {
        if (collectionDefinition.fields[i].items.schema) {
          unsetPatternProperties[`^${collectionDefinition.fields[i].name}\\..+`] = getUnsetProperties()
        }
      }
    }


    if (collectionDefinition.fields[i].type === RAWOBJECTTYPE) {
      if (!collectionDefinition.fields[i].schema) {
        collectionRawObject[`${collectionDefinition.fields[i].name}.`] = true
      }
      if (collectionDefinition.fields[i].schema) {
        unsetPatternProperties[`^${collectionDefinition.fields[i].name}\\..+`] = getUnsetProperties()
      }
    }

    if (collectionDefinition.fields[i].type === DATE) {
      dateProperties[collectionDefinition.fields[i].name] = getUnsetProperties()
    }

    if (!mandatoryFields.has(collectionDefinition.fields[i].name)) {
      if (collectionDefinition.fields[i].required) {
        required.push(collectionDefinition.fields[i].name)
      }
      if (!collectionDefinition.fields[i].required) {
        unsetProperties[collectionDefinition.fields[i].name] = getUnsetProperties()
      }
    }
  }

  const sort = buildSortRegex(orFields)

  return {
    collectionFields,
    collectionRawObject,
    required,
    sort,
    changeStateProperties,
    collectionFieldsArrayOperations,
    unsetPatternProperties,
    unsetProperties,
    dateProperties,
  }
}

function collectionFieldsProperties(collectionDefinition, validation) {
  if (!collectionDefinition.schema) {
    return collectionFieldsPropertiesCompatibility(collectionDefinition, validation)
  }
  const specialTypes = validation ? specialTypesValidation : specialTypesSerialization
  const collectionRawObject = {}
  const required = collectionDefinition
    .schema
    .required
    ?.filter(propertyName => !mandatoryFields.has(propertyName)) ?? []
  const unsetPatternProperties = {}
  const unsetProperties = {}
  const dateProperties = {}

  let orFields = []
  let collectionFieldsArrayOperations = {}
  let collectionFields = {}
  let changeStateProperties = mandatoryFieldsWithoutId(true, validation)

  for (const [propertyName, jsonSchema] of Object.entries(collectionDefinition.schema.properties)) {
    if (validation && mandatoryFields.has(propertyName)) {
      continue
    }

    collectionFields = generateCollectionFields(jsonSchema, propertyName, specialTypes, collectionFields, false)
    changeStateProperties = generateChangeStateProperties(
      jsonSchema,
      propertyName,
      specialTypes,
      changeStateProperties,
      false
    )
    orFields = sortRegex(orFields, propertyName, jsonSchema.__mia_configuration?.type)

    if (!required.includes(propertyName)) {
      unsetProperties[propertyName] = getUnsetProperties()
    }
    if (!mandatoryFields.has(propertyName) && DATE_FORMATS.includes(jsonSchema.format)) {
      dateProperties[propertyName] = getUnsetProperties()
    }

    if (jsonSchema.type === JSON_SCHEMA_ARRAY_TYPE) {
      collectionFieldsArrayOperations = collectionFieldsArrayOperationsProperties(
        propertyName,
        jsonSchema,
        collectionFieldsArrayOperations
      )
      if (jsonSchema.items.type === JSON_SCHEMA_OBJECT_TYPE && jsonSchema.items.properties) {
        unsetPatternProperties[`^${propertyName}\\..+`] = getUnsetProperties()
      }
    }

    if (jsonSchema.type === JSON_SCHEMA_OBJECT_TYPE && !jsonSchema.__mia_configuration?.type) {
      if (!jsonSchema.properties) {
        collectionRawObject[`${propertyName}.`] = true
      }
      if (jsonSchema.properties) {
        unsetPatternProperties[`^${propertyName}\\..+`] = getUnsetProperties()
      }
    }
  }

  const sort = buildSortRegex(orFields)

  return {
    collectionFields,
    collectionRawObject,
    required,
    sort,
    changeStateProperties,
    collectionFieldsArrayOperations,
    unsetPatternProperties,
    unsetProperties,
    dateProperties,
  }
}

function generateCollectionFields(jsonSchema, propertyName, specialTypes, collectionFields, compatibility) {
  collectionFields[propertyName] = {}
  if (jsonSchema.description) {
    collectionFields[propertyName].description = jsonSchema.description
  }
  if (jsonSchema.nullable) {
    collectionFields[propertyName].nullable = jsonSchema.nullable
  }
  if ([JSON_SCHEMA_ARRAY_TYPE, ARRAY].includes(jsonSchema.type)) {
    collectionFields[propertyName] = {
      ...generateArrayProperty(jsonSchema, specialTypes),
      ...collectionFields[propertyName],
    }
    return collectionFields
  }
  const inheritedType = getInheritedType(jsonSchema)
  const itemDefinitions = inheritedType === RAWOBJECTTYPE
    ? { schema: compatibility ? jsonSchema.schema : jsonSchema }
    : { schema: jsonSchema }
  const specialTypesType = specialTypes[inheritedType] ? specialTypes[inheritedType](itemDefinitions) : undefined
  collectionFields[propertyName] = specialTypes[inheritedType]
    ? { ...specialTypesType, ...collectionFields[propertyName] }
    : { type: inheritedType, ...collectionFields[propertyName] }
  return collectionFields
}

function generateChangeStateProperties(jsonSchema, propertyName, specialTypes, changeStateProperties, compatibility) {
  const typesToIgnore = new Set([GEOPOINT])
  if (
    typesToIgnore.has(jsonSchema.__mia_configuration?.type ?? jsonSchema.type)
    || (
      [ARRAY, JSON_SCHEMA_ARRAY_TYPE].includes(jsonSchema.type)
      && ![RAWOBJECTTYPE, JSON_SCHEMA_OBJECT_TYPE].includes(jsonSchema.items?.type)
    )) {
    return changeStateProperties
  }

  changeStateProperties[propertyName] = {}

  if (jsonSchema.description) {
    changeStateProperties[propertyName].description = jsonSchema.description
  }

  if (
    [ARRAY, JSON_SCHEMA_ARRAY_TYPE].includes(jsonSchema.type)
  && [RAWOBJECTTYPE, JSON_SCHEMA_OBJECT_TYPE].includes(jsonSchema.items?.type)
  ) {
    changeStateProperties[propertyName] = {
      ...generateArrayProperty(jsonSchema, specialTypes),
      ...changeStateProperties[propertyName],
    }
    return changeStateProperties
  }

  const inheritedType = getInheritedType(jsonSchema)
  const itemDefinitions = inheritedType === RAWOBJECTTYPE
    ? { schema: compatibility ? jsonSchema.schema : jsonSchema }
    : { schema: jsonSchema }
  const specialTypesType = specialTypes[inheritedType] ? specialTypes[inheritedType](itemDefinitions) : undefined
  changeStateProperties[propertyName] = specialTypes[inheritedType]
    ? { ...specialTypesType, ...changeStateProperties[propertyName] }
    : { type: inheritedType, ...changeStateProperties[propertyName] }

  return changeStateProperties
}

function generateArrayPropertyCompatibility(field, typesMap) {
  const itemType = field.items.type
  const itemDefinitions = {
    schema: field.items.schema,
  }
  const items = typesMap[itemType] ? ({ ...typesMap[itemType](itemDefinitions) }) : { type: itemType }
  const arrayOfItems = {
    type: 'array',
    items,
  }
  const type = ['array', items.type].flat()

  if (field.nullable) {
    arrayOfItems.nullable = field.nullable
    items.nullable = field.nullable
    type.push('null')
  }

  return {
    type,
    anyOf: [
      arrayOfItems,
      items,
    ],
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
  const items = typesMap[itemType] ? ({ ...typesMap[itemType](itemDefinitions) }) : { type: itemType }
  const arrayOfItems = {
    type: 'array',
    items,
  }
  const type = ['array', items.type].flat()

  if (jsonSchema.nullable) {
    arrayOfItems.nullable = jsonSchema.nullable
    items.nullable = jsonSchema.nullable
    type.push('null')
  }

  return {
    type,
    anyOf: [
      arrayOfItems,
      items,
    ],
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
  const legacyReponse = collectionDefinition.fields.find(field => field.name === MONGOID)
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

function getInheritedType(jsonSchema) {
  if (jsonSchema.__mia_configuration?.type) { return jsonSchema.__mia_configuration.type }
  if (jsonSchema.type === 'string' && DATE_FORMATS.includes(jsonSchema.format ?? '')) { return DATE }
  if (jsonSchema.type === JSON_SCHEMA_OBJECT_TYPE) { return RAWOBJECTTYPE }
  return jsonSchema.type
}

function formatEndpointTag(endpointBasePath) {
  return endpointBasePath
    .replace(/^\//g, '')
    .replace(/\//g, ' ')
    .replace(/-/g, ' ')
}

function removeFileTypeFromSchema(bodySchema) {
  const schemaWithoutFile = {
    ...bodySchema,
    anyOf: bodySchema.anyOf.map((anyOfschema) => {
      anyOfschema.properties = Object.fromEntries(
        Object.entries(anyOfschema.properties).filter(([key]) => {
          return key !== 'file'
        })
      )
      return anyOfschema
    }),
  }
  return schemaWithoutFile
}
