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

'use strict'

const {
  ARRAY,
  RAWOBJECTTYPE,
  JSON_SCHEMA_ARRAY_TYPE,
  JSON_SCHEMA_OBJECT_TYPE,
} = require('./consts')
const generatePathFromJsonSchema = require('./generatePathFromJsonSchema')

function getFieldJsonSchemaByTypeCompatibility(field) {
  if (field.type === ARRAY) {
    return {
      type: JSON_SCHEMA_ARRAY_TYPE,
      items: {
        type: JSON_SCHEMA_OBJECT_TYPE,
        properties: field.items.schema.properties,
      },
    }
  }
  return { type: JSON_SCHEMA_OBJECT_TYPE, properties: field.schema.properties }
}

function getFieldJsonSchemaByType(jsonSchema) {
  if (jsonSchema.type === JSON_SCHEMA_ARRAY_TYPE) {
    return {
      type: JSON_SCHEMA_ARRAY_TYPE,
      items: {
        type: JSON_SCHEMA_OBJECT_TYPE,
        properties: jsonSchema.items.properties,
      },
    }
  }
  return { type: JSON_SCHEMA_OBJECT_TYPE, properties: jsonSchema.properties }
}

const generatePathFieldsForRawSchemaCompatibility = (logger, collectionDefinition) => collectionDefinition
  .fields
  .filter(field => {
    const isObjectWithRawSchema = field.type === RAWOBJECTTYPE && field.schema
    const isArrayOfRawObjectWithRawSchema = field.type === ARRAY
        && field.items.type === RAWOBJECTTYPE
        && field.items.schema

    return isObjectWithRawSchema || isArrayOfRawObjectWithRawSchema
  })
  .reduce((acc, field) => {
    const jsonSchema = {
      type: JSON_SCHEMA_OBJECT_TYPE,
      properties: {
        [field.name]: getFieldJsonSchemaByTypeCompatibility(field),
      },
    }
    let generatedForFields = {}
    try {
      generatedForFields = generatePathFromJsonSchema(jsonSchema)
    } catch (error) {
      logger.error(
        { collectionName: collectionDefinition.name, field: field.name },
        error.message
      )
      throw error
    }
    return {
      paths: {
        ...acc.paths,
        ...generatedForFields.paths,
      },
      patternProperties: {
        ...acc.patternProperties,
        ...generatedForFields.patternProperties,
      },
      pathsOperators: {
        ...acc.pathsOperators,
        ...generatedForFields.pathsOperators,
      },
      patternPropertiesOperators: {
        ...acc.patternPropertiesOperators,
        ...generatedForFields.patternPropertiesOperators,
      },
    }
  }, {
    paths: {},
    patternProperties: {},
    pathsOperators: {},
    patternPropertiesOperators: {},
  })

module.exports = function generatePathFieldsForRawSchema(logger, collectionDefinition) {
  if (!collectionDefinition.schema) {
    return generatePathFieldsForRawSchemaCompatibility(logger, collectionDefinition)
  }

  return Object
    .entries(collectionDefinition.schema.properties)
    .filter(([, jsonSchema]) => {
      if (jsonSchema.__mia_configuration?.type) { return false }
      const isObject = jsonSchema.type === JSON_SCHEMA_OBJECT_TYPE
      const isArrayOfObject = jsonSchema.type === JSON_SCHEMA_ARRAY_TYPE
        && jsonSchema.items.type === JSON_SCHEMA_OBJECT_TYPE
        && Boolean(jsonSchema.items.properties)

      return isObject || isArrayOfObject
    })
    .reduce((acc, [propertyName, propertyJsonSchema]) => {
      const jsonSchema = {
        type: JSON_SCHEMA_OBJECT_TYPE,
        properties: {
          [propertyName]: getFieldJsonSchemaByType(propertyJsonSchema),
        },
      }
      let generatedForFields = {}
      try {
        generatedForFields = generatePathFromJsonSchema(jsonSchema)
      } catch (error) {
        logger.error(
          { collectionName: collectionDefinition.name, field: propertyName },
          error.message
        )
        throw error
      }
      return {
        paths: {
          ...acc.paths,
          ...generatedForFields.paths,
        },
        patternProperties: {
          ...acc.patternProperties,
          ...generatedForFields.patternProperties,
        },
        pathsOperators: {
          ...acc.pathsOperators,
          ...generatedForFields.pathsOperators,
        },
        patternPropertiesOperators: {
          ...acc.patternPropertiesOperators,
          ...generatedForFields.patternPropertiesOperators,
        },
      }
    }, {
      paths: {},
      patternProperties: {},
      pathsOperators: {},
      patternPropertiesOperators: {},
    })
}
