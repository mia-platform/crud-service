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

const { ObjectId } = require('mongodb')
const {
  ARRAY_MERGE_ELEMENT_OPERATOR,
  ARRAY_REPLACE_ELEMENT_OPERATOR,
  RAWOBJECTTYPE,
  ARRAY,
  JSON_SCHEMA_ARRAY_TYPE,
  TEXT_INDEX,
  NORMAL_INDEX,
  JSON_SCHEMA_OBJECT_TYPE,
  DATE,
  DATE_FORMATS,
  OBJECTID,
  GEOPOINT,
} = require('../lib/consts')

class QueryParser {
  constructor(collectionDefinition, pathsForRawSchema) {
    this._fieldDefinition = getFieldDefinition(collectionDefinition)
    this._nullableFields = getNullableFields(collectionDefinition)
    this._rawObjectAccesses = getRawObjectFields(collectionDefinition)
    this._pathsForRawSchema = pathsForRawSchema
    this._textIndexFields = getTextIndexes(collectionDefinition, TEXT_INDEX)
    this._normalIndexes = getTextIndexes(collectionDefinition, NORMAL_INDEX)

    this.traverseBinded = value => {
      traverse(this._fieldDefinition, this.traverseBinded, value)
    }

    this.traverseBody = value => {
      traverseBody(this._fieldDefinition, this._nullableFields, value)
    }

    this.traverseCommands = (commands, editableFields) => {
      traverseCommands(
        this._fieldDefinition,
        this._nullableFields,
        this._rawObjectAccesses,
        commands,
        editableFields,
        this._pathsForRawSchema
      )
    }

    this.traverseTextSearchQuery = (query) => {
      startTraverseTextSearchQuery(query, this._normalIndexes, this._fieldDefinition, this.traverseBinded)
    }

    this.isTextSearchQuery = (query) => checkIfTextSearchQuery(query)

    this.parseAndCastBody = this.parseAndCastBody.bind(this)
  }

  parseAndCast(query) {
    this.traverseBinded(query)
  }

  parseAndCastBody(doc) {
    this.traverseBody(doc)
  }

  parseAndCastCommands(commands, editableFields) {
    this.traverseCommands(commands, editableFields)
  }

  parseAndCastTextSearchQuery(query) {
    this.traverseTextSearchQuery(query)
  }

  // TODO: understand why this!
  isTextSearchQuery(query) {
    return this.isTextSearchQuery(query)
  }
}

function castDate(value) {
  if (value === null) {
    return null
  }

  const type = typeof value

  if (type === 'number' || type === 'string') {
    const date = new Date(value)
    if (!isNaN(date.getTime())) { return date }
  }
  throw new Error('Invalid Date')
}

function castToGeoPoint(value) {
  return { type: 'Point', coordinates: value }
}

function castArray(value) {
  return value
}

function castToObjectId(value) {
  if (value === null) {
    return value
  }

  // Number are accepted by mongodb as timestamp
  // for generating the ObjectId in that time
  if (ObjectId.isValid(value) && typeof value !== 'number') {
    return new ObjectId(value)
  }
  throw new Error('Invalid objectId')
}

function callCastFunctionOnValue(value, castFunction) {
  return castFunction(value)
}
callCastFunctionOnValue.supportedTypes = {
  string: true,
  boolean: true,
  number: true,
  Date: true,
  ObjectId: true,
  Array: false,
  GeoPoint: true,
}

function callCastFunctionOnArray(array, castFunction) {
  return array.map(castFunction)
}
callCastFunctionOnArray.supportedTypes = {
  string: true,
  boolean: true,
  number: true,
  Date: true,
  ObjectId: true,
  Array: true,
  GeoPoint: true,
}

function castNearSphere(value, castFunction) {
  const nearShpere = { $geometry: castFunction(value.from) }

  if (value.minDistance) {
    nearShpere.$minDistance = value.minDistance
  }
  if (value.maxDistance) {
    nearShpere.$maxDistance = value.maxDistance
  }

  return nearShpere
}
castNearSphere.supportedTypes = {
  string: false,
  boolean: false,
  number: false,
  Date: false,
  ObjectId: false,
  Array: false,
  GeoPoint: true,
}

