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

const {
  UPDATERID,
  UPDATEDAT,
  CREATORID,
  CREATEDAT,
  STATES,
  QUERY,
  LIMIT,
  SKIP,
  OBJECTID,
  GEOPOINT,
  DATE,
  RAWOBJECTTYPE,
  __STATE__,
  MONGOID,
} = require('./consts')

const { ObjectId } = require('mongodb')
const { v4: uuidv4 } = require('uuid')

const EXAMPLE_DATE = new Date('1997-04-24T07:00:00.000Z').toISOString()

const mandatoryFieldsWithoutId = (isNewSchema, validate) => {
  if (isNewSchema) {
    return {
      [CREATORID]: {
        type: 'string',
        description: 'User id that has created this object',
      },
      [CREATEDAT]: {
        type: ['string', 'object'],
        anyOf: [
          {
            type: 'string',
            format: 'date-time',
            examples: [EXAMPLE_DATE],
          },
          {
            type: 'object',
            instanceof: 'Date',
          },
          ...(validate ? [] : [{ type: 'string' }]),
        ],
      },
      [UPDATERID]: {
        type: 'string',
        description: 'User id that has requested the last change successfully',
      },
      [UPDATEDAT]: {
        type: ['string', 'object'],
        anyOf: [
          {
            type: 'string',
            format: 'date-time',
            examples: [EXAMPLE_DATE],
          },
          {
            type: 'object',
            instanceof: 'Date',
          },
          ...(validate ? [] : [{ type: 'string' }]),
        ],
      },
    }
  }

  return {
    [CREATORID]: {
      type: 'string',
      description: 'User id that has created this object',
    },
    [CREATEDAT]: {
      type: ['string', 'object'],
      anyOf: [
        {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$',
          description: '"date-time" according with https://tools.ietf.org/html/rfc3339#section-5.6',
          examples: [EXAMPLE_DATE],
        },
        {
          type: 'object',
          instanceof: 'Date',
        },
        ...(validate ? [] : [{ type: 'string' }]),
      ],
    },
    [UPDATERID]: {
      type: 'string',
      description: 'User id that has requested the last change successfully',
    },
    [UPDATEDAT]: {
      type: ['string', 'object'],
      anyOf: [
        {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$',
          description: '"date-time" according with https://tools.ietf.org/html/rfc3339#section-5.6',
          examples: [EXAMPLE_DATE],
        },
        {
          type: 'object',
          instanceof: 'Date',
        },
        ...(validate ? [] : [{ type: 'string' }]),
      ],
    },
  }
}

const objectIdType = () => {
  return {
    type: ['string', 'object'],
    description: 'Hexadecimal identifier of the document in the collection',
    anyOf: [
      {
        type: 'string',
        pattern: '^[a-fA-F\\d]{24}$',
        examples: [new ObjectId().toString()],
      },
      {
        type: 'object',
      },
    ],
  }
}

const stringType = () => ({
  type: 'string',
  pattern: '^(?!\\s*$).+',
  description: 'String identifier of the document in the collection',
  examples: [uuidv4()],
})

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

function validateDateSchemaCompatibility(jsonSchema) {
  if (jsonSchema?.schema?.nullable) {
    return {
      type: ['string', 'null', 'object'],
      anyOf: [
        {
          type: 'null',
          nullable: jsonSchema?.schema?.nullable,
        },
        {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$',
          description: '"date-time" according with https://tools.ietf.org/html/rfc3339#section-5.6',
          examples: [EXAMPLE_DATE],
        },
        {
          type: 'object',
          instanceof: 'Date',
        },
      ],
    }
  }
  return {
    type: ['string', 'object'],
    anyOf: [
      {
        type: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$',
        description: '"date-time" according with https://tools.ietf.org/html/rfc3339#section-5.6',
        examples: [EXAMPLE_DATE],
      },
      {
        type: 'object',
        instanceof: 'Date',
      },
    ],
  }
}

