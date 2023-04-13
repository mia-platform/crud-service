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

const tap = require('tap')
const pino = require('pino')
const R = require('ramda')

const generatePathFieldsForRawSchema = require('../lib/generatePathFieldsForRawSchema')

tap.test('generatePathFieldsForRawSchema', t => {
  t.test('ok', t => {
    const logger = pino({ level: 'silent' })
    const collectionDefinition = {
      name: 'foo',
      fields: [{
        name: 'field1',
        type: 'RawObject',
        schema: {
          properties: {
            itemArray: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  leafString: { type: 'string' },
                },
              },
            },
            itemArrayOfNumbers: {
              type: 'array',
              items: { type: 'number' },
            },
          },
        },
      }],
    }

    t.strictSame(generatePathFieldsForRawSchema(logger, collectionDefinition), {
      paths: {
        'field1.itemArray': {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              leafString: { type: 'string' },
            },
          },
        },
        'field1.itemArrayOfNumbers': {
          type: 'array',
          items: { type: 'number' },
        },
      },
      patternProperties: {
        'field1\\.itemArray\\.\\d+$': {
          type: 'object',
          properties: {
            leafString: { type: 'string' },
          },
        },
        'field1\\.itemArray\\.\\d+\\.leafString$': { type: 'string' },
        'field1\\.itemArrayOfNumbers\\.\\d+$': { type: 'number' },
      },
      pathsOperators: {
        'field1.itemArray.$.replace': {
          type: 'object',
          properties: {
            leafString: {
              type: 'string',
            },
          },
        },
        'field1.itemArray.$.merge': {
          type: 'object',
          properties: {
            leafString: {
              type: 'string',
            },
          },
        },
        'field1.itemArrayOfNumbers.$.replace': {
          type: 'number',
        },
      },
      patternPropertiesOperators: {},
    })

    t.end()
  })

  t.test('throws error if some schemas contains invalid operator and log infos', t => {
    const loggerOutput = []
    const logger = pino({
      level: 'trace',
    }, {
      write: (data) => loggerOutput.push(JSON.parse(data)),
    })

    const collectionDefinition = {
      name: 'collection-name',
      fields: [
        {
          name: 'the-invalid-field',
          type: 'RawObject',
          schema: {
            properties: {
              invalidProp: {
                type: 'object',
                oneOf: [{
                  properties: {},
                }],
              },
            },
          },
        },
      ],
    }

    const errorMsg = 'Unsupported operation in jsonSchema: oneOf'
    t.throws(() => generatePathFieldsForRawSchema(logger, collectionDefinition), errorMsg)

    const errorLogs = loggerOutput.filter(log => log.level === 50)
    t.equal(errorLogs.length, 1)

    const EXPECTED_LOG = {
      collectionName: 'collection-name',
      field: 'the-invalid-field',
      msg: errorMsg,
    }
    t.strictSame(R.pick(['collectionName', 'field', 'msg'], errorLogs[0]), EXPECTED_LOG)

    t.end()
  })

  t.test('ok new', t => {
    const logger = pino({ level: 'silent' })
    const collectionDefinition = {
      name: 'foo',
      schema: {
        type: 'object',
        properties: {
          field1: {
            type: 'object',
            properties: {
              itemArray: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    leafString: { type: 'string' },
                  },
                },
              },
              itemArrayOfNumbers: {
                type: 'array',
                items: { type: 'number' },
              },
            },
          },
        },
      },
    }


    t.strictSame(generatePathFieldsForRawSchema(logger, collectionDefinition), {
      paths: {
        'field1.itemArray': {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              leafString: { type: 'string' },
            },
          },
        },
        'field1.itemArrayOfNumbers': {
          type: 'array',
          items: { type: 'number' },
        },
      },
      patternProperties: {
        'field1\\.itemArray\\.\\d+$': {
          type: 'object',
          properties: {
            leafString: { type: 'string' },
          },
        },
        'field1\\.itemArray\\.\\d+\\.leafString$': { type: 'string' },
        'field1\\.itemArrayOfNumbers\\.\\d+$': { type: 'number' },
      },
      pathsOperators: {
        'field1.itemArray.$.replace': {
          type: 'object',
          properties: {
            leafString: {
              type: 'string',
            },
          },
        },
        'field1.itemArray.$.merge': {
          type: 'object',
          properties: {
            leafString: {
              type: 'string',
            },
          },
        },
        'field1.itemArrayOfNumbers.$.replace': {
          type: 'number',
        },
      },
      patternPropertiesOperators: {},
    })

    t.end()
  })

  t.end()
})
