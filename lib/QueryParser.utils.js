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

/* eslint-disable no-underscore-dangle */

'use strict'

const { DATE_FORMATS, DATE, JSON_SCHEMA_OBJECT_TYPE, RAWOBJECTTYPE, JSON_SCHEMA_ARRAY_TYPE, ARRAY } = require('./consts')

function getFieldDefinitionNameFromQuery(query = '') {
  // here are removed only the index identifiers from the potentially nested field name
  // (for example 'field-a.2.message' becomes 'field-a.message'
  // the regex requires that the chunk starts and ends with a digit,
  // allowing collection fields to contain digits in their name
  return query.split('.')
    .filter(chunk => !/^\d+$/.test(chunk))
    .join('.')
}

function getFieldDefinition(collectionDefinition) {
  function processJsonSchemaProperties(properties = {}, parentPath = '') {
    let result = {}

    for (const [key, value] of Object.entries(properties)) {
      const path = parentPath ? `${parentPath}.${key}` : key

      if (value.__mia_configuration) {
        result[path] = value.__mia_configuration.type ?? value.type
      } else {
        switch (value?.type) {
        case 'string': {
          result[path] = DATE_FORMATS.includes(value.format ?? '') ? DATE : 'string'
          break
        }
        case JSON_SCHEMA_ARRAY_TYPE: {
          result[path] = ARRAY
          if (value.items?.type === JSON_SCHEMA_OBJECT_TYPE) {
            result = { ...result, ...processJsonSchemaProperties(value.items?.properties, path) }
          }
          break
        }
        case JSON_SCHEMA_OBJECT_TYPE: {
          result[path] = RAWOBJECTTYPE
          result = { ...result, ...processJsonSchemaProperties(value?.properties, path) }
          break
        }
        default:
          result[path] = value.type
          break
        }
      }
    }

    return result
  }

  if (!collectionDefinition.schema) {
    return collectionDefinition.fields
      .reduce((acc, field) => {
        acc[field.name] = field.type
        if (field.type === RAWOBJECTTYPE) {
          return { ...acc, ...processJsonSchemaProperties(field.schema?.properties, field.name) }
        } else if (field.type === ARRAY && field.items?.type === RAWOBJECTTYPE) {
          return { ...acc, ...processJsonSchemaProperties(field.items.schema?.properties, field.name) }
        }

        return acc
      }, {})
  }

  return processJsonSchemaProperties(collectionDefinition.schema.properties)
}

module.exports = { getFieldDefinition, getFieldDefinitionNameFromQuery }
