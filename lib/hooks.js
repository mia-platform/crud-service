'use strict'

const { hrtime } = require('node:process')
const { QUERY, RAW_PROJECTION, INVALID_USERID, SETCMD, UNSETCMD, PUSHCMD, PULLCMD, ADDTOSETCMD } = require('./consts')
const { ObjectId } = require('mongodb')
const { getAjvResponseValidationFunction } = require('./validatorGetters')

function addHealthHooks(fastify) {
  const start = hrtime.bigint()

  fastify.addHook('onReady', () => {
    fastify.log.info({ elapsedMs: Number(hrtime.bigint() - start) / 1_000_000 }, 'ready event reached')
  })
  fastify.addHook('onListen', () => {
    fastify.log.info({ elapsedMs: Number(hrtime.bigint() - start) / 1_000_000 }, 'listen event reached')
  })
}

function addAclHook(fastify) {
  fastify.addHook('onRequest', async(request) => {
    if (request.headers.acl_rows) {
      request.headers.acl_rows = JSON.parse(request.headers.acl_rows)
    }
  })
}

function addPreHandlerHooks(fastify) {
  fastify.addHook('preHandler', injectContextInRequest)
  fastify.addHook('preHandler', request => parseEncodedJsonQueryParams(fastify.log, request))
}

async function parseEncodedJsonQueryParams(logger, request) {
  if (request.headers.json_query_params_encoding) {
    logger.warn('You\'re using the json_query_params_encoding header but it\'s deprecated and its support is going to be dropped in the next major release. Use json-query-params-encoding instead.')
  }

  // TODO remove request.headers.json_query_params_encoding fallback in v7.0.0
  const jsonQueryParamsEncoding = request.headers['json-query-params-encoding'] || request.headers.json_query_params_encoding
  switch (jsonQueryParamsEncoding) {
  case 'base64': {
    const queryJsonFields = [QUERY, RAW_PROJECTION]
    for (const field of queryJsonFields) {
      if (request.query[field]) {
        request.query[field] = Buffer.from(request.query[field], jsonQueryParamsEncoding).toString()
      }
    }
    break
  }
  default:
    break
  }
}

async function injectContextInRequest(request) {
  const userIdHeader = request.headers[this.userIdHeaderKey]
  const isUserHeaderInvalid = INVALID_USERID.includes(userIdHeader)

  let userId = 'public'

  if (userIdHeader && !isUserHeaderInvalid) {
    userId = userIdHeader
  }

  request.crudContext = {
    log: request.log,
    userId,
    now: new Date(),
  }
}

function mapLookupToObjectId(reference) {
  // consider both one-to-one and one-to-many relationships
  if (Array.isArray(reference)) {
    return reference
      .map(ref => (ref?.value ? ObjectId.createFromHexString(ref.value) : undefined))
      .filter(Boolean)
  }

  return reference?.value ? ObjectId.createFromHexString(reference.value) : undefined
}

/**
 * To allow writing views without having to rewrite all the logic of the HttpInterface,
 it was decided to adapt the fields of the calls towards the view by converting them
 to the fields of the underlying collection, thus hiding the complexity on the client
 side while maintaining consistent interfaces.
 This assumes that the key of the value is in the field "value" and should be made configurable.
 * @param {*} fastify
 */
function addLookupHook(fastify) {
  const lookups = fastify.models
    ? Object.entries(fastify.models)
      .reduce(
        (accumulator, [modelName, { viewDependencies }]) => {
          accumulator[modelName] = viewDependencies.lookupsModels?.map(({ lookup }) => lookup) || []
          return accumulator
        },
        {}
      )
    : {}

  fastify.addHook('preHandler', (request, _reply, done) => {
    const modelLookups = lookups[request.modelName] || []
    // in case there is a field in the body that matches a lookup definition
    // it converts the object value into an ObjectId
    for (const { as, localField } of modelLookups) {
      if (Array.isArray(request?.body)) {
        // this pre-process bulk operations
        request.body = request?.body.map(elem => preprocessLookupOperation(elem, as, localField))
      } else {
        // this pre-process standard operations
        request.body = preprocessLookupOperation(request.body, as, localField)
      }
    }

    done()
  })
}

function preprocessLookupOperation(element, as, localField) {
  if (element?.[as]) {
    const lookupReference = element[as]
    delete element[as]

    element[localField] = mapLookupToObjectId(lookupReference)
  }

  for (const command of [SETCMD, UNSETCMD, PUSHCMD, PULLCMD, ADDTOSETCMD]) {
    if (element?.[command]?.[as]) {
      const lookupReference = element[command][as]
      delete element[command][as]

      element[command][localField] = mapLookupToObjectId(lookupReference)
    }
  }

  return element
}

function addPatchViewHook(fastify) {
  // To obtain the updated object with a consistent interface after a patch,
  // it is necessary to retrieve the view object again before returning it to the client.
  fastify.addHook('preSerialization', async function preSerializer(request, _reply, payload) {
    const { _id } = payload || {}

    if (request.method === 'PATCH' && _id && fastify.models) {
      const { crudService, isView } = fastify.models[request.modelName] || {}
      if (isView) {
        const docId = this.castCollectionId(_id)
        // eslint-disable-next-line no-underscore-dangle
        const doc = await crudService._mongoCollection.findOne({ _id: docId })
        const validatePatch = getAjvResponseValidationFunction(request.routeOptions.schema.response['200'])
        validatePatch(doc)
        return doc
      }
    }
    return payload
  })
}

function addModelNameHook(fastify, modelName) {
  fastify.addHook('onRequest', async(request) => {
    request.modelName = modelName
  })
}

module.exports = {
  addHealthHooks,
  addAclHook,
  addPreHandlerHooks,
  addLookupHook,
  addPatchViewHook,
  addModelNameHook,
}
