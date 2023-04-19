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

const tap = require('tap')
const logger = require('pino')({ level: 'silent' })
const { mockObjectId, mockUuidV4 } = require('./utils')

mockObjectId()
mockUuidV4()

const collectionDefinitions = {
  books: require('./collectionDefinitions/books'),
  booksNew: require('./newCollectionDefinitions/books'),
  cars: require('./collectionDefinitions/cars'),
  carsNew: require('./newCollectionDefinitions/cars'),
  stations: require('./collectionDefinitions/stations'),
  stationsNew: require('./newCollectionDefinitions/stations'),
}

const Ajv = require('ajv')
const ajvFormats = require('ajv-formats')

const JSONSchemaGenerator = require('../lib/JSONSchemaGenerator')
const generatePathFieldsForRawSchema = require('../lib/generatePathFieldsForRawSchema')
const { sortRegex } = require('../lib/JSONSchemaGenerator')
const { SCHEMA_CUSTOM_KEYWORDS } = require('../lib/consts')

const collections = Object.keys(collectionDefinitions)
const operations = ['GetList', 'GetItem', 'Post', 'Delete', 'Count', 'Bulk', 'Patch', 'PatchBulk', 'ChangeState', 'ChangeStateMany', 'Export']

const operationToMethod = operations.reduce((operationToMethod, op) => {
  operationToMethod[op] = `generate${op}JSONSchema`
  return operationToMethod
}, {})

const ajv = new Ajv({
  useDefaults: true,
  allowMatchingProperties: true,
})
ajvFormats(ajv)
ajv.addVocabulary(Object.values(SCHEMA_CUSTOM_KEYWORDS))

const expectedSchemas = operations.reduce((acc, operation) => {
  return Object.assign(acc, {
    [operation]: {
      books: require(`./expectedSchemas/books${operation}Schema`),
      booksNew: require(`./expectedSchemas/booksNew${operation}Schema`),
      cars: require(`./expectedSchemas/cars${operation}Schema`),
      carsNew: require(`./expectedSchemas/carsNew${operation}Schema`),
      stations: require(`./expectedSchemas/stations${operation}Schema`),
      stationsNew: require(`./expectedSchemas/stationsNew${operation}Schema`),
    },
  })
}, {})

tap.test('generate JSON Schemas', t => {
  t.plan(collections.length * operations.length)

  collections.forEach(collection => {
    const collectionDefinition = collectionDefinitions[collection]
    const generator = getJsonSchemaGenerator(collectionDefinition)
    operations.forEach(operation => {
      t.test(`${operation} - ${collection}`, t => {
        t.plan(2)
        const method = operationToMethod[operation]
        const schema = generator[method]()
        t.strictSame(schema, expectedSchemas[operation][collection])
        t.ok(ajv.validateSchema(schema))
      })
    })
  })
})

tap.test('check date-time format', t => {
  const generator = getJsonSchemaGenerator(collectionDefinitions.books)
  const schema = generator.generateCountJSONSchema()
  t.plan(7)
  const dateSchema = schema.querystring.properties.publishDate
  const validate = ajv.compile(dateSchema)
  t.ok(validate('2018-03-13T10:28:09.098Z'))
  t.ok(validate('2018-03-13T10:28:09.098+01:00'))
  t.ok(validate('2018-03-13T11:34:43+01:00'))
  t.ok(validate('2018-03-13'))
  t.notOk(validate('37849238748934'))
  t.notOk(validate('AAAAA2018-03-13'))
  t.notOk(validate('2018-03-13AAAAAA'))
})

tap.test('update bulk body validation - valid', t => {
  t.plan(1)

  const collection = 'books'
  const generator = getJsonSchemaGenerator(collectionDefinitions[collection])
  const validPayload = [
    {
      filter: {
        _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      },
      update: {
        $set: {
          name: 'newName',
        },
      },
    },
  ]
  const schema = generator.generatePatchBulkJSONSchema()
  const validate = ajv.compile(schema.body)
  t.ok(validate(validPayload))
})

