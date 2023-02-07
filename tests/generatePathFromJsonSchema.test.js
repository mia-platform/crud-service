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

const generatePathFromJsonSchema = require('../lib/generatePathFromJsonSchema')

tap.test('generatePathFromJsonSchema', t => {
  t.test('paths and patternProperties', t => {
    const tests = [
      {
        name: 'basic string',
        input: {
          type: 'object',
          properties: {
            foo: { type: 'string' },
            bar: { type: 'number' },
          },
          additionalProperties: true,
        },
        expected: {
          paths: {
            foo: { type: 'string' },
            bar: { type: 'number' },
          },
          patternProperties: {
            '.+$': true,
          },
        },
      }, {
        name: 'nested object',
        input: {
          type: 'object',
          properties: {
            nestedObject: {
              type: 'object',
              properties: {
                leaf: { type: 'number' },
              },
              additionalProperties: true,
            },
            rootString: { type: 'string' },
          },
        },
        expected: {
          paths: {
            'nestedObject.leaf': { type: 'number' },
            rootString: { type: 'string' },
          },
          patternProperties: {
            'nestedObject\\..+$': true,
          },
        },
      }, {
        name: 'object in object',
        input: {
          type: 'object',
          properties: {
            noRaw: {
              type: 'object',
              properties: {
                fieldObjRaw: {
                  type: 'object',
                  properties: {
                    theString: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        expected: {
          paths: {
            'noRaw.fieldObjRaw': {
              type: 'object',
              properties: {
                theString: { type: 'string' },
              },
            },
            'noRaw.fieldObjRaw.theString': { type: 'string' },
          },
          patternProperties: {},
        },
      }, {
        name: 'array generate patternProperties with raw schema for all nested fields',
        input: {
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
        addRawSchemaForNested: true,
        expected: {
          paths: {
            // raw schema
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
          patternProperties: {
            'itemArray\\.\\d+$': {
              type: 'object',
              properties: {
                leafString: { type: 'string' },
              },
            },
            'itemArray\\.\\d+\\.leafString$': { type: 'string' },
            'itemArrayOfNumbers\\.\\d+$': { type: 'number' },
          },
        },
      }, {
        name: 'array and object mixed with raw schema for nested array',
        input: {
          type: 'object',
          properties: {
            itemArray: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  childObject: {
                    type: 'object',
                    properties: {
                      leafString: { type: 'string' },
                    },
                  },
                },
              },
            },
            itemObject: {
              type: 'object',
              properties: {
                // nested array -> generate raw schema
                childArray: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      leafItemString: { type: 'string' },
                    },
                  },
                },
                childObject: {
                  type: 'object',
                  properties: {
                    leafPropertyString: { type: 'string' },
                    childObjectArray: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          leafObjectArrayString: { type: 'string' },
                        },
                      },
                    },
                  },
                },
                itemObjectLeafString: { type: 'string' },
              },
            },
            itemString: { type: 'string' },
          },
        },
        expected: {
          paths: {
            itemString: { type: 'string' },
            'itemObject.childObject': {
              type: 'object',
              properties: {
                leafPropertyString: { type: 'string' },
                childObjectArray: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      leafObjectArrayString: { type: 'string' },
                    },
                  },
                },
              },
            },
            'itemObject.childObject.leafPropertyString': { type: 'string' },
            'itemObject.itemObjectLeafString': { type: 'string' },
            'itemObject.childArray': {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  leafItemString: { type: 'string' },
                },
              },
            },
            'itemObject.childObject.childObjectArray': {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  leafObjectArrayString: { type: 'string' },
                },
              },
            },
          },
          patternProperties: {
            'itemArray\\.\\d+$': {
              type: 'object',
              properties: {
                childObject: {
                  type: 'object',
                  properties: {
                    leafString: { type: 'string' },
                  },
                },
              },
            },
            'itemArray\\.\\d+\\.childObject$': {
              type: 'object',
              properties: {
                leafString: { type: 'string' },
              },
            },
            'itemArray\\.\\d+\\.childObject\\.leafString$': { type: 'string' },
            'itemObject\\.childArray\\.\\d+$': {
              type: 'object',
              properties: {
                leafItemString: { type: 'string' },
              },
            },
            'itemObject\\.childArray\\.\\d+\\.leafItemString$': { type: 'string' },
            'itemObject\\.childObject\\.childObjectArray\\.\\d+$': {
              type: 'object',
              properties: {
                leafObjectArrayString: { type: 'string' },
              },
            },
            'itemObject\\.childObject\\.childObjectArray\\.\\d+\\.leafObjectArrayString$': { type: 'string' },
          },
        },
      }, {
        name: 'with basePath',
        input: {
          type: 'object',
          properties: {
            itemString: { type: 'string' },
            itemObject: {
              type: 'object',
              properties: {
                itemObjectLeafString: { type: 'string' },
              },
            },
            itemArray: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  itemArrayLeafString: { type: 'string' },
                },
              },
            },
          },
          additionalProperties: true,
        },
        basePath: 'the-base-path',
        expected: {
          paths: {
            'the-base-path.itemString': { type: 'string' },
            'the-base-path.itemObject.itemObjectLeafString': { type: 'string' },
          },
          patternProperties: {
            'the-base-path\\..+$': true,
            'the-base-path\\.itemArray\\.\\d+$': {
              type: 'object',
              properties: {
                itemArrayLeafString: { type: 'string' },
              },
            },
            'the-base-path\\.itemArray\\.\\d+\\.itemArrayLeafString$': { type: 'string' },
          },
        },
      }, {
        name: 'basic string - with basePath and force regex',
        input: {
          type: 'object',
          properties: {
            foo: { type: 'string' },
            bar: { type: 'number' },
          },
        },
        basePath: 'the-base-path',
        useRegex: true,
        expected: {
          paths: {
          },
          patternProperties: {
            'the-base-path\\.foo$': { type: 'string' },
            'the-base-path\\.bar$': { type: 'number' },
          },
        },
      }, {
        name: 'books example',
        input: {
          type: 'object',
          properties: {
            metadata: {
              type: 'object',
              properties: {
                somethingString: { type: 'string' },
                somethingNumber: { type: 'number' },
                somethingArrayObject: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      arrayItemObjectChildNumber: { type: 'number' },
                    },
                  },
                },
                somethingObject: {
                  type: 'object',
                  properties: {
                    childNumber: { type: 'number' },
                  },
                },
                somethingArrayOfNumbers: {
                  type: 'array',
                  items: { type: 'number' },
                },
              },
            },
          },
        },
        expected: {
          paths: {
            'metadata.somethingString': { type: 'string' },
            'metadata.somethingNumber': { type: 'number' },
            'metadata.somethingObject': {
              type: 'object',
              properties: {
                childNumber: { type: 'number' },
              },
            },
            'metadata.somethingObject.childNumber': { type: 'number' },
            'metadata.somethingArrayObject': {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  arrayItemObjectChildNumber: { type: 'number' },
                },
              },
            },
            'metadata.somethingArrayOfNumbers': {
              type: 'array',
              items: { type: 'number' },
            },
          },
          patternProperties: {
            'metadata\\.somethingArrayObject\\.\\d+$': {
              type: 'object',
              properties: {
                arrayItemObjectChildNumber: { type: 'number' },
              },
            },
            'metadata\\.somethingArrayObject\\.\\d+\\.arrayItemObjectChildNumber$': { type: 'number' },
            'metadata\\.somethingArrayOfNumbers\\.\\d+$': { type: 'number' },
          },
        },
      }, {
        name: 'array of array',
        input: {
          type: 'object',
          properties: {
            firstArray: {
              type: 'array',
              items: { type: 'number' },
            },
            secondArray: {
              type: 'array',
              items: {
                type: 'array',
                items: { type: 'number' },
              },
            },
          },
        },
        expected: {
          paths: {},
          patternProperties: {
            'firstArray\\.\\d+$': { type: 'number' },
            'secondArray\\.\\d+$': {
              type: 'array',
              items: { type: 'number' },
            },
            'secondArray\\.\\d+\\.\\d+$': { type: 'number' },
          },
        },
      }, {
        name: 'nested array',
        input: {
          type: 'object',
          properties: {
            rootArray: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  arrayInObject: {
                    type: 'array',
                    items: {
                      type: 'array',
                      items: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
        expected: {
          paths: {},
          patternProperties: {
            'rootArray\\.\\d+$': {
              type: 'object',
              properties: {
                arrayInObject: {
                  type: 'array',
                  items: {
                    type: 'array',
                    items: { type: 'number' },
                  },
                },
              },
            },
            'rootArray\\.\\d+\\.arrayInObject$': {
              type: 'array',
              items: {
                type: 'array',
                items: { type: 'number' },
              },
            },
            'rootArray\\.\\d+\\.arrayInObject\\.\\d+$': {
              type: 'array',
              items: { type: 'number' },
            },
            'rootArray\\.\\d+\\.arrayInObject\\.\\d+\\.\\d+$': { type: 'number' },
          },
        },
      },
    ]

    for (const test of tests) {
      t.test(test.name, t => {
        t.plan(1)
        const jsonSchema = test.input
        const { paths, patternProperties } = generatePathFromJsonSchema(jsonSchema, {
          basePath: test.basePath,
          useRegex: test.useRegex,
          addRawSchemaForNested: test.addRawSchemaForNested,
        })
        t.strictSame({ paths, patternProperties }, test.expected)
      })
    }

    t.end()
  })

  t.test('throws if contains unsupported json schema operator', t => {
    const tests = [
      {
        name: 'oneOf',
        operationThrow: 'oneOf',
        jsonSchema: {
          oneOf: [
            { type: 'string' },
            { type: 'number' },
          ],
        },
      },
      {
        name: 'oneOf inside object',
        operationThrow: 'oneOf',
        jsonSchema: {
          type: 'object',
          properties: {
            foo: {
              oneOf: [
                { type: 'string' },
                { type: 'number' },
              ],
            },
          },
        },
      },
      {
        name: 'oneOf of array items',
        operationThrow: 'oneOf',
        jsonSchema: {
          type: 'array',
          items: {
            oneOf: [
              { type: 'object', properties: { foo: { type: 'string' } } },
              { type: 'string' },
            ],
          },
        },
      },
      {
        name: 'allOf',
        operationThrow: 'allOf',
        jsonSchema: {
          type: 'array',
          items: { type: 'object', properties: {}, additionalProperties: true },
          allOf: [
            {
              contains: {
                type: 'object',
                properties: {
                  name: {
                    enum: ['foo1'],
                  },
                },
              },
            },
          ],
        },
      },
      {
        name: 'anyOf',
        operationThrow: 'anyOf',
        jsonSchema: {
          anyOf: [{
            type: 'null',
          }, {
            type: 'string',
          }],
        },
      },
      {
        name: 'if',
        operationThrow: 'if',
        jsonSchema: {
          type: 'object',
          properties: {
            street_address: {
              type: 'string',
            },
          },
          if: {
            properties: { country: { const: 'United States of America' } },
          },
          then: {
            properties: { postal_code: { pattern: '[0-9]{5}(-[0-9]{4})?' } },
          },
          else: {
            properties: { postal_code: { pattern: '[A-Z][0-9][A-Z] [0-9][A-Z][0-9]' } },
          },
        },
      },
    ]

    for (const testCase of tests) {
      t.test(testCase.name, t => {
        t.throws(
          () => generatePathFromJsonSchema(testCase.jsonSchema),
          new Error(`Unsupported operation in jsonSchema: ${testCase.operationThrow}`)
        )
        t.end()
      })
    }

    t.end()
  })

  t.test('operators', t => {
    const tests = [
      {
        name: 'no arrays',
        input: {
          type: 'object',
          properties: {
            foo: { type: 'string' },
            bar: { type: 'object', properties: { baz: { type: 'string' } } },
          },
        },
        expected: {
          pathsOperators: {},
          patternPropertiesOperators: {},
        },
      },
      {
        name: 'with array only root',
        input: {
          type: 'object',
          properties: {
            arrayRoot: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        expected: {
          pathsOperators: {},
          patternPropertiesOperators: {},
        },
      },
      {
        name: 'with nested array',
        input: {
          type: 'object',
          properties: {
            rootObject: {
              type: 'object',
              properties: {
                arrayChild: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
        },
        expected: {
          pathsOperators: {
            'rootObject.arrayChild.$.replace': { type: 'string' },
          },
          patternPropertiesOperators: {},
        },
      },
      {
        name: 'array in array',
        input: {
          type: 'object',
          properties: {
            rootArray: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  arrayChild: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        expected: {
          pathsOperators: {},
          patternPropertiesOperators: {
            'rootArray\\.\\d+\\.arrayChild\\.\\$\\.replace$': { type: 'string' },
          },
        },
      },
      {
        name: 'with array of object',
        input: {
          type: 'object',
          properties: {
            rootObject: {
              type: 'object',
              properties: {
                arrayChild: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      childObjectItem: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        expected: {
          pathsOperators: {
            'rootObject.arrayChild.$.replace': {
              type: 'object',
              properties: {
                childObjectItem: { type: 'string' },
              },
            },
            'rootObject.arrayChild.$.merge': {
              type: 'object',
              properties: {
                childObjectItem: { type: 'string' },
              },
            },
          },
          patternPropertiesOperators: {},
        },
      },
      {
        name: 'array of object in array',
        input: {
          type: 'object',
          properties: {
            rootArray: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  arrayChild: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        childObjectItem: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        expected: {
          pathsOperators: {},
          patternPropertiesOperators: {
            'rootArray\\.\\d+\\.arrayChild\\.\\$\\.replace$': {
              type: 'object',
              properties: {
                childObjectItem: { type: 'string' },
              },
            },
            'rootArray\\.\\d+\\.arrayChild\\.\\$\\.merge$': {
              type: 'object',
              properties: {
                childObjectItem: { type: 'string' },
              },
            },
          },
        },
      },
      {
        name: 'ignore "required" from object in merge',
        input: {
          type: 'object',
          properties: {
            rootObject: {
              type: 'object',
              properties: {
                arrayChild: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      childObjectItem: { type: 'string' },
                      childObjectItem2: { type: 'string' },
                    },
                    required: ['childObjectItem'],
                  },
                },
              },
            },
          },
        },
        expected: {
          pathsOperators: {
            'rootObject.arrayChild.$.replace': {
              type: 'object',
              properties: {
                childObjectItem: { type: 'string' },
                childObjectItem2: { type: 'string' },
              },
              required: ['childObjectItem'],
            },
            'rootObject.arrayChild.$.merge': {
              type: 'object',
              properties: {
                childObjectItem: { type: 'string' },
                childObjectItem2: { type: 'string' },
              },
            },
          },
          patternPropertiesOperators: {},
        },
      },
    ]

    for (const test of tests) {
      t.test(test.name, t => {
        const jsonSchema = test.input
        const { pathsOperators, patternPropertiesOperators } = generatePathFromJsonSchema(jsonSchema)
        t.strictSame({ pathsOperators, patternPropertiesOperators }, test.expected)

        t.end()
      })
    }

    t.end()
  })

  t.end()
})
