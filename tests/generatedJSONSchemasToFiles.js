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

/* eslint-disable global-require */
'use strict'

const logger = require('pino')({ level: 'silent' })

const { mockObjectId, mockUuidV4 } = require('./utils')

mockObjectId()
mockUuidV4()

const collectionDefinitions = {
  books: require('./collectionDefinitions/books'),
  cars: require('./collectionDefinitions/cars'),
  stations: require('./collectionDefinitions/stations'),
}

const expectedSchemaPath = './tests/expectedSchemas/'

const JSONSchemaGenerator = require('../lib/JSONSchemaGenerator')
const generatePathFieldsForRawSchema = require('../lib/generatePathFieldsForRawSchema')
const fs = require('fs')
const collections = Object.keys(collectionDefinitions)

const { JSONPath } = require('jsonpath-plus')
const lget = require('lodash.get')
const lset = require('lodash.set')
const validationOperations = ['GetList', 'GetItem', 'Delete', 'Count', 'Patch', 'PatchBulk',
  'ChangeState', 'ChangeStateMany', 'Export']
const serializationOperation = ['Post', 'Bulk', 'DeleteList', 'UpsertOne', 'PatchMany']
const operations = [...validationOperations, ...serializationOperation]

const operationToMethod = operations.reduce((opToMethod, op) => {
  opToMethod[op] = `generate${op}JSONSchema`
  return opToMethod
}, {})

const expectedSchemasNames = operations.reduce((acc, operation) => {
  return Object.assign(acc, {
    [operation]: {
      books: `${expectedSchemaPath}books${operation}Schema.js`,
      cars: `${expectedSchemaPath}cars${operation}Schema.js`,
      stations: `${expectedSchemaPath}stations${operation}Schema.js`,
    },
  })
}, {})

const expectedNewSchemasNames = operations.reduce((acc, operation) => {
  return Object.assign(acc, {
    [operation]: {
      books: `${expectedSchemaPath}booksNew${operation}Schema.js`,
      cars: `${expectedSchemaPath}carsNew${operation}Schema.js`,
      stations: `${expectedSchemaPath}stationsNew${operation}Schema.js`,
    },
  })
}, {})

collections.forEach(collection => {
  const collectionDefinition = collectionDefinitions[collection]
  const generator = new JSONSchemaGenerator(
    collectionDefinition,
    generatePathFieldsForRawSchema(logger, collectionDefinition),
    true
  )
  operations.forEach(operation => {
    const method = operationToMethod[operation]
    const schema = generator[method]()
    let newExpectedSchema = structuredClone(schema)
    const paths = JSONPath({
      path: '$..*[?(@.type=="string" && @.pattern)]',
      json: newExpectedSchema,
      resultType: 'pointer',
    })
      .map(path => path
        .split('/')
        .filter(str => str.length > 0)
        .join('.')
      )

    paths.forEach(key => {
      const property = lget(newExpectedSchema, key)
      if (property.pattern === '^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,3})?(Z|[+-]\\d{2}:\\d{2}))?$') {
        delete property.pattern
        property.format = 'date-time'
        newExpectedSchema = lset(
          newExpectedSchema,
          key,
          property
        )
      }
    })


    fs.writeFile(
      expectedSchemasNames[operation][collection],
      `/*
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
      
      module.exports = ${JSON.stringify(schema, null, 2)}
        `,
      // eslint-disable-next-line no-console
      error => (error ? console.log(error) : undefined)
    )
    fs.writeFile(
      expectedNewSchemasNames[operation][collection],
      `/*
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
      
      module.exports = ${JSON.stringify(newExpectedSchema, null, 2)}
        `,
      // eslint-disable-next-line no-console
      error => (error ? console.log(error) : undefined)
    )
  })
})
