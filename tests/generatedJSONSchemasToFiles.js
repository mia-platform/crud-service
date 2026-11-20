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

const fs = require('fs')
const logger = require('pino')({ level: 'silent' })

const JSONSchemaGenerator = require('../lib/JSONSchemaGenerator')
const generatePathFieldsForRawSchema = require('../lib/generatePathFieldsForRawSchema')

const { mockObjectId } = require('./utils')

mockObjectId()

const collectionDefinitions = {
  books: require('./collectionDefinitions/books'),
  cars: require('./collectionDefinitions/cars'),
  stations: require('./collectionDefinitions/stations'),
  booksNew: require('./newCollectionDefinitions/books'),
  carsNew: require('./newCollectionDefinitions/cars'),
  stationsNew: require('./newCollectionDefinitions/stations'),
}
const expectedSchemaPath = './tests/expectedSchemas/'

function main() {
  const validationOperations = [
    'GetList',
    'GetItem',
    'Delete',
    'Count',
    'Patch',
    'PatchBulk',
    'ChangeState',
    'ChangeStateMany',
    'Export',
  ]
  const serializationOperation = [
    'Post',
    'Bulk',
    'DeleteList',
    'UpsertOne',
    'PatchMany',
    'GetListLookup',
  ]
  const operations = [
    ...validationOperations,
    ...serializationOperation,
  ]

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
        booksNew: `${expectedSchemaPath}booksNew${operation}Schema.js`,
        carsNew: `${expectedSchemaPath}carsNew${operation}Schema.js`,
        stationsNew: `${expectedSchemaPath}stationsNew${operation}Schema.js`,
      },
    })
  }, {})

  createExpectedSchemas({ collectionDefinitions, operations, operationToMethod, namesMapping: expectedSchemasNames })
}

function createExpectedSchemas({ collectionDefinitions, operations, operationToMethod, namesMapping }) {
  Object.entries(collectionDefinitions).forEach(([collection, collectionDefinition]) => {
    const generator = new JSONSchemaGenerator(
      collectionDefinition,
      generatePathFieldsForRawSchema(logger, collectionDefinition),
      true
    )
    operations.forEach(operation => {
      const method = operationToMethod[operation]
      const schema = generator[method]()

      fs.writeFile(
        namesMapping[operation][collection],
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
    })
  })
}

main()
