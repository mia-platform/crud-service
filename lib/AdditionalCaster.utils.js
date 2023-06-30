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


const miaConfigurationKeys = [
  'sensitivityDescription',
  'sensitivityValue',
  'castFunction',
  'primaryKey',
  'custom',
]

const oneToOnePropertyKeys = [
  'description',
  'nullable',
]

const { mandatoryFields } = require('./schemaGetters')
const { STATES } = require('./consts')
const { getIdType } = require('./mongo/mongo-plugin')

function startingSchema(idType) {
  return {
    _id: idType === 'ObjectId' ? {
      type: 'string',
      pattern: '^[a-fA-F0-9]{24}$',
      __mia_configuration: {
        type: 'ObjectId',
      },
      description: 'Hexadecimal identifier of the document in the collection',
    } : {
      _id: {
        type: 'string',
        pattern: '^(?!\\s*$).+',
        description: 'String identifier of the document in the collection',
        example: '00000000-0000-4000-0000-000000000000',
      },
    },
    __STATE__: {
      type: 'string',
      enum: Object.values(STATES),
      description: 'The state of the document',
    },
    creatorId: {
      type: 'string',
      description: 'User id that has created this object',
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      description: 'Date of the request that has performed the object creation',
    },
    updaterId: {
      type: 'string',
      description: 'User id that has requested the last change successfully',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      description: 'Date of the request that has performed the last change',
    },
  }
}

function fieldsToSchema(fields) {
  const idType = getIdType({ fields })
  const schema = {
    type: 'object',
    required: fields.filter(field => field.required).map(field => field.name),
    properties: fields.reduce((acc, field) => {
      if (mandatoryFields.has(field.name)) { return acc }
      const jsonSchemaType = getJsonSchemaTypeFromCustomType(field.type)
      return {
        ...acc,
        [field.name]: {
          type: jsonSchemaType,
          ...getOneToOneProperties(field),
          ...getMiaConfiguration(field),
          ...(field.type === 'Date' ? { format: 'date-time' } : {}),
          ...(jsonSchemaType === 'object' ? getObjectSchema(field) : {}),
          ...(jsonSchemaType === 'array' ? getArraySchema(field) : {}),
          ...(field.pattern ? { pattern: field.pattern } : {}),
          ...(field.enum ? { enum: field.enum } : {}),
          ...(field.description ? { description: field.description } : {}),
        },
      }
    }, startingSchema(idType)),
  }

  return schema
}

function getOneToOneProperties(field) {
  return Object.fromEntries(
    Object.entries(field).filter(([key]) =>
      oneToOnePropertyKeys.includes(key)
    )
  )
}

function getMiaConfiguration(field) {
  const miaConfigurationPropertiesInField = miaConfigurationKeys.reduce((acc, keyword) => {
    return keyword in field ? {
      ...acc,
      [keyword]: field[keyword],
    } : acc
  }, {})

  const customType = doesTypeNeedToBeInMiaConfiguration(field.type) ? {
    type: field.type,
  } : {}

  const miaConfiguration = {
    ...miaConfigurationPropertiesInField,
    ...customType,
  }

  return Object.keys(miaConfiguration).length > 0 ? {
    __mia_configuration: miaConfiguration,
  } : {}
}

function getArraySchema(field) {
  const type = getJsonSchemaTypeFromCustomType(field.items.type)

  if (type === 'object') {
    return {
      items: {
        ...getObjectSchema(field.items, true),
      },
    }
  }

  return {
    items: {
      type,
    },
  }
}

function getObjectSchema(field, isArray) {
  if ('schema' in field && field.schema) {
    return {
      ...field.schema,
      ...getMiaConfiguration(field),
      type: 'object',
    }
  }

  return {
    ...getMiaConfiguration(field),
    type: 'object',
    ...isArray ? { additionalProperties: true } : {},
  }
}


function getJsonSchemaTypeFromCustomType(customType) {
  switch (customType) {
  case 'RawObject':
  case 'GeoPoint':
    return 'object'
  case 'ObjectId':
    return 'string'
  case 'string':
  case 'Date':
    return 'string'
  case 'number':
    return 'number'
  case 'boolean':
    return 'boolean'
  case 'Array':
    return 'array'

  default:
    throw new Error('Unrecognized field type')
  }
}

function doesTypeNeedToBeInMiaConfiguration(customType) {
  switch (customType) {
  case 'GeoPoint':
  case 'ObjectId':
    return true

  default:
    return false
  }
}

module.exports = {
  fieldsToSchema,
}
