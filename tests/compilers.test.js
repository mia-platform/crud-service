/*
 * Copyright 2024 Mia s.r.l.
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
const Fastify = require('fastify')
const { addValidatorCompiler } = require('../lib/compilers')
const books = require('./collectionDefinitions/books')
const loadModels = require('../lib/loadModels')
const { getMongoDatabaseName, getMongoURL } = require('./utils')
const { registerMongoInstances } = require('../lib/mongo/mongo-plugin')
const { SCHEMAS_ID } = require('../lib/schemaGetters')


const SCHEMA_CUSTOM_KEYWORDS = {
  UNIQUE_OPERATION_ID: 'operationId',
}

tap.test('compilers', async(t) => {
  const databaseName = getMongoDatabaseName()

  t.test('validator compiler should extract property correctly without collisions', async t => {
    const fastify = Fastify()

    t.teardown(async() => fastify.close())

    fastify.decorate('config', { MONGODB_URL: getMongoURL(databaseName) })
    fastify.decorate('collections', [books])
    fastify.decorate('modelName', 'books-endpoint')
    await registerMongoInstances(fastify)


    await loadModels(fastify)

    //* here i add a fake model to test collision
    // eslint-disable-next-line require-atomic-updates
    fastify.models['books-endpoint-2'] = {}

    addValidatorCompiler(fastify, fastify.models, { HELPERS_PREFIX: '/helpers' })

    const schema = {
      [SCHEMA_CUSTOM_KEYWORDS.UNIQUE_OPERATION_ID]: `books__MIA__${SCHEMAS_ID.POST_ITEM}__MIA__response.200`,
      type: 'object',
      properties: {
        id: {
          type: 'string',
        },
      },
      required: ['id'],
    }

    const url = '/test-url'

    const validationFunc = fastify.validatorCompiler({ schema, url })

    t.ok(validationFunc, 'Validator function should be created')
    t.equal(typeof validationFunc, 'function', 'Validator function should be a function')
    //* here we test that post schema from model is recognized correctly.
    //* we pass an empty object for ok validation and a wrong formatted _id for ko validation
    t.ok(validationFunc({}), 'Validation should return true with invalid obj')
    t.notOk(validationFunc({ _id: 'a' }), 'Validation should return false with invalid obj')
  })
})
