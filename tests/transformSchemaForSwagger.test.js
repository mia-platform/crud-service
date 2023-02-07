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

const { transformSchemaForSwagger } = require('../')
const booksExample = require('./expectedSchemas/booksPatchSchema')
const { SCHEMA_CUSTOM_KEYWORDS } = require('../lib/consts')

tap.test('transformSchemaForSwagger', t => {
  t.test('remove unique id from schema', t => {
    const url = 'the-url'
    const { schema: output, url: outputUrl } = transformSchemaForSwagger({ schema: getSchemaInput(), url })
    t.matchSnapshot(JSON.stringify(output, null, 2))
    t.strictSame(url, outputUrl)
    t.end()
  })

  t.test('books example - remove unique id field', t => {
    const regex = new RegExp(`"${SCHEMA_CUSTOM_KEYWORDS.UNIQUE_OPERATION_ID}"`, 'g')
    t.ok(JSON.stringify(booksExample).match(regex))
    const url = 'the-url'
    const { schema: transformed, url: outputUrl } = transformSchemaForSwagger({ schema: booksExample, url })
    t.notOk(JSON.stringify(transformed).match(regex))
    t.strictSame(url, outputUrl)

    t.end()
  })
  t.end()
})

function getSchemaInput() {
  return {
    summary: 'Update an item of the books collection by ID',
    tags: [
      'Books Endpoint',
    ],
    params: {
      operationId: 'books__MIA__patchItem__MIA__params',
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'the doc _id',
        },
      },
    },
    querystring: {
      operationId: 'books__MIA__patchItem__MIA__querystring',
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the book',
        },
      },
      patternProperties: {
        'metadata\\.somethingArrayObject\\.\\d+\\..+$$': true,
      },
      additionalProperties: false,
    },
    body: {
      operationId: 'books__MIA__patchItem__MIA__body',
      type: 'object',
      properties: {
        foo: { type: 'string' },
      },
      additionalProperties: false,
    },
    response: {
      200: {
        operationId: 'books__MIA__patchItem__MIA__response.200',
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            examples: [
              '000000000000000000000000',
            ],
            pattern: '^[a-fA-F\\d]{24}$',
            description: 'Hexadecimal identifier of the document in the collection',
          },
        },
      },
    },
  }
}
