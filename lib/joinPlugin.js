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

const JSONStream = require('JSONStream')
const through2 = require('through2')

const Ajv = require('ajv')
const ajvFormats = require('ajv-formats')

const JoinService = require('./JoinService')

const JOIN_TAG = 'CRUD Join'

const oneToOneSchema = {
  tags: [JOIN_TAG],
  body: {
    type: 'object',
    required: ['asField', 'localField', 'foreignField'],
    properties: {
      fromQueryFilter: { type: 'object', default: {} },
      toQueryFilter: { type: 'object', default: {} },
      asField: { type: 'string' },
      localField: { type: 'string' },
      foreignField: { type: 'string' },
      fromProjectBefore: { type: 'array', items: { type: 'string' } },
      fromProjectAfter: { type: 'array', items: { type: 'string' } },
      toProjectBefore: { type: 'array', items: { type: 'string' } },
      toProjectAfter: { type: 'array', items: { type: 'string' } },
      toMerge: { type: 'boolean', default: false },
    },
    additionalProperties: false,
  },
  params: {
    type: 'object',
    required: ['from', 'to'],
    properties: {
      from: { type: 'string' },
      to: { type: 'string' },
    },
  },
}

const manyToManySchema = {
  tags: [JOIN_TAG],
  body: {
    type: 'object',
    required: ['asField', 'localField', 'foreignField'],
    properties: {
      fromQueryFilter: { type: 'object', default: {} },
      toQueryFilter: { type: 'object', default: {} },
      asField: { type: 'string' },
      localField: { type: 'string' },
      foreignField: { type: 'string' },
      fromProjectBefore: { type: 'array', items: { type: 'string' } },
      fromProjectAfter: { type: 'array', items: { type: 'string' } },
      toProjectBefore: { type: 'array', items: { type: 'string' } },
      toProjectAfter: { type: 'array', items: { type: 'string' } },
    },
    additionalProperties: false,
  },
  params: {
    type: 'object',
    required: ['from', 'to'],
    properties: {
      from: { type: 'string' },
      to: { type: 'string' },
    },
  },
}

const oneToManySchema = {
  tags: [JOIN_TAG],
  body: {
    type: 'object',
    required: ['asField', 'localField', 'foreignField'],
    properties: {
      fromQueryFilter: { type: 'object', default: {} },
      toQueryFilter: { type: 'object', default: {} },
      asField: { type: 'string' },
      localField: { type: 'string' },
      foreignField: { type: 'string' },
      fromProjectBefore: { type: 'array', items: { type: 'string' } },
      fromProjectAfter: { type: 'array', items: { type: 'string' } },
      toProjectBefore: { type: 'array', items: { type: 'string' } },
      toProjectAfter: { type: 'array', items: { type: 'string' } },
    },
    additionalProperties: false,
  },
  params: {
    type: 'object',
    required: ['from', 'to'],
    properties: {
      from: { type: 'string' },
      to: { type: 'string' },
    },
  },
}

const ajv = new Ajv({ coerceTypes: true, useDefaults: true })
ajvFormats(ajv)

