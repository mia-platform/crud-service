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

const { omit } = require('ramda')

const {
  JSON_SCHEMA_OBJECT_TYPE,
  JSON_SCHEMA_ARRAY_TYPE,
  ARRAY_MERGE_ELEMENT_OPERATOR,
  ARRAY_REPLACE_ELEMENT_OPERATOR,
} = require('./consts')

const MERGE_FIELDS_TO_OMIT = ['required']
const UNSUPPORTED_JSONSCHEMA_OPERATIONS = ['oneOf', 'allOf', 'anyOf', 'if']

const ARRAY_INDEX_REGEX = '\\d+'

function joinWithDot({ escapeDotChar } = {}, ...paths) {
  return paths.filter(Boolean).join(escapeDotChar ? '\\.' : '.')
}

function joinPathWithBasePath({ escapeDotChar }, pathsObject, ...prefixes) {
  return Object.keys(pathsObject).reduce((acc, path) => {
    return {
      ...acc,
      [joinWithDot({ escapeDotChar }, ...prefixes, path)]: pathsObject[path],
    }
  }, {})
}

function typeIsLeaf(type) {
  switch (type) {
  case JSON_SCHEMA_OBJECT_TYPE:
  case JSON_SCHEMA_ARRAY_TYPE: {
    return false
  }
  default: {
    return true
  }
  }
}

function generatePathsForArrayField(arrayJsonSchema, { addRawSchemaForNested, fieldName, useRegex, basePath }) {
  const itemsPaths = generate(arrayJsonSchema.items, {
    useRegex: true,
    addRawSchemaForNested: true,
  })
  let paths = {}
  if (addRawSchemaForNested && !useRegex) {
    paths = {
      [joinWithDot({ escapeDotChar: false }, basePath, fieldName)]: arrayJsonSchema,
    }
  }
  let patternProperties = {}
  if (addRawSchemaForNested && useRegex) {
    patternProperties = {
      [joinWithDot({ escapeDotChar: true }, basePath, fieldName)]: arrayJsonSchema,
    }
  }
  return {
    paths,
    patternProperties: {
      ...patternProperties,
      [joinWithDot({ escapeDotChar: true }, basePath, fieldName, ARRAY_INDEX_REGEX)]: arrayJsonSchema.items,
      ...joinPathWithBasePath(
        { escapeDotChar: true },
        itemsPaths.paths,
        basePath,
        fieldName,
        ARRAY_INDEX_REGEX
      ),
      ...joinPathWithBasePath(
        { escapeDotChar: true },
        itemsPaths.patternProperties,
        basePath,
        fieldName,
        ARRAY_INDEX_REGEX
      ),
    },
  }
}

function getJoinedPathsByType(type, { useRegex, paths, patternProperties, basePath, fieldName }) {
  if (type !== JSON_SCHEMA_OBJECT_TYPE) {
    return { paths, patternProperties }
  }

  let generatedPaths = {}
  if (!useRegex) {
    generatedPaths = joinPathWithBasePath({ escapeDotChar: false }, paths, basePath, fieldName)
  }
  let generatedPatternProperties = {
    ...joinPathWithBasePath({ escapeDotChar: true }, patternProperties, basePath, fieldName),
  }
  if (useRegex) {
    generatedPatternProperties = {
      ...generatedPatternProperties,
      ...joinPathWithBasePath({ escapeDotChar: true }, paths, basePath, fieldName),
    }
  }
  return {
    paths: generatedPaths,
    patternProperties: generatedPatternProperties,
  }
}

function assertIfJsonSchemaIsUnsupported(jsonSchema) {
  for (const operation of UNSUPPORTED_JSONSCHEMA_OPERATIONS) {
    if (jsonSchema[operation]) {
      throw new Error(`Unsupported operation in jsonSchema: ${operation}`)
    }
  }
}