function callExists(value) {
  return value
}
callExists.supportedTypes = {
  string: true,
  boolean: true,
  number: true,
  Date: true,
  ObjectId: true,
  Array: true,
  GeoPoint: true,
}

function callElemMatch(value) {
  return value
}
callElemMatch.supportedTypes = {
  string: false,
  boolean: false,
  number: false,
  Date: false,
  ObjectId: false,
  Array: true,
  GeoPoint: false,
}

const castValueFunctions = {
  [DATE]: castDate,
  [OBJECTID]: castToObjectId,
  [GEOPOINT]: castToGeoPoint,
  [ARRAY]: castArray,
}

const traverseOperatorFunctions = {
  $gt: callCastFunctionOnValue,
  $lt: callCastFunctionOnValue,
  $gte: callCastFunctionOnValue,
  $lte: callCastFunctionOnValue,
  $eq: callCastFunctionOnValue,
  $ne: callCastFunctionOnValue,
  $in: callCastFunctionOnArray,
  $nin: callCastFunctionOnArray,
  $all: callCastFunctionOnArray,
  $exists: callExists,
  $nearSphere: castNearSphere,
  $regex: callCastFunctionOnValue,
  $elemMatch: callElemMatch,
  // for $regex
  $options: callCastFunctionOnValue,
}

function identity(value) { return value }

// eslint-disable-next-line max-statements
function traverse(fieldDefinition, traverseBinded, query) {
  for (const key of Object.keys(query)) {
    const fieldType = fieldDefinition[key.split('.')[0]]
    if (fieldType === RAWOBJECTTYPE || fieldType === ARRAY) { continue }

    if (key === '$and' || key === '$or') {
      query[key].forEach(traverseBinded)
      continue
    }
    if (key === '$text') {
      continue
    }

    if (key[0] === '$') {
      throw new Error(`Unknown operator: ${key}`)
    }
    if (!fieldDefinition[key]) {
      throw new Error(`Unknown field: ${key}`)
    }

    const type = fieldDefinition[key]
    const castValueFunction = castValueFunctions[type] || identity

    const value = query[key]
    if (value === undefined) { continue }
    if (value === null || (value && value.constructor !== Object)) {
      query[key] = castValueFunction(value, fieldDefinition[key])
      continue
    }

    const queryKey = Object.keys(value)
    for (const operator of queryKey) {
      const traverseOperatorFunction = traverseOperatorFunctions[operator]
      if (!traverseOperatorFunction) {
        throw new Error(`Unsupported operator: ${operator}`)
      }
      if (!traverseOperatorFunction.supportedTypes[type]) {
        throw new Error(`Unsupported operator: ${operator} for ${type} field`)
      }

      const operatorValue = value[operator]
      query[key][operator] = traverseOperatorFunction(operatorValue, castValueFunction)
    }
  }
}

function traverseBody(fieldDefinition, nullableFields, doc) {
  const keys = Object.keys(doc)
  for (const key of keys) {
    if (!fieldDefinition[key]) {
      throw new Error(`Unknown field: ${key}`)
    }

    const type = fieldDefinition[key]
    const castValueFunction = castValueFunctions[type]
    if (!castValueFunction) {
      continue
    }

    const value = doc[key]
    if (value === null && nullableFields[key]) {
      continue
    }

    doc[key] = castValueFunction(value)
  }
}

function getFieldDefinitionCompatibility(collectionDefinition) {
  return collectionDefinition
    .fields
    .reduce((acc, field) => {
      acc[field.name] = field.type
      return acc
    }, {})
}

function getFieldDefinition(collectionDefinition) {
  if (!collectionDefinition.schema) {
    return getFieldDefinitionCompatibility(collectionDefinition)
  }

  return Object
    .entries(collectionDefinition.schema.properties)
    .reduce((acc, [propertyName, jsonSchema]) => {
      if (jsonSchema.__mia_configuration?.type) {
        acc[propertyName] = jsonSchema.__mia_configuration.type
        return acc
      }

      if (jsonSchema.type === 'string' && DATE_FORMATS.includes(jsonSchema.format ?? '')) {
        acc[propertyName] = DATE
        return acc
      }

      if (jsonSchema.type === JSON_SCHEMA_OBJECT_TYPE) {
        acc[propertyName] = RAWOBJECTTYPE
        return acc
      }

      if (jsonSchema.type === JSON_SCHEMA_ARRAY_TYPE) {
        acc[propertyName] = ARRAY
        return acc
      }

      acc[propertyName] = jsonSchema.type
      return acc
    }, {})
}

