'use strict'

const fp = require('fastify-plugin')

const multidbMongoConnections = require('./mongo-connections')
const { createCursorCache } = require('./cursor-cache')
const {
  handleMultidbGetList,
  handleMultidbCount,
  handleMultidbGetId,
  handleMultidbPatchId,
  handleMultidbPatchMany,
  handleMultidbPatchBulk,
  wrapWriteHandler,
} = require('./handlers')

/**
 * Additional headers properties injected into existing routes
 * when multi-db mode is active.
 */
const MULTIDB_CURSOR_PROP = {
  type: 'string',
  description: 'Opaque keyset pagination cursor from previous page response',
}

const MULTIDB_SCOPE_PROP = {
  type: 'string',
  description: 'Target scope(s) — comma-separated. If omitted, defaults to DEFAULT_SCOPE.',
}

const SCOPE_RESPONSE_PROP = {
  type: 'string',
  description: 'The scope (database) from which this document originates.',
}

/**
 * Inject `scope` property into the route's response 200 schema
 * so that Fastify's fast-json-stringify includes it in serialized output.
 *
 * Handles both:
 *  - Array response: { type: 'array', items: { properties: { ... } } }
 *  - Object response: { type: 'object', properties: { ... } }
 *
 * @param {object} routeOptions - Fastify route options
 */
function injectScopeInResponseSchema(routeOptions) {
  const responseSchema = routeOptions.schema?.response?.['200']
  if (!responseSchema) { return }

  if (responseSchema.type === 'array' && responseSchema.items?.properties) {
    responseSchema.items.properties.scope = SCOPE_RESPONSE_PROP
  } else if (responseSchema.properties) {
    responseSchema.properties.scope = SCOPE_RESPONSE_PROP
  }
}

/**
 * Handler names for write (and single-scope) operations that need x-scope routing.
 * These handlers are wrapped with a Proxy to redirect CrudService to the scoped collection.
 *
 * NOTE: PATCH handlers are NOT in this set — they use multi-scope fan-out
 * (x-scope optional; if omitted, patches ALL scopes).
 */
const WRITE_HANDLER_NAMES = new Set([
  'handleInsertOne',
  'handleDeleteId',
  'handleDeleteList',
  'handleUpsertOne',
  'handleInsertMany',
  'handleChangeStateById',
  'handleChangeStateMany',
  'handleCollectionImport',
])

/**
 * Ensure schema.headers exists with a properties object.
 *
 * @param {object} routeOptions - Fastify route options
 */
function ensureHeadersSchema(routeOptions) {
  if (!routeOptions.schema) {
    routeOptions.schema = {}
  }
  if (!routeOptions.schema.headers) {
    routeOptions.schema.headers = { type: 'object', properties: {} }
  }
  if (!routeOptions.schema.headers.properties) {
    routeOptions.schema.headers.properties = {}
  }
}

/**
 * Inject x-scope as an OPTIONAL header for all multi-db routes.
 * When omitted, DEFAULT_SCOPE is used.
 *
 * @param {object} routeOptions - Fastify route options from onRoute hook
 */
function injectOptionalScope(routeOptions) {
  ensureHeadersSchema(routeOptions)

  routeOptions.schema.headers.properties['x-scope'] = MULTIDB_SCOPE_PROP
  injectScopeInResponseSchema(routeOptions)
}

/**
 * Intercept a GET list route: replace with scatter-gather + keyset pagination.
 * @param {object} routeOptions
 */
function interceptGetList(routeOptions) {
  routeOptions.handler = handleMultidbGetList

  // _sk is accepted but silently ignored — keyset pagination takes over internally.
  // The original response schema (JSON array) is preserved — cursor goes in x-cursor header.

  ensureHeadersSchema(routeOptions)
  routeOptions.schema.headers.properties['x-cursor'] = MULTIDB_CURSOR_PROP
  routeOptions.schema.headers.properties['x-scope'] = MULTIDB_SCOPE_PROP

  // Inject scope in response array items so fast-json-stringify includes it
  injectScopeInResponseSchema(routeOptions)

  if (routeOptions.config) {
    delete routeOptions.config.streamValidator
  }
}

