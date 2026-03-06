'use strict'

const { scatterGather, scatterCount, DEFAULT_PAGE_SIZE } = require('./scatter-gather')
const { CursorError } = require('./cursor')
const { buildCacheKey, rebuildCursorChain } = require('./cursor-cache')
const resolveMongoQuery = require('../resolveMongoQuery')
const { resolveProjection } = require('../projectionUtils')
const { castCollectionId } = require('../AdditionalCaster')
const {
  QUERY,
  PROJECTION,
  RAW_PROJECTION,
  SORT,
  LIMIT,
  SKIP,
  STATE,
  EXPORT_OPTIONS,
  USE_ESTIMATE,
  __STATE__,
  ACL_WRITE_COLUMNS,
  ACL_ROWS,
  INTERNAL_SERVER_ERROR_STATUS_CODE,
} = require('../consts')
const {
  getEditableFields,
  parseSubScope,
  parseSort,
  resolveMultidb,
  createScopedCrudService,
  wrapCursorStreamWithScope,
  addScopeToResult,
  createScopedMultidb,
} = require('./handlers.utils')

// Cursor cache defaults (overridable via env vars)
const DEFAULT_CURSOR_TTL = 300
const DEFAULT_MAX_SKIP = 2000
const DEFAULT_MAX_REBUILD_PAGES = 5

/**
 * Multi-db replacement handler for GET /:collectionName/ (list).
 *
 * Uses scatter-gather across all scopes with keyset pagination.
 * Translates _sk (offset) into keyset cursor tokens using a MongoDB-backed cache.
 *
 * Pagination flow:
 *   1. _sk=0 → first page, no cursor needed
 *   2. response nextCursor cached as page 0 cursor
 *   3. _sk=20 (page 1) → look up page 0 cursor from cache → use as input
 *   4. response nextCursor cached as page 1 cursor
 *   ...and so on
 *
 * If the cursor is not in cache (expired/evicted) and page ≤ MAX_REBUILD_PAGES,
 * the handler replays from page 0 to rebuild the cursor chain.
 *
 * MUST be a regular function (not arrow) to preserve Fastify `this` binding.
 */