function getNullableFieldsCompatibility(collectionDefinition) {
  return collectionDefinition
    .fields
    .reduce((acc, field) => {
      if (field.nullable === true) {
        acc[field.name] = true
      }
      return acc
    }, {})
}

function getNullableFields(collectionDefinition) {
  if (!collectionDefinition.schema) {
    return getNullableFieldsCompatibility(collectionDefinition)
  }

  return Object
    .entries(collectionDefinition.schema.properties)
    .reduce((acc, [propertyName, jsonSchema]) => {
      acc[propertyName] = jsonSchema.nullable
      return acc
    }, {})
}

function getRawObjectFieldsCompatibility(collectionDefinition) {
  return collectionDefinition
    .fields
    .reduce((acc, field) => {
      if (field.type !== RAWOBJECTTYPE) {
        return acc
      }
      acc.push(new RegExp(`^${field.name}\\.`))
      return acc
    }, [])
}

function getRawObjectFields(collectionDefinition) {
  if (!collectionDefinition.schema) {
    return getRawObjectFieldsCompatibility(collectionDefinition)
  }

  return Object
    .entries(collectionDefinition.schema.properties)
    .reduce((acc, [propertyName, jsonSchema]) => {
      if (jsonSchema.type !== JSON_SCHEMA_OBJECT_TYPE) {
        return acc
      }
      acc.push(new RegExp(`^${propertyName}\\.`))
      return acc
    }, [])
}

function getTextIndexes(collectionDefinition, type) {
  if (!collectionDefinition.indexes) {
    return []
  }
  return collectionDefinition
    .indexes
    .filter(index => index.type === type)
    .reduce((acc, index) => [...acc, ...index.fields.map(el => el.name)], [])
}

function transformArrayMergeCommands(arrayName, arrayElementFields, fieldName, changesForCommand) {
  Object.keys(arrayElementFields).forEach((key) => {
    changesForCommand[`${arrayName}.$.${key}`] = arrayElementFields[key]
  })
  delete changesForCommand[fieldName]
}

function transformReplaceCommands(arrayName, fieldName, changesForCommand) {
  changesForCommand[`${arrayName}.$`] = changesForCommand[fieldName]
  delete changesForCommand[fieldName]
}

function transformArrayCommands(arrayData, changesForCommand) {
  const { arrayName, arrayElementFields, fieldName, arrayOperation } = arrayData
  if (!arrayElementFields) {
    throw new Error('Invalid value for array operation')
  }
  const isAMerge = (arrayOperation === `.${ARRAY_MERGE_ELEMENT_OPERATOR}`)
  const isAReplace = (arrayOperation === `.${ARRAY_REPLACE_ELEMENT_OPERATOR}`)
  if (isAMerge) {
    transformArrayMergeCommands(arrayName, arrayElementFields, fieldName, changesForCommand)
  }
  if (isAReplace) {
    transformReplaceCommands(arrayName, fieldName, changesForCommand)
  }
}

// eslint-disable-next-line max-statements
function traverseCommands(
  fieldDefinition,
  nullableFields,
  rawObjectAccesses,
  commands,
  editableFields,
  pathsForRawSchema
) {
  for (const key of Object.keys(commands)) {
    if (key === '$unset' || key === '$currentDate') {
      continue
    }

    const changesForCommand = commands[key]
    const fieldKeys = Object.keys(changesForCommand)

    for (const fieldName of fieldKeys) {
      const splitFieldName = fieldName.split('.$')
      let isFieldAnArray = (fieldDefinition[splitFieldName[0]] === ARRAY)
      if (!isFieldAnArray) {
        const rawSchemaForField = getRawSchemaFieldPath(splitFieldName[0], pathsForRawSchema)
        isFieldAnArray = rawSchemaForField && rawSchemaForField.type === JSON_SCHEMA_ARRAY_TYPE
      }
      if (isFieldAnArray) {
        const arrayData = {
          arrayName: splitFieldName[0],
          arrayElementFields: commands[key][fieldName],
          fieldName,
          arrayOperation: splitFieldName[1],
        }
        transformArrayCommands(arrayData, changesForCommand)

        continue
      }

      if (Boolean(
        getRawSchemaFieldPath(fieldName, pathsForRawSchema))
        || rawObjectAccesses.some(objKey => objKey.test(fieldName))
      ) {
        // Allow anything
        continue
      }
      if (!fieldDefinition[fieldName]) {
        throw new Error('Unknown fields')
      }
      const type = fieldDefinition[fieldName]

      if (!editableFields.includes(fieldName)) {
        throw new Error(`You cannot edit "${fieldName}" field`)
      }

      const castValueFunction = castValueFunctions[type]
      if (!castValueFunction) {
        continue
      }
      const value = changesForCommand[fieldName]
      if (value === null && nullableFields[fieldName]) {
        continue
      }
      changesForCommand[fieldName] = castValueFunction(value)
    }
  }
}