/**
 * Intercept a GET count route: replace with scatter-count.
 * @param {object} routeOptions
 */
function interceptGetCount(routeOptions) {
  routeOptions.handler = handleMultidbCount

  // _useEstimate is accepted but silently ignored — estimate not supported across N databases.

  ensureHeadersSchema(routeOptions)
  routeOptions.schema.headers.properties['x-scope'] = MULTIDB_SCOPE_PROP
}

/**
 * Intercept a GET /:id route: replace with parallel multi-scope lookup.
 * @param {object} routeOptions
 */
function interceptGetById(routeOptions) {
  routeOptions.handler = handleMultidbGetId

  ensureHeadersSchema(routeOptions)
  routeOptions.schema.headers.properties['x-scope'] = MULTIDB_SCOPE_PROP
  injectScopeInResponseSchema(routeOptions)
}

/**
 * Intercept PATCH /:collectionName/:id — multi-scope fan-out.
 * x-scope is optional: if missing, all scopes are patched.
 * @param {object} routeOptions
 */
function interceptPatchId(routeOptions) {
  routeOptions.handler = handleMultidbPatchId

  ensureHeadersSchema(routeOptions)
  routeOptions.schema.headers.properties['x-scope'] = MULTIDB_SCOPE_PROP
  injectScopeInResponseSchema(routeOptions)
}

/**
 * Intercept PATCH /:collectionName/ — multi-scope fan-out.
 * x-scope is optional: if missing, all scopes are patched.
 * @param {object} routeOptions
 */
function interceptPatchMany(routeOptions) {
  routeOptions.handler = handleMultidbPatchMany

  ensureHeadersSchema(routeOptions)
  routeOptions.schema.headers.properties['x-scope'] = MULTIDB_SCOPE_PROP
}

/**
 * Intercept PATCH /:collectionName/bulk — multi-scope fan-out.
 * x-scope is optional: if missing, all scopes are patched.
 * @param {object} routeOptions
 */
function interceptPatchBulk(routeOptions) {
  routeOptions.handler = handleMultidbPatchBulk

  ensureHeadersSchema(routeOptions)
  routeOptions.schema.headers.properties['x-scope'] = MULTIDB_SCOPE_PROP
}

/**
 * Map of handler names to PATCH multi-scope interceptors.
 */
const PATCH_INTERCEPTORS = {
  handlePatchId: interceptPatchId,
  handlePatchMany: interceptPatchMany,
  handlePatchBulk: interceptPatchBulk,
}

/**
 * onRoute hook callback: dispatches to the appropriate interceptor
 * based on the handler name.
 *
 * @param {object} routeOptions - Fastify route options
 */
function interceptRoute(routeOptions) {
  const handlerName = routeOptions.handler
    ? routeOptions.handler.name
    : undefined

  if (!handlerName) {
    return
  }

  // ── GET / (list) — scatter-gather + keyset pagination ──
  if (handlerName === 'handleGetList' && !routeOptions.url.endsWith('/export')) {
    interceptGetList(routeOptions)
    return
  }

  // ── GET /count — scatter-count ──
  if (handlerName === 'handleCount') {
    interceptGetCount(routeOptions)
    return
  }

  // ── GET /:id — parallel multi-scope lookup ──
  if (handlerName === 'handleGetId') {
    interceptGetById(routeOptions)
    return
  }

  // ── PATCH routes — multi-scope fan-out ──
  if (PATCH_INTERCEPTORS[handlerName]) {
    PATCH_INTERCEPTORS[handlerName](routeOptions)
    return
  }

  // ── Write handlers — Proxy routing to single scoped collection ──
  if (WRITE_HANDLER_NAMES.has(handlerName)) {
    routeOptions.handler = wrapWriteHandler(routeOptions.handler)
    injectOptionalScope(routeOptions)
    return
  }

  // ── GET /export + GET / (lookup) — single-scope routing ──
  const isExportRoute = handlerName === 'handleGetList' && routeOptions.url.endsWith('/export')
  const isLookupRoute = handlerName === 'handleGetListLookup'

  if (isExportRoute || isLookupRoute) {
    routeOptions.handler = wrapWriteHandler(routeOptions.handler)
    injectOptionalScope(routeOptions)
  }
}