// eslint-disable-next-line max-statements
async function handleMultidbGetList(request, reply) {
  const { query, headers, log } = request
  const {
    [QUERY]: clientQueryString,
    [PROJECTION]: clientProjectionString = '',
    [RAW_PROJECTION]: clientRawProjectionString = '',
    [SORT]: sortQuery,
    [LIMIT]: limit,
    [SKIP]: skip,
    [STATE]: state,
    ...otherParams
  } = query

  // Standard query params accepted but silently ignored in multi-db mode
  delete otherParams[EXPORT_OPTIONS]

  const {
    acl_rows: aclRows,
    acl_read_columns: aclReadColumns,
    'x-cursor': explicitCursor,
    'x-scope': scopeFilter,
    'x-cross-scopes': crossScopeFilter,
    'x-cross-query': crossQueryStr,
  } = headers

  const projection = resolveProjection(
    clientProjectionString,
    aclReadColumns,
    this.allFieldNames,
    clientRawProjectionString,
    log
  )

  const filter = resolveMongoQuery(
    this.queryParser,
    clientQueryString,
    aclRows,
    otherParams,
    false
  )

  const { sortField, sortDir } = parseSort(sortQuery)

  const states = state
    ? state
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
    : ['PUBLIC']

  const multidb = resolveMultidb(this.multidb, scopeFilter, log, crossScopeFilter)

  // Parse cross-query filter (used for cross-scope entries)
  const crossFilter = crossQueryStr
    ? resolveMongoQuery(this.queryParser, crossQueryStr, aclRows, {}, false)
    : null

  // ── Cursor cache: translate _sk offset into keyset cursor ──
  const effectiveLimit = limit || DEFAULT_PAGE_SIZE
  const _sk = skip ? parseInt(skip, 10) : 0

  const maxSkip = this.config?.MAX_SKIP || DEFAULT_MAX_SKIP
  const maxRebuildPages = this.config?.MAX_REBUILD_PAGES || DEFAULT_MAX_REBUILD_PAGES
  const cursorTTL = this.config?.CURSOR_TTL || DEFAULT_CURSOR_TTL

  // Guard: pagination depth
  if (_sk > maxSkip) {
    return reply.code(400).send({
      error: 'PaginationDepthExceeded',
      message: `Cannot skip beyond ${maxSkip} results. Use filters to narrow your search.`,
    })
  }

  const page = _sk > 0 ? Math.floor(_sk / effectiveLimit) : 0

  // Determine the cursor token to use:
  //  1. Explicit x-cursor header takes priority (direct keyset pagination)
  //  2. _sk > 0 → resolve cursor from MongoDB cache
  //  3. _sk = 0 → first page, no cursor needed
  let cursorToken = explicitCursor || null

  if (!cursorToken && page > 0) {
    const { cursorCache } = this.multidb
    const { prevKey } = buildCacheKey(
      this.modelName, scopeFilter, sortQuery, clientQueryString, state, page
    )

    if (prevKey) {
      cursorToken = await cursorCache.get(prevKey)
    }

    // Cache miss: rebuild cursor chain if within threshold
    if (!cursorToken && page <= maxRebuildPages) {
      log.info({ page, collection: this.modelName }, 'Cursor cache miss — rebuilding chain')
      cursorToken = await rebuildCursorChain(scatterGather, {
        multidb,
        collectionName: this.modelName,
        filter,
        crossFilter,
        sortField,
        sortDir,
        limit: effectiveLimit,
        projection,
        states,
        scopeFilter,
        sortQuery: sortQuery || undefined,
        filterQuery: clientQueryString || undefined,
        stateQuery: state || undefined,
        targetPage: page,
        cursorCache,
        cursorTTL,
        log,
      })
    }

    if (!cursorToken) {
      return reply.code(410).send({
        error: 'CursorExpired',
        message: 'Pagination cursor expired. Please restart from the first page.',
      })
    }
  }

  try {
    const result = await scatterGather({
      multidb,
      collectionName: this.modelName,
      filter,
      crossFilter,
      sortField,
      sortDir,
      limit: effectiveLimit,
      projection,
      states,
      cursorToken,
      log,
    })

    // eslint-disable-next-line no-underscore-dangle
    const meta = result._meta
    if (meta.degradedScopes.length > 0) {
      reply.header('X-Multidb-Degraded', meta.degradedScopes.join(','))
    }

    // Cache the next cursor for the CURRENT page so the NEXT page can use it
    if (result.nextCursor && this.multidb.cursorCache) {
      const { cacheKey } = buildCacheKey(
        this.modelName, scopeFilter, sortQuery, clientQueryString, state, page
      )
      await this.multidb.cursorCache.set(cacheKey, result.nextCursor, cursorTTL)
    }

    // Return cursor in response header — keeps the response format identical to standard CRUD
    if (result.nextCursor) {
      reply.header('x-cursor', result.nextCursor)
    }

    return result.data
  } catch (error) {
    if (error instanceof CursorError) {
      return reply
        .code(error.statusCode)
        .send({ error: error.message })
    }
    log.error(
      { error: error.message, collection: this.modelName },
      'Multi-db scatter-gather failed'
    )
    return reply
      .code(INTERNAL_SERVER_ERROR_STATUS_CODE)
      .send({ error: 'Internal server error during multi-db query' })
  }
}

/**
 * Multi-db replacement handler for GET /:collectionName/count.
 *
 * Returns the total count across all scopes as an integer,
 * maintaining backwards compatibility with the standard CRUD count.
 *
 * MUST be a regular function (not arrow) to preserve Fastify `this` binding.
 */
