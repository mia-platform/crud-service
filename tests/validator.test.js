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

const Ajv = require('ajv')
const tap = require('tap')

const modelJsonSchema = require('../lib/model.jsonschema')

const ajv = new Ajv({ useDefaults: true, coerceTypes: true })
const validate = ajv.compile(modelJsonSchema)

tap.test('validate schema', async t => {
  await t.test('should throw if partial Index has wrong filter', t => {
    const jsonFile = {
      name: 'addresses',
      endpointBasePath: '/addresses-endpoint',
      defaultState: 'DRAFT',
      fields: [
        {
          name: '_id',
          type: 'ObjectId',
          required: true,
        },
        {
          name: 'displayName',
          type: 'string',
          description: 'The display name',
          required: true,
        },
        {
          name: 'street',
          type: 'string',
          description: 'The street of the house',
          required: true,
        },
        {
          name: 'house_number',
          type: 'string',
          description: 'The number of the house',
          required: true,
        },
        {
          name: 'updaterId',
          type: 'string',
          description: 'User id that has requested the last change successfully',
          required: true,
        },
        {
          name: 'updatedAt',
          type: 'Date',
          description: 'Date of the request that has performed the last change',
          required: true,
        },
        {
          name: 'creatorId',
          type: 'string',
          description: 'User id that has created this object',
          required: true,
        },
        {
          name: 'createdAt',
          type: 'Date',
          description: 'Date of the request that has performed the object creation',
          required: true,
        },
        {
          name: '__STATE__',
          type: 'string',
          description: 'The state of the document',
          required: true,
        },
      ],
      indexes: [
        {
          name: 'streetPartialIndex',
          type: 'normal',
          unique: false,
          fields: [
            {
              name: 'street',
              order: 1,
            },
          ],
          partialIndex: 'street',
        },
      ],
    }

    t.strictSame(validate(jsonFile), false)
    t.end()
  })

  t.end()
})