tap.test('update bulk body validation - not valid - updates in filter', t => {
  t.plan(1)

  const collection = 'books'
  const generator = getJsonSchemaGenerator(collectionDefinitions[collection])
  const validPayload = [
    {
      filter: {
        _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        $set: { price: { $gt: 0.0 } },
      },
      update: {
        $set: {
          name: 'newName',
        },
      },
    },
  ]
  const schema = generator.generatePatchBulkJSONSchema()
  const validate = ajv.compile(schema.body)
  t.notOk(validate(validPayload))
})

tap.test('update bulk body validation - not valid', t => {
  t.plan(1)

  const collection = 'books'
  const generator = getJsonSchemaGenerator(collectionDefinitions[collection])
  const invalidPayload = [
    {
      filter: {
        _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      },
    },
  ]
  const schema = generator.generatePatchBulkJSONSchema()
  const validate = ajv.compile(schema.body)
  t.notOk(validate(invalidPayload))
})

tap.test('count querystring validaton - valid', t => {
  t.plan(1)

  const collection = 'books'
  const generator = getJsonSchemaGenerator(collectionDefinitions[collection])
  const validQuery = {
    name: 'Ulysses',
    publishDate: new Date().toISOString(),
  }
  const schema = generator.generateCountJSONSchema()
  const validate = ajv.compile(schema.querystring)
  t.ok(validate(validQuery))
})

tap.test('count querystring validaton - not valid', t => {
  t.plan(1)

  const collection = 'books'
  const generator = getJsonSchemaGenerator(collectionDefinitions[collection])
  const invalidQuery = {
    _id: 'fdjkl',
  }
  const schema = generator.generateCountJSONSchema()
  const validate = ajv.compile(schema.querystring)
  t.notOk(validate(invalidQuery))
})

tap.test('get item _id string - valid', t => {
  t.plan(1)

  const collection = 'stations'
  const generator = getJsonSchemaGenerator(collectionDefinitions[collection])
  const validQuery = {
    _id: '002415b0-8d6d-427c-b654-9857183e57a7',
  }
  const schema = generator.generateCountJSONSchema()
  const validate = ajv.compile(schema.querystring)
  t.ok(validate(validQuery))
})

tap.test('get item _id string - not valid', t => {
  t.plan(1)

  const collection = 'stations'
  const generator = getJsonSchemaGenerator(collectionDefinitions[collection])
  const invalidQuery = {
    _id: '',
  }
  const schema = generator.generateCountJSONSchema()
  const validate = ajv.compile(schema.querystring)
  t.notOk(validate(invalidQuery))
})

tap.test('getlist response validation - valid', t => {
  t.plan(1)

  const collection = 'books'
  const generator = getJsonSchemaGenerator(collectionDefinitions[collection])
  const validResponse = [{
    name: 'Ulysses',
    publishDate: '2018-02-06T00:00:00.000Z',
  }]
  const schema = generator.generateGetListJSONSchema()
  const validate = ajv.compile(schema.response['200'])
  t.ok(validate(validResponse))
})

tap.test('getlist response validation - not valid', t => {
  t.plan(1)

  const collection = 'books'
  const generator = getJsonSchemaGenerator(collectionDefinitions[collection])
  const invalidResponse = {
    name: 'Ulysses',
    publishDate: '2018-02-06T00:00:00.000Z',
  }
  const schema = generator.generateGetListJSONSchema()
  const validate = ajv.compile(schema.response['200'])
  t.notOk(validate(invalidResponse))
})

tap.test('RawObject - valid', t => {
  t.plan(1)

  const collection = 'cars'
  const generator = getJsonSchemaGenerator(collectionDefinitions[collection])
  const validBody = {
    name: 'car1',
    additionalInfo: {
      info: {
        hei: 'uau',
      },
      moreinfo: ['ah', 3],
    },
  }
  const schema = generator.generatePostJSONSchema()
  const validate = ajv.compile(schema.body)
  t.ok(validate(validBody))
})

tap.test('RawObjectArray - valid', t => {
  t.plan(1)

  const collection = 'books'
  const generator = getJsonSchemaGenerator(collectionDefinitions[collection])
  const validBody = {
    name: 'name',
    isbn: 'isbn1',
    attachments: [
      {
        name: 'the-name',
        additionalInfo: {
          info: {
            hei: 'uau',
          },
          moreinfo: ['ah', 3],
        },
      },
    ],
  }
  const schema = generator.generatePostJSONSchema()
  const validate = ajv.compile(schema.body)
  t.ok(validate(validBody))
})