module.exports = async function joinPlugin(fastify) {
  fastify.decorate('joinService', new JoinService(fastify.mongo.db, fastify.models))
  fastify.setValidatorCompiler(({ schema }) => ajv.compile(schema))

  const ndjsonSerializer = fastNdjsonSerializer(JSON.stringify)

  fastify.post(
    '/one-to-one/:from/:to/export',
    { schema: oneToOneSchema },
    async function handler(request, reply) {
      const { body, context, params } = request
      const { from, to } = params
      const {
        fromQueryFilter,
        toQueryFilter,
        asField,
        localField,
        foreignField,
        fromProjectBefore,
        fromProjectAfter,
        toProjectBefore,
        toProjectAfter,
        toMerge,
      } = body

      const { collectionModelFrom, collectionModelTo, error } = getCollectionModels(this.models, [from, to])
      if (error) {
        return reply.getHttpError(404, error)
      }

      const stream = this.joinService.joinOneToOne(context, {
        from,
        to,
        fromQueryFilter: resolveMongoQuery(collectionModelFrom.queryParser, fromQueryFilter),
        toQueryFilter: resolveMongoQuery(collectionModelTo.queryParser, toQueryFilter),
        asField,
        localField,
        foreignField,
        fromProjectBefore,
        fromProjectAfter,
        toProjectBefore,
        toProjectAfter,
      // TODO: How to map this?
      // fromACLMatching,
      // toACLMatching
      }, toMerge).stream()

      reply.type('application/x-ndjson')
      return ndjsonSerializer(stream)
    })

  fastify.post(
    '/one-to-one/:from/:to/',
    { schema: oneToOneSchema },
    async function handler(request, reply) {
      const { body, context, params } = request
      const { from, to } = params
      const {
        fromQueryFilter,
        toQueryFilter,
        asField,
        localField,
        foreignField,
        fromProjectBefore,
        fromProjectAfter,
        toProjectBefore,
        toProjectAfter,
        toMerge,
      } = body

      const { collectionModelFrom, collectionModelTo, error } = getCollectionModels(this.models, [from, to])
      if (error) {
        return reply.getHttpError(404, error)
      }

      const stream = this.joinService.joinOneToOne(context, {
        from,
        to,
        fromQueryFilter: resolveMongoQuery(collectionModelFrom.queryParser, fromQueryFilter),
        toQueryFilter: resolveMongoQuery(collectionModelTo.queryParser, toQueryFilter),
        asField,
        localField,
        foreignField,
        fromProjectBefore,
        fromProjectAfter,
        toProjectBefore,
        toProjectAfter,
      // TODO: How to map this?
      // fromACLMatching,
      // toACLMatching
      }, toMerge).stream()

      reply.type('application/json')
      return streamSerializer(stream)
    })

  fastify.post(
    '/one-to-many/:from/:to/export',
    { schema: oneToManySchema },
    async function handler(request, reply) {
      const { body, context, params } = request
      const { from, to } = params
      const {
        fromQueryFilter,
        toQueryFilter,
        asField,
        localField,
        foreignField,
        fromProjectBefore,
        fromProjectAfter,
        toProjectBefore,
        toProjectAfter,
      } = body

      const { collectionModelFrom, collectionModelTo, error } = getCollectionModels(this.models, [from, to])
      if (error) {
        return reply.getHttpError(404, error)
      }

      const stream = this.joinService.joinOneToMany(context, {
        from,
        to,
        fromQueryFilter: resolveMongoQuery(collectionModelFrom.queryParser, fromQueryFilter),
        toQueryFilter: resolveMongoQuery(collectionModelTo.queryParser, toQueryFilter),
        asField,
        localField,
        foreignField,
        fromProjectBefore,
        fromProjectAfter,
        toProjectBefore,
        toProjectAfter,
      // TODO: How to map this?
      // fromACLMatching,
      // toACLMatching
      }).stream()

      reply.type('application/x-ndjson')
      return ndjsonSerializer(stream)
    })

  fastify.post(
    '/many-to-many/:from/:to/export',
    { schema: manyToManySchema },
    async function handler(request, reply) {
      const { body, context, params } = request
      const { from, to } = params
      const {
        fromQueryFilter,
        toQueryFilter,
        asField,
        localField,
        foreignField,
        fromProjectBefore,
        fromProjectAfter,
        toProjectBefore,
        toProjectAfter,
      } = body

      const { collectionModelFrom, collectionModelTo, error } = getCollectionModels(this.models, [from, to])
      if (error) {
        return reply.getHttpError(404, error)
      }

      const stream = this.joinService.joinManyToMany(context, {
        from,
        to,
        fromQueryFilter: resolveMongoQuery(collectionModelFrom.queryParser, fromQueryFilter),
        toQueryFilter: resolveMongoQuery(collectionModelTo.queryParser, toQueryFilter),
        asField,
        localField,
        foreignField,
        fromProjectBefore,
        fromProjectAfter,
        toProjectBefore,
        toProjectAfter,
      // TODO: How to map this?
      // fromACLMatching,
      // toACLMatching
      }).stream()

      reply.type('application/x-ndjson')
      return ndjsonSerializer(stream)
    })
}

function fastNdjsonSerializer(stringify) {
  function ndjsonTransform(obj, encoding, callback) {
    this.push(`${stringify(obj)}\n`)
    callback()
  }
  return function ndjsonSerializer(stream) {
    return stream.pipe(through2.obj(ndjsonTransform))
  }
}

function getCollectionModels(models, endpoints) {
  const [collectionModelFrom, collectionModelTo] = endpoints.map(endpoint => getCollectionModel(models, endpoint))
  if (!collectionModelFrom) {
    return { error: `CRUD endpoint "${endpoints[0]}" does not exist` }
  }
  if (!collectionModelTo) {
    return { error: `CRUD endpoint "${endpoints[1]}" does not exist` }
  }
  return { collectionModelFrom, collectionModelTo }
}

function getCollectionModel(models, endpoint) {
  const collectionName = getCollectionNameFromEndpoint(endpoint)
  return models[collectionName]
}

function getCollectionNameFromEndpoint(endpointBasePath) {
  return endpointBasePath.replace('/', '')
    .replace(/\//g, '-')
}

function resolveMongoQuery(queryParser, clientQuery) {
  const mongoQuery = {
    $and: [],
  }
  if (clientQuery) {
    mongoQuery.$and.push(clientQuery)
  }

  queryParser.parseAndCast(mongoQuery)

  if (mongoQuery.$and && !mongoQuery.$and.length) {
    return {}
  }

  return mongoQuery
}

function streamSerializer(payload) {
  return payload.pipe(JSONStream.stringify())
}
