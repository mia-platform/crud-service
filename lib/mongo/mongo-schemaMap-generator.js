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

const lodashGet = require('lodash.get')
const { JSONPath } = require('jsonpath-plus')

const { ARRAY, DATE, GEOPOINT, OBJECTID, RAWOBJECTTYPE } = require('../consts')

const PLAIN_OBJECT = 'object'

const bsonAdapterMap = {
  [OBJECTID]: 'objectId',
  [DATE]: 'date',
  [ARRAY]: 'array',
  [RAWOBJECTTYPE]: PLAIN_OBJECT,
  [GEOPOINT]: 'array',
  [PLAIN_OBJECT]: PLAIN_OBJECT,
  boolean: 'bool',
  string: 'string',
  number: 'number',
}

const unsearchableTypes = ['boolean', ARRAY, GEOPOINT, RAWOBJECTTYPE, PLAIN_OBJECT]

const searchableTypes = [OBJECTID, DATE, 'string', 'number']

const assertSearchableType = ({ encryption = { searchable: false }, type, __mia_configuration: miaConfiguration }) => {
  const isUnsearchableType = unsearchableTypes.includes(miaConfiguration?.type ?? type)
  if ((miaConfiguration?.encryption?.searchable || encryption.searchable) && isUnsearchableType) {
    throw new Error(`${type} is not searchable, only ${searchableTypes.join(', ')} can be searched.`)
  }
}

const retrieveBsonType = (field) => {
  assertSearchableType(field)
  return bsonAdapterMap[field.__mia_configuration?.type ?? field.type]
}

const algorithmPrefix = 'AEAD_AES_256_CBC_HMAC_SHA_512'

const retrieveAlgorithm = ({ encryption = { searchable: false } }) => {
  const algorithmSuffix = encryption.searchable ? 'Deterministic' : 'Random'
  return `${algorithmPrefix}-${algorithmSuffix}`
}

const EXCLUDE_MYSELF = 1
const TYPES_HAS_PROPERTIES = [PLAIN_OBJECT, RAWOBJECTTYPE]

const isEncryptionEnabled = ({ encryption }) => encryption && encryption.enabled

const canGenerateProperty = ({ type, encryption, __mia_configuration: miaConfiguration }) =>
  isEncryptionEnabled({ encryption: miaConfiguration?.encryption ?? encryption })
  || (TYPES_HAS_PROPERTIES.includes(type) && !miaConfiguration?.type)

const assertNotEncryptedProperties = (field) => {
  const arePropertiesEncrypted = JSONPath({ path: '$..encryption^', json: field })
    .slice(EXCLUDE_MYSELF)
    .find(isEncryptionEnabled) !== undefined
  if (arePropertiesEncrypted) {
    throw new Error('An object has been wrongly configured to have some encrypted properties')
  }
}

/*
 * Here is handled the recursion part of the algorithm.
 * If the bson type is an object (so, for us is a RawObject or an hand written object definition),
 * we try to search for its properties, recursively.
 * Otherwise (base case), if is not an object we treat it as a plain field, so we generate the encryption structure.
 */
const generateProperty = (field, dataKey) => {
  const bsonType = retrieveBsonType(field)
  const encryptionEnabled = isEncryptionEnabled(field)
  if (bsonType === PLAIN_OBJECT) {
    if (!encryptionEnabled) {
      return generateForDefinition(field, dataKey)
    }
    assertNotEncryptedProperties(field)
  }
  return {
    encrypt: {
      keyId: [dataKey],
      bsonType,
      algorithm: retrieveAlgorithm(field),
    },
  }
}

const generatePropertiesFromArray = (fields, dataKey) => {
  return fields
    .filter(canGenerateProperty)
    .reduce((accumulator, field) => {
      accumulator[field.name] = generateProperty(field, dataKey)
      return accumulator
    }, {})
}

const generatePropertiesFromObject = (properties = {}, dataKey) => {
  return Object
    .entries(properties)
    .filter(([, value]) => canGenerateProperty(value))
    .reduce((accumulator, [key, value]) => {
      accumulator[key] = generateProperty(value, dataKey)
      return accumulator
    }, {})
}

const propertiesLocationMapCompatibility = {
  [PLAIN_OBJECT]: 'properties',
  [RAWOBJECTTYPE]: 'schema.properties',
}

const retrievePropertiesCompatibility = (object) => {
  const propertyKey = propertiesLocationMapCompatibility[object.type]
  return lodashGet(object, propertyKey) || {}
}

const generateForDefinitionCompatibility = (definition, dataKey) => {
  const { fields } = definition
  const properties = retrievePropertiesCompatibility(definition)
  const generatedProperties = fields
    ? generatePropertiesFromArray(fields, dataKey)
    : generatePropertiesFromObject(properties, dataKey)

  return {
    bsonType: PLAIN_OBJECT,
    properties: generatedProperties,
  }
}

/*
 * The following function contains the recursive part of the schema generation.
 * It handles 3 basic cases:
 *   - `fields`: in this property are stored the array of fields configured by the user for its collection
 *   - `properties`: here are stored the properties hand written by the users in a RawObject
 *   - `schema.properties`: where is stored, inside the configuration, the root of a RawObject
 *
 * This function is recursively called in the `generateProperty` function.
 */
function generateForDefinition(definition, dataKey, firstLevel = false) {
  const { fields, schema, properties } = definition ?? {}
  if (fields && firstLevel) { return generateForDefinitionCompatibility(definition, dataKey) }
  const generatedProperties = generatePropertiesFromObject(schema?.properties ?? properties, dataKey)

  return {
    bsonType: PLAIN_OBJECT,
    properties: generatedProperties,
  }
}

function generateForDefinitions(databaseName, definitions, dataKeyMap) {
  return definitions.reduce(
    (accumulator, value) => {
      const collectionName = value.name
      const dataKey = dataKeyMap[collectionName]
      // the third parameter is set to true to allow
      // to start the recursion path in case the method on fields has to be called
      accumulator[`${databaseName}.${collectionName}`] = generateForDefinition(value, dataKey, true)
      return accumulator
    },
    {}
  )
}

module.exports = generateForDefinitions
