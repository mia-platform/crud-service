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

function getFieldJsonSchemaByType(field) {
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

module.exports = function generatePathFieldsForRawSchema(logger, collectionDefinition) {
  return collectionDefinition
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
          [field.name]: getFieldJsonSchemaByType(field),
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
}