const serializeDateSchemaCompatibility = (jsonSchema) => {
  if (jsonSchema?.schema?.nullable) {
    return {
      type: ['string', 'null', 'object'],
      anyOf: [
        {
          type: 'null',
          nullable: jsonSchema?.schema?.nullable,
        },
        {
          type: 'string',
          format: 'date-time',
          examples: [EXAMPLE_DATE],
        },
        {
          type: 'object',
          instanceof: 'Date',
        },
        {
          type: 'string',
        },
      ],
    }
  }
  return {
    type: ['string', 'object'],
    anyOf: [
      {
        type: 'string',
        format: 'date-time',
        examples: [EXAMPLE_DATE],
      },
      {
        type: 'object',
        instanceof: 'Date',
      },
      {
        type: 'string',
      },
    ],
  }
}

const validateDateSchema = (jsonSchema) => {
  if (jsonSchema?.schema?.nullable) {
    return {
      type: ['string', 'null', 'object'],
      anyOf: [
        {
          type: 'null',
          nullable: jsonSchema?.schema?.nullable,
        },
        {
          type: 'string',
          format: jsonSchema?.schema?.format ?? 'date-time',
          examples: [EXAMPLE_DATE],
        },
        {
          type: 'object',
          instanceof: 'Date',
        },
      ],
    }
  }
  return {
    type: ['string', 'object'],
    anyOf: [
      {
        type: 'string',
        format: jsonSchema?.schema?.format ?? 'date-time',
        examples: [EXAMPLE_DATE],
      },
      {
        type: 'object',
        instanceof: 'Date',
      },
    ],
  }
}

const serializeDateSchema = (jsonSchema) => {
  if (jsonSchema?.schema?.nullable) {
    return {
      type: ['string', 'null', 'object'],
      anyOf: [
        {
          type: 'null',
          nullable: jsonSchema?.schema?.nullable,
        },
        {
          type: 'string',
          format: jsonSchema?.schema?.format ?? 'date-time',
          examples: [EXAMPLE_DATE],
        },
        {
          type: 'object',
          instanceof: 'Date',
        },
        {
          type: 'string',
        },
      ],
    }
  }
  return {
    type: ['string', 'object'],
    anyOf: [
      {
        type: 'string',
        format: jsonSchema?.schema?.format ?? 'date-time',
        examples: [EXAMPLE_DATE],
      },
      {
        type: 'object',
        instanceof: 'Date',
      },
      {
        type: 'string',
      },
    ],
  }
}

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
const mandatoryFields = new Set([MONGOID, UPDATERID, UPDATEDAT, CREATORID, CREATEDAT, __STATE__])

const mongoIdTypeValidator = {
  ObjectId: objectIdType,
  string: stringType,
}

const specialTypesValidationCompatibility = {
  [OBJECTID]: objectIdType,
  [GEOPOINT]: geoPointValidateSchema,
  [DATE]: validateDateSchemaCompatibility,
  [RAWOBJECTTYPE]: rawObjectTypeSchema,
}

const specialTypesSerializationCompatibility = {
  [OBJECTID]: objectIdType,
  [GEOPOINT]: geoPointSerializeSchema,
  [DATE]: serializeDateSchemaCompatibility,
  [RAWOBJECTTYPE]: rawObjectTypeSchema,
}

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

const SCHEMAS_ID = {
  GET_LIST: 'getList',
  GET_LIST_LOOKUP: 'getListLookup',
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


module.exports = {
  mandatoryFieldsWithoutId,
  objectIdType,
  stringType,
  geoPointValidateSchema,
  geoPointSerializeSchema,
  validateDateSchemaCompatibility,
  serializeDateSchemaCompatibility,
  validateDateSchema,
  serializeDateSchema,
  rawObjectTypeSchema,
  stateCreateValidationSchema,
  defaultGetQueryParams,
  defaultGetListQueryParams,
  mandatoryFields,
  mongoIdTypeValidator,
  specialTypesSerialization,
  specialTypesSerializationCompatibility,
  specialTypesValidation,
  specialTypesValidationCompatibility,
  SCHEMAS_ID,
}