async function handleMultidbCount(request) {
  const { query, headers, log } = request
  const {
    [QUERY]: clientQueryString,
    [STATE]: state,
    ...otherParams
  } = query

  // Standard query param accepted but silently ignored in multi-db mode
  delete otherParams[USE_ESTIMATE]

  const {
    acl_rows: aclRows,
    'x-scope': scopeFilter,
    'x-cross-scopes': crossScopeFilter,
    'x-cross-query': crossQueryStr,
  } = headers

  const filter = resolveMongoQuery(
    this.queryParser,
    clientQueryString,
    aclRows,
    otherParams,
    false
  )

  const states = state
    ? state
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
    : ['PUBLIC']

  const multidb = resolveMultidb(this.multidb, scopeFilter, log, crossScopeFilter)

  // Parse cross-query filter (used for cross-scope entries)
  const crossFilter = crossQueryStr
    ? resolveMongoQuery(this.queryParser, crossQueryStr, aclRows, {}, false)
    : null

  const result = await scatterCount({
    multidb,
    collectionName: this.modelName,
    filter,
    crossFilter,
    states,
    log,
  })

  return result.totalCount
}

/**
 * Multi-db replacement handler for GET /:collectionName/:id.
 *
 * Searches across all scopes in parallel for a document by _id.
 * Returns the first match with an added `scope` field.
 *
 * MUST be a regular function (not arrow) to preserve Fastify `this` binding.
 */