/**
 * Multi-DB Plugin for CRUD Service
 *
 * When MULTIDB_ENABLED=true, this plugin:
 * 1. Registers N MongoDB connections (one per scope) via MULTIDB_URL_TEMPLATE
 * 2. Intercepts ALL existing CRUD routes via Fastify's onRoute hook:
 *    - GET list/count/getById → replaced with scatter-gather across scopes
 *    - PATCH → multi-scope fan-out
 *    - POST/DELETE (writes) → Proxy-wrapped to route to a single scope
 *    - GET export/lookup → Proxy-wrapped to route to a single scope
 *
 * x-scope header is OPTIONAL everywhere:
 *   - If provided, limits operation to specified scope(s)
 *   - If omitted, defaults to DEFAULT_SCOPE
 *
 * Required env vars:
 *   MULTIDB_ENABLED         - "true" to activate (default: "false")
 *   MULTIDB_SCOPES          - Comma-separated or JSON array of scope names
 *   MULTIDB_URL_TEMPLATE    - MongoDB URL with {{scope}} placeholder
 *   DEFAULT_SCOPE           - Default scope (must be one of MULTIDB_SCOPES)
 *
 * Optional env vars:
 *   MULTIDB_MAX_IDLE_TIME_MS - MongoDB maxIdleTimeMS per scope connection
 *
 * @param {import('fastify').FastifyInstance} fastify
 */
async function multidbPlugin(fastify) {
  fastify.log.info('Multi-DB plugin initializing')

  // Step 1: Register MongoDB connections for all scopes
  await fastify.register(multidbMongoConnections)

  // Step 2: Build modelName → collectionName map from loaded models.
  // Since collections are identical across all scopes, this mapping is fixed
  // and allows multidb.collection() to accept modelNames directly.
  const collectionNameMap = {}
  for (const [modelName, model] of Object.entries(fastify.models || {})) {
    if (model.definition?.name) {
      collectionNameMap[modelName] = model.definition.name
    }
  }
  Object.assign(fastify.multidb.collectionNameMap, collectionNameMap)
  fastify.log.debug(
    { mappings: Object.keys(collectionNameMap).length },
    'Multi-DB collectionName map populated from models'
  )

  // Step 3: Initialize cursor cache on the DEFAULT_SCOPE database
  const cacheCollectionName = fastify.config.CURSOR_CACHE_COLLECTION || '_multidb_cursors'
  const cacheCollection = fastify.multidb.defaultDb.collection(cacheCollectionName)
  const cursorCache = createCursorCache(cacheCollection)
  Object.assign(fastify.multidb, { cursorCache })
  fastify.log.info(
    { collection: cacheCollectionName },
    'Multi-DB cursor cache initialized (MongoDB-backed)'
  )

  // Step 4: Register onRoute hook that intercepts collection CRUD routes
  //         and replaces handlers with multi-db versions
  fastify.addHook('onRoute', interceptRoute)

  // Step 5: Extend health check to include multi-db scopes
  fastify.decorate('multidbCheckIsUp', async() => {
    try {
      return await fastify.multidb.isUp()
    } catch {
      return false
    }
  })

  fastify.log.info(
    { scopes: fastify.multidb.scopes },
    'Multi-DB plugin initialized — existing routes will be intercepted'
  )
}

module.exports = fp(multidbPlugin, {
  name: 'multidb-plugin',
  decorators: { fastify: ['config'] },
})
