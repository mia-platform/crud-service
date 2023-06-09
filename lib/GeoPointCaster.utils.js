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

const { MONGOID, UPDATERID, UPDATEDAT, CREATORID, CREATEDAT, __STATE__ } = require('./consts')

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

const mandatoryFields = [MONGOID, UPDATERID, UPDATEDAT, CREATORID, CREATEDAT, __STATE__]

function fieldsToSchema(fields) {
  const schema = {
    type: 'object',
    properties: fields.reduce((acc, field) => {
      if (mandatoryFields.includes(field.name)) { return acc }
      const jsonSchemaType = getJsonSchemaTypeFromCustomType(field.type)

      return {
        ...acc,
        [field.name]: {
          type: jsonSchemaType,
          ...getOneToOnePropreties(field),
          ...getMiaConfiguration(field),
          ...(field.type === 'Date' ? { format: 'date-time' } : {}),
          ...(jsonSchemaType === 'object' ? getObjectSchema(field) : {}),
          ...(jsonSchemaType === 'array' ? getArraySchema(field) : {}),
        },
      }
    }, {}),
  }

  return schema
}

function getOneToOnePropreties(field) {
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
      items: getObjectSchema(field.items),
    }
  }

  return {
    items: {
      type,
    },
  }
}

function getObjectSchema(field) {
  if ('schema' in field && field.schema) {
    return { ...field.schema, ...getMiaConfiguration(field), type: 'object' }
  }

  return {
    type: 'object',
    ...getMiaConfiguration(field),
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