function getRawSchemaFieldPath(fieldPath, rawSchemas = {}) {
  const { paths } = rawSchemas
  if (paths[fieldPath]) {
    return paths[fieldPath]
  }

  const patternProperties = Object.keys(rawSchemas.patternProperties || {})
  const fromPatternProperties = patternProperties.find(pattern => new RegExp(pattern).test(fieldPath))
  if (fromPatternProperties) {
    return rawSchemas.patternProperties[fromPatternProperties]
  }

  return null
}


// eslint-disable-next-line max-statements
function traverseTextSearchQuery(query, normalIndexes) {
  const keys = Object.keys(query)
  for (const key of keys) {
    if (key === '$text') {
      if (countTextOccurrences(query[key]) > 1) {
        throw new Error(`Query ${query} has more than one $text expression`)
      }

      const textQueryKeys = Object.keys(query[key])
      if (!textQueryKeys.includes('$search')) {
        throw new Error(`$text search query ${query[key]} must include $search field`)
      }

      for (const textOptionKey of textQueryKeys) {
        if (!['$search', '$language', '$caseSensitive', '$diacriticSensitive'].includes(textOptionKey)) {
          throw new Error(`Unknown option for $text search query: ${textOptionKey}`)
        }
      }

      continue
    }
    if (key === '$nor') {
      query.$nor.forEach(clause => {
        if (checkIfTextSearchQuery(clause)) {
          throw new Error('$text can not appear in a $nor expression')
        }
      })

      continue
    }
    if (key === '$elemMatch') {
      query.$elemMatch.split(',').forEach(clause => {
        if (checkIfTextSearchQuery(clause)) {
          throw new Error('$text query can not appear in a $elemMatch query expression')
        }
      })

      continue
    }
    if (key === '$or') {
      query[key].forEach(clause => {
        Object.keys(clause).forEach(orKey => {
          if (orKey[0] !== '$' && !normalIndexes.includes(orKey)) {
            throw new Error('To use a $text query in an $or expression, all clauses in the $or array must be indexed')
          }
          traverseTextSearchQuery(clause, normalIndexes)
        })
      })

      continue
    }
    if (key[0] === '$') {
      const clauses = query[key]
      if (Array.isArray(clauses)) {
        clauses.forEach(clause => traverseTextSearchQuery(clause, normalIndexes))
        continue
      }

      if ((typeof clauses) === 'object') {
        // eslint-disable-next-line id-length
        Object.keys(clauses).forEach(k => traverseTextSearchQuery(clauses[k], normalIndexes))
        continue
      }
    }
  }
}

function startTraverseTextSearchQuery(query, normalIndexes, fieldDefinition, traverseBinded) {
  // $text query should conform both to standard query rules and to $text query rules
  traverse(fieldDefinition, traverseBinded, query)
  traverseTextSearchQuery(query, normalIndexes)
}

const recursiveSearch = (query, searchKey, results = []) => {
  Object.keys(query).forEach(key => {
    const value = query[key]
    if (key === searchKey) {
      results.push(value)
    } else if (value && typeof value === 'object') {
      recursiveSearch(value, searchKey, results)
    }
  })
  return results
}

function checkIfTextSearchQuery(query) {
  const occurrences = recursiveSearch(query, '$text', [])
  return Array.isArray(occurrences) && occurrences.length > 0
}

function countTextOccurrences(query) {
  const occurrences = recursiveSearch(query, '$text', [])
  return occurrences.length
}

module.exports = QueryParser