// eslint-disable-next-line max-statements
function generate(jsonSchema, { useRegex, basePath, addRawSchemaForNested }) {
  assertIfJsonSchemaIsUnsupported(jsonSchema)

  const { type } = jsonSchema
  if (typeIsLeaf(type)) {
    if (!useRegex) {
      return {
        patternProperties: {},
        paths: {
          // The path of a schema (e.g. path of {type: 'string'}) is defined from parent. So return empty string
          '': { type },
        },
      }
    }
    return {
      paths: {},
      patternProperties: {
        // The path will be defined by parent
        '': { type },
      },
    }
  }

  if (type === JSON_SCHEMA_ARRAY_TYPE) {
    return generatePathsForArrayField(jsonSchema, {
      useRegex,
      addRawSchemaForNested,
      basePath,
    })
  }

  // type is object
  const fields = jsonSchema.properties
  let generatedPaths = {}
  let generatedPatternProperties = {}

  if (jsonSchema.additionalProperties) {
    generatedPatternProperties = {
      [joinWithDot({ escapeDotChar: true }, basePath, '.+')]: true,
    }
  }

  // do not generate paths when a raw object does not have properties in the schema
  if (!fields) {
    return {
      paths: generatedPaths,
      patternProperties: generatedPatternProperties,
    }
  }

  for (const [fieldName, fieldValue] of Object.entries(fields)) {
    assertIfJsonSchemaIsUnsupported(fields[fieldName])

    const fieldType = fieldValue.type
    if (fieldType !== JSON_SCHEMA_ARRAY_TYPE && fieldType !== JSON_SCHEMA_OBJECT_TYPE) {
      if (useRegex) {
        generatedPatternProperties[joinWithDot({ escapeDotChar: true }, basePath, fieldName)] = fieldValue
      } else {
        generatedPaths[joinWithDot({ escapeDotChar: false }, basePath, fieldName)] = fieldValue
      }
      continue
    }

    let generationOptions = {
      addRawSchemaForNested: true,
    }
    if (fieldType === JSON_SCHEMA_ARRAY_TYPE) {
      generationOptions = {
        useRegex,
        basePath: joinWithDot({ escapeDotChar: true }, basePath, fieldName),
        addRawSchemaForNested,
      }
    }
    const generatedFieldsPaths = generate(fieldValue, generationOptions)

    if (addRawSchemaForNested && !useRegex) {
      generatedPaths = {
        ...generatedPaths,
        [joinWithDot({ escapeDotChar: false }, basePath, fieldName)]: fieldValue,
      }
    }
    if (addRawSchemaForNested && useRegex) {
      generatedPatternProperties = {
        ...generatedPatternProperties,
        [joinWithDot({ escapeDotChar: true }, basePath, fieldName)]: fieldValue,
      }
    }

    const currentPaths = getJoinedPathsByType(fieldType, {
      useRegex,
      paths: generatedFieldsPaths.paths,
      patternProperties: generatedFieldsPaths.patternProperties,
      fieldName,
      basePath,
    })
    generatedPaths = {
      ...generatedPaths,
      ...currentPaths.paths,
    }
    generatedPatternProperties = {
      ...generatedPatternProperties,
      ...currentPaths.patternProperties,
    }
  }

  return {
    paths: generatedPaths,
    patternProperties: generatedPatternProperties,
  }
}

function generateOperators(paths, { escapeDotChar } = {}) {
  return Object.keys(paths).reduce((acc, path) => {
    if (paths[path].type !== JSON_SCHEMA_ARRAY_TYPE) {
      return acc
    }
    const DOLLAR = escapeDotChar ? '\\$' : '$'
    const END_PATTERN = escapeDotChar ? '$' : ''
    const newPaths = {
      [joinWithDot({ escapeDotChar }, path, DOLLAR, ARRAY_REPLACE_ELEMENT_OPERATOR) + END_PATTERN]: paths[path].items,
    }
    if (paths[path].items.type === JSON_SCHEMA_OBJECT_TYPE) {
      const mergePath = joinWithDot({ escapeDotChar }, path, DOLLAR, ARRAY_MERGE_ELEMENT_OPERATOR)
      newPaths[mergePath + END_PATTERN] = omit(MERGE_FIELDS_TO_OMIT, paths[path].items)
    }
    // TODO: call generate function in order to support dot notation in $.replace and $.merge
    // e.g.  foo.bar.$.replace: {'lorem.ipsum': 2}
    return {
      ...acc,
      ...newPaths,
    }
  }, {})
}

module.exports = function generatePathFromJsonSchema(
  jsonSchema,
  {
    useRegex,
    basePath,
    addRawSchemaForNested = false,
  } = {}
) {
  const {
    paths,
    patternProperties,
  } = generate(jsonSchema, { useRegex, basePath, addRawSchemaForNested })

  const patternPropertiesWithEndRegex = Object.keys(patternProperties)
    .reduce((acc, pathRegex) => {
      return {
        ...acc,
        [`${pathRegex}$`]: patternProperties[pathRegex],
      }
    }, {})

  const pathsOperators = generateOperators(paths, { escapeDotChar: false })
  const patternPropertiesOperators = generateOperators(patternProperties, { escapeDotChar: true })

  return {
    paths,
    patternProperties: patternPropertiesWithEndRegex,
    pathsOperators,
    patternPropertiesOperators,
  }
}