async function handleMultidbGetId(request, reply) {
  const { query, headers, log } = request
  const docId = request.params.id
  const {
    [QUERY]: clientQueryString,
    [PROJECTION]: clientProjectionString = '',
    [RAW_PROJECTION]: clientRawProjectionString = '',
    [STATE]: state,
    ...otherParams
  } = query

  const {
    acl_rows: aclRows,
    acl_read_columns: aclReadColumns,
    'x-scope': scopeFilter,
    'x-cross-scopes': crossScopeFilter,
    'x-cross-query': crossQueryStr,
  } = headers

  const projection = resolveProjection(
    clientProjectionString,
    aclReadColumns,
    this.allFieldNames,
    clientRawProjectionString,
    log
  )

  const filter = resolveMongoQuery(
    this.queryParser,
    clientQueryString,
    aclRows,
    otherParams,
    false
  )

  // Parse cross-query filter (used for cross-scope entries)
  const crossFilter = crossQueryStr
    ? resolveMongoQuery(this.queryParser, crossQueryStr, aclRows, {}, false)
    : null

  const documentId = castCollectionId(docId)
  const stateArr = state
    ? state
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
    : ['PUBLIC']

  const stateFilter = stateArr.length === 1
    ? { [__STATE__]: stateArr[0] }
    : { [__STATE__]: { $in: stateArr } }

  const multidb = resolveMultidb(this.multidb, scopeFilter, log, crossScopeFilter)

  // Use entries for per-scope subScope/crossQuery filtering
  const entries = multidb.entries || multidb.scopes.map(sc => ({ physical: sc, label: sc }))

  const scopeQueries = entries.map(async(entry) => {
    try {
      const collection = multidb.collection(entry.physical, this.modelName)

      // Choose filter: cross-scope entries use crossFilter, others use normal filter
      const baseFilter = (entry.isCross && crossFilter) ? crossFilter : filter
      const hasBaseFilter = baseFilter && Object.keys(baseFilter).length > 0

      // Build subScope filter if entry has a sub-partition
      const subScopeFilter = entry.sub ? { subScope: entry.sub } : null

      // Combine all filter parts
      const parts = [
        { _id: documentId },
        stateFilter,
        ...(hasBaseFilter ? [baseFilter] : []),
        ...(subScopeFilter ? [subScopeFilter] : []),
      ]

      const searchQuery = parts.length === 1 ? parts[0] : { $and: parts }

      const doc = await collection.findOne(searchQuery, { projection })
      return { physical: entry.physical, sub: entry.sub, doc }
    } catch (error) {
      log.error(
        { scope: entry.label, error: error.message },
        'Multi-db getById failed for scope'
      )
      return { physical: entry.physical, sub: entry.sub, doc: null }
    }
  })

  const results = await Promise.all(scopeQueries)
  const found = results.find(item => item.doc !== null)

  if (!found) {
    return reply.notFound()
  }

  return {
    ...found.doc,
    database: found.physical,
    ...(found.sub && { subScope: found.sub }),
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// Multi-scope PATCH handlers — fan-out across scopes
//
// These handlers replace the standard PATCH routes when multi-db is enabled.
// The x-scope header is OPTIONAL:
//   - If provided, patches only the listed scopes (comma-separated)
//   - If omitted, patches only DEFAULT_SCOPE
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Multi-db PATCH by ID — fan-out across all target scopes.
 *
 * Tries to patchById in each scope in parallel.
 * Returns the updated document from the first scope where it was found,
 * with the `scope` field added.
 * Returns 404 if no scope had a matching document.
 *
 * MUST be a regular function (not arrow) to preserve Fastify `this` binding.
 */
async function handleMultidbPatchId(request, reply) {
  const { query, headers, params, crudContext, log } = request
  const {
    [QUERY]: clientQueryString,
    [STATE]: state,
    ...otherParams
  } = query
  const {
    acl_rows: aclRows,
    acl_write_columns: aclWriteColumns,
    acl_read_columns: aclColumns = '',
    'x-scope': scopeFilter,
  } = headers

  const commands = request.body
  const editableFields = getEditableFields(aclWriteColumns, this.allFieldNames)
  const mongoQuery = resolveMongoQuery(this.queryParser, clientQueryString, aclRows, otherParams, false)
  this.queryParser.parseAndCastCommands(commands, editableFields)
  const projection = resolveProjection('', aclColumns, this.allFieldNames, '', log)

  const docId = params.id
  const _id = castCollectionId(docId)

  const stateArr = state.split(',')

  const multidb = resolveMultidb(this.multidb, scopeFilter, log)

  log.debug(
    { collection: this.modelName, scopes: multidb.scopes },
    'Multi-db patchById: querying scopes'
  )

  const scopeResults = await Promise.all(
    multidb.scopes.map(async(scope) => {
      try {
        const collection = multidb.collection(scope, this.modelName)
        const scopedService = createScopedCrudService(this.crudService, collection)
        const doc = await scopedService.patchById(crudContext, _id, commands, mongoQuery, projection, stateArr)
        return { scope, doc }
      } catch (error) {
        log.error({ scope, error: error.message }, 'Multi-db patchById failed for scope')
        return { scope, doc: null }
      }
    })
  )

  const found = scopeResults.find(result => result.doc !== null)
  if (!found) {
    return reply.notFound()
  }

  return {
    ...found.doc,
    database: found.scope,
  }
}

/**
 * Multi-db PATCH many — fan-out across all target scopes.
 *
 * Runs patchMany in each scope in parallel and sums the modifiedCount.
 * Returns the total number of modified documents across all scopes.
 *
 * MUST be a regular function (not arrow) to preserve Fastify `this` binding.
 */
async function handleMultidbPatchMany(request) {
  const { query, headers, crudContext, log } = request
  const {
    [QUERY]: clientQueryString,
    [STATE]: state,
    ...otherParams
  } = query
  const {
    acl_rows: aclRows,
    acl_write_columns: aclWriteColumns,
    'x-scope': scopeFilter,
  } = headers

  const commands = request.body
  const editableFields = getEditableFields(aclWriteColumns, this.allFieldNames)
  const mongoQuery = resolveMongoQuery(this.queryParser, clientQueryString, aclRows, otherParams, false)
  this.queryParser.parseAndCastCommands(commands, editableFields)

  const stateArr = state.split(',')

  const multidb = resolveMultidb(this.multidb, scopeFilter, log)

  log.debug(
    { collection: this.modelName, scopes: multidb.scopes },
    'Multi-db patchMany: querying scopes'
  )

  const scopeResults = await Promise.all(
    multidb.scopes.map(async(scope) => {
      try {
        const collection = multidb.collection(scope, this.modelName)
        const scopedService = createScopedCrudService(this.crudService, collection)
        return await scopedService.patchMany(crudContext, commands, mongoQuery, stateArr)
      } catch (error) {
        log.error({ scope, error: error.message }, 'Multi-db patchMany failed for scope')
        return 0
      }
    })
  )

  return scopeResults.reduce((total, count) => total + count, 0)
}

/**
 * Multi-db PATCH bulk — fan-out across all target scopes.
 *
 * Runs patchBulk in each scope in parallel and sums the modifiedCount.
 * Deep-clones the filterUpdateCommands array for each scope to avoid
 * mutation issues (CrudService.patchBulk mutates commands in place).
 *
 * MUST be a regular function (not arrow) to preserve Fastify `this` binding.
 */
async function handleMultidbPatchBulk(request) {
  const { body: filterUpdateCommands, crudContext, headers, log } = request
  const {
    'x-scope': scopeFilter,
  } = headers

  const multidb = resolveMultidb(this.multidb, scopeFilter, log)

  log.debug(
    { collection: this.modelName, scopes: multidb.scopes },
    'Multi-db patchBulk: querying scopes'
  )

  const scopeResults = await Promise.all(
    multidb.scopes.map(async(scope) => {
      try {
        const collection = multidb.collection(scope, this.modelName)
        const scopedService = createScopedCrudService(this.crudService, collection)
        // Deep clone: patchBulk mutates filterUpdateCommands[].update in place
        const clonedCommands = JSON.parse(JSON.stringify(filterUpdateCommands))
        return await scopedService.patchBulk(
          crudContext,
          clonedCommands,
          this.queryParser,
          getEditableFields(headers[ACL_WRITE_COLUMNS], this.allFieldNames),
          headers[ACL_ROWS],
        )
      } catch (error) {
        log.error({ scope, error: error.message }, 'Multi-db patchBulk failed for scope')
        return 0
      }
    })
  )

  return scopeResults.reduce((total, count) => total + count, 0)
}

/**
 * Generic wrapper for write (and single-scope read) handlers in multi-db mode.
 *
 * Intercepts `this.crudService` via Proxy to redirect all MongoDB operations
 * to the collection of the scope specified in the `x-scope` header.
 *
 * The original handler runs unchanged — only the underlying collection
 * is swapped transparently through a Proxy chain:
 *   Fastify instance proxy  →  CrudService proxy  →  scoped MongoDB collection
 *
 * @param {Function} originalHandler - the original Fastify route handler
 * @returns {Function} wrapped handler with multi-db scope routing
 */
function wrapWriteHandler(originalHandler) {
  const wrappedName = `multidb_${originalHandler.name}`

  const descriptor = {
    async [wrappedName](request, reply) {
      const rawScope = (request.headers['x-scope']?.trim()) || this.multidb.defaultScope

      // Support sub@main format: extract physical scope for routing
      const { physical } = parseSubScope(rawScope)
      const scopeName = physical || rawScope

      if (!this.multidb.scopes.includes(scopeName)) {
        const available = this.multidb.scopes.join(', ')
        return reply.code(400).send({
          error: `Invalid scope: "${scopeName}". Available: ${available}`,
        })
      }

      request.log.debug(
        { scope: scopeName, collection: this.modelName },
        'Multi-db write: routing to scope'
      )

      const scopeCollection = this.multidb.collection(scopeName, this.modelName)
      const originalService = this.crudService

      // Proxy that redirects _mongoCollection to the scoped collection
      // and wraps cursor-returning methods (findAll, aggregate) to inject scope
      // into streamed documents (used by export and lookup handlers).
      const scopedService = new Proxy(originalService, {
        get(target, prop) {
          if (prop === '_mongoCollection') { return scopeCollection }

          // Wrap cursor-returning methods to inject scope into stream
          if (prop === 'findAll' || prop === 'aggregate') {
            return function cursorWithScope(...args) {
              const cursor = target[prop].apply(scopedService, args)
              return wrapCursorStreamWithScope(cursor, scopeName)
            }
          }

          return target[prop]
        },
      })

      // Proxy that redirects this.crudService to the scoped CrudService
      const scopedContext = new Proxy(this, {
        get(target, prop) {
          if (prop === 'crudService') { return scopedService }
          return target[prop]
        },
      })

      return originalHandler.call(scopedContext, request, reply)
    },
  }

  return descriptor[wrappedName]
}

module.exports = {
  handleMultidbGetList,
  handleMultidbCount,
  handleMultidbGetId,
  handleMultidbPatchId,
  handleMultidbPatchMany,
  handleMultidbPatchBulk,
  wrapWriteHandler,
  wrapCursorStreamWithScope,
  addScopeToResult,
  resolveMultidb,
  createScopedMultidb,
  createScopedCrudService,
  parseSubScope,
  parseSort,
  getEditableFields,
}
