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

const { Readable } = require('stream')
const { pipeline } = require('stream/promises')

const getAccept = require('./acceptHeaderParser')

const { getFileMimeStringifiers } = require('./mimeTypeTransform')
const { NOT_ACCEPTABLE } = require('./consts')

async function registerHelperRoutes(fastify) {
  fastify.get('/schemas', {
    schema: {
      summary: 'Returns and array of the JSON schemas for every collection registered in the CRUD service',
      tags: ['Helper routes'],
      headers: {
        type: 'object',
        properties: {
          accept: {
            type: 'string',
            default: 'application/json',
          },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the collection',
              },
              schema: {
                type: 'object',
                description: 'JSON schema describing the data model of the collection',
                additionalProperties: true,
              },
            },
          },
        },
      },
    },
    config: {
      replyType: (acceptHeader = '') => {
        const accept = getAccept(acceptHeader)
        if (!accept || accept === '*/*') { return 'application/json' }
        return accept
      },
    },
  }, handleGetSchemas(fastify.models))
}

function handleGetSchemas(models) {
  const jsonSchemas = []

  return async(request, reply) => {
    if (jsonSchemas.length <= 0) {
      for (const model of Object.values(models)) {
        const jsonSchema = model.jsonSchemaGeneratorWithNested.generateGetItemJSONSchema().response['200']
        jsonSchemas.push({
          name: model.definition.name,
          schema: {
            type: jsonSchema.type,
            properties: jsonSchema.properties,
          },
        })
      }
    }

    const { headers: { accept }, routeOptions: { config: { replyType } } } = request
    const contentType = replyType(accept)

    const responseStringifiers = getFileMimeStringifiers(contentType, {})
    if (!responseStringifiers) {
      return reply.getHttpError(NOT_ACCEPTABLE, `unsupported file type ${contentType}`)
    }

    reply.raw.setHeader('Content-Type', contentType)

    return pipeline(
      Readable.from(jsonSchemas),
      ...responseStringifiers(),
      reply.raw
    )
  }
}

module.exports = {
  registerHelperRoutes,
}