tap.test('RawObjectArray - invalid', t => {
  t.plan(1)

  const collection = 'books'
  const generator = getJsonSchemaGenerator(collectionDefinitions[collection])
  const invalidBody = {
    name: 'name',
    isbn: 'isbn1',
    attachments: [
      {
        additionalInfo: {
          info: {
            hei: 'uau',
          },
          moreinfo: ['ah', 3],
        },
      },
      'not an object',
    ],
  }
  const schema = generator.generatePostJSONSchema()
  const validate = ajv.compile(schema.body)
  t.notOk(validate(invalidBody))
})

tap.test('required fields - invalid', t => {
  t.plan(1)

  const collection = 'books'
  const generator = getJsonSchemaGenerator(collectionDefinitions[collection])
  const invalidBody = {
    name: 'name',
    attachments: [
      {
        additionalInfo: {
          info: {
            hei: 'uau',
          },
          moreinfo: ['ah', 3],
        },
      },
      'not an object',
    ],
  }
  const schema = generator.generatePostJSONSchema()
  const validate = ajv.compile(schema.body)
  t.notOk(validate(invalidBody))
})

tap.test('GeoPoint validation', t => {
  const tests = [
    {
      name: '0 coordinates',
      position: [],
      valid: false,
    },
    {
      name: '1 coordinates',
      position: [3.4],
      valid: false,
    },
    {
      name: '2 coordinates',
      position: [2, 3.4],
      valid: true,
    },
    {
      name: '3 coordinates',
      position: [4.3, 2.1, 59],
      valid: true,
    },
    {
      name: '4 coordinates',
      position: [3.1, 4.3, 8.1, 56.4],
      valid: false,
    },
    {
      name: '2 coordinates, string',
      position: [2.1, '4.2'],
      valid: false,
    },
    {
      name: 'object',
      position: { lon: 3, lat: 5 },
      valid: false,
    },
    {
      name: 'point object',
      position: {
        type: 'Point',
        coordinates: [4, 2],
      },
      valid: false,
    },
    {
      name: 'array with null',
      position: [null],
      valid: false,
    },
    {
      name: 'array with null 2',
      position: [0, null],
      valid: false,
    },
    {
      name: 'two falsey coordinates',
      position: [0, 0],
      valid: true,
    },
    {
      name: 'falsey string',
      position: [0.5, ''],
      valid: false,
    },
    {
      name: 'negative coordinates',
      position: [-1, -3, -5],
      valid: true,
    },
  ]

  const collection = 'books'
  const generator = getJsonSchemaGenerator(collectionDefinitions[collection])
  const schema = generator.generatePostJSONSchema()
  const validate = ajv.compile(schema.body.properties.position)
  t.plan(tests.length)
  for (const test of tests) {
    const { position, valid } = test
    t.test(test.name, t => {
      t.plan(1)
      const foundValid = validate(position)
      if (valid) {
        t.ok(foundValid)
      } else {
        t.notOk(foundValid)
      }
    })
  }
})

tap.test('sortRegex must match the right expression', t => {
  const collection = 'books'
  const regex = new RegExp(sortRegex(collectionDefinitions[collection]))

  const matchExp = [
    'attachments',
    'attachments,price',
    '-attachments',
    '-price',
    'attachments,-price',
    '-attachments,price',
    'attachments.nested,price',
    '-attachments.nested.subnested,price',
    'attachments.nested.subnested,price.nested.subnested',
  ]

  const notMatchExp = [
    'inexistent',
    '-attachments..nested,price',
    'attachments.,price',
    'price,inexistent',
    '',
  ]

  t.plan(matchExp.length + notMatchExp.length)

  matchExp.forEach(expr => t.strictSame(regex.test(expr), true))
  notMatchExp.forEach(expr => t.strictSame(regex.test(expr), false))
})

function getJsonSchemaGenerator(collection) {
  return new JSONSchemaGenerator(collection, generatePathFieldsForRawSchema(logger, collection))
}
