'use strict'

const {
  UPDATERID,
  UPDATEDAT,
  CREATORID,
  CREATEDAT,
  __STATE__,
} = require('../consts')

const INTERNAL_FIELDS = [UPDATERID, UPDATEDAT, CREATORID, CREATEDAT, __STATE__]

/**
 * Replicate getEditableFields from httpInterface.js.
 * Filters out internal fields from ACL write columns.
 */
function getEditableFields(aclWriteColumns, allFieldNames) {
  const editableFields = aclWriteColumns ? aclWriteColumns.split(',') : allFieldNames
  return editableFields.filter(ef => !INTERNAL_FIELDS.includes(ef))
}

/**
 * Parse a raw scope string into its physical (main) and optional logical sub-partition.
 * Format: "sub@main" or just "main".
 * Example: "programA@rome" → { physical: "rome", sub: "programA" }
 *          "rome"          → { physical: "rome", sub: undefined }
 *
 * @param {string} rawScope
 * @returns {{ physical: string, sub: string|undefined }}
 */
function parseSubScope(rawScope) {
  const trimmed = (rawScope || '').trim()
  if (!trimmed) { return { physical: '', sub: undefined } }
  const atIndex = trimmed.indexOf('@')
  if (atIndex >= 0) {
    return {
      physical: trimmed.substring(atIndex + 1).trim(),
      sub: trimmed.substring(0, atIndex).trim() || undefined,
    }
  }
  return { physical: trimmed, sub: undefined }
}

/**
 * Parse sort query string into sortField and sortDir.
 * Format: "-createdAt" → DESC, "name" → ASC.
 *
 * @param {string|undefined} sortQuery
 * @returns {{ sortField: string, sortDir: 1|-1 }}
 */
function parseSort(sortQuery) {
  if (!sortQuery) {
    return { sortField: 'createdAt', sortDir: -1 }
  }

  const sortString = sortQuery.toString()
  if (sortString.startsWith('-')) {
    return { sortField: sortString.slice(1), sortDir: -1 }
  }
  return { sortField: sortString, sortDir: 1 }
}

/**
 * Create a scoped view of multidb limited to a subset of scopes.
 * Parses "sub@main" format in scope entries:
 *   "programA@rome" → physical "rome", sub "programA".
 * Builds an `entries` array where each entry tracks its physical scope,
 * sub-partition, label, and cross status.
 *
 * Invalid physical scopes are logged as warnings and ignored.
 * If no valid scope is found, falls back to all scopes.
 *
 * @param {object} multidb
 * @param {string[]} requestedScopes - Raw scope strings (may contain sub@main)
 * @param {import('pino').Logger} log
 * @param {string[]} [crossScopesList=[]] - Raw scope strings marked as cross
 * @returns {object} Scoped multidb with `entries` array
 */
function createScopedMultidb(multidb, requestedScopes, log, crossScopesList = []) {
  const crossSet = new Set(crossScopesList.map(sc => sc.trim()).filter(Boolean))

  const entries = []
  const physicalScopeSet = new Set()
  const invalidScopes = []

  for (const rawScope of requestedScopes) {
    const trimmed = rawScope.trim()
    if (!trimmed) { continue }

    const { physical, sub } = parseSubScope(trimmed)
    if (!physical || !multidb.scopes.includes(physical)) {
      invalidScopes.push(trimmed)
      continue
    }
    physicalScopeSet.add(physical)

    const label = sub ? `${sub}@${physical}` : physical
    const isCross = crossSet.has(trimmed)

    entries.push({ physical, sub, label, isCross })
  }

  if (invalidScopes.length > 0) {
    log.warn({ invalidScopes }, 'Requested scopes not found in configuration')
  }

  if (physicalScopeSet.size === 0) {
    log.warn('No valid scopes in request, falling back to all scopes')
    return {
      ...multidb,
      entries: multidb.scopes.map(sc => ({
        physical: sc, sub: undefined, label: sc, isCross: false,
      })),
    }
  }

  const validScopes = [...physicalScopeSet]

  return {
    ...multidb,
    scopes: validScopes,
    entries,
    allCollections(collectionName) {
      return validScopes.map(scope => ({
        scope,
        collection: multidb.dbs[scope].collection(collectionName),
      }))
    },
  }
}

/**
 * Resolve the multidb object, optionally narrowing to requested scopes.
 * When no scopeFilter is provided, defaults to DEFAULT_SCOPE only.
 *
 * Supports "sub@main" format in scopeFilter for sub-partition filtering.
 * Supports crossScopeFilter to mark specific entries for cross-query handling.
 *
 * @param {object} fastifyMultidb
 * @param {string|undefined} scopeFilter - comma-separated scope names
 * @param {import('pino').Logger} log
 * @param {string|undefined} crossScopeFilter - comma-separated cross-scope names
 * @returns {object}
 */
function resolveMultidb(fastifyMultidb, scopeFilter, log, crossScopeFilter) {
  const crossScopesList = crossScopeFilter
    ? crossScopeFilter.split(',')
      .map(sc => sc.trim())
      .filter(Boolean)
    : []

  if (!scopeFilter) {
    return createScopedMultidb(
      fastifyMultidb, [fastifyMultidb.defaultScope], log, crossScopesList
    )
  }

  const requestedScopes = scopeFilter
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)

  return createScopedMultidb(fastifyMultidb, requestedScopes, log, crossScopesList)
}

/**
 * Create a Proxy on CrudService redirecting _mongoCollection to a scope's collection.
 * @param {object} crudService - original CrudService instance
 * @param {import('mongodb').Collection} scopeCollection - target collection
 * @returns {Proxy}
 */
function createScopedCrudService(crudService, scopeCollection) {
  return new Proxy(crudService, {
    get(target, prop) {
      if (prop === '_mongoCollection') { return scopeCollection }
      return target[prop]
    },
  })
}

/**
 * Wrap a MongoDB cursor so that its .stream() transform injects
 * the `database` field into every emitted document.
 * Used by export and lookup streaming handlers.
 *
 * @param {import('mongodb').FindCursor} cursor
 * @param {string} database - scope/database name to inject
 * @returns {import('mongodb').FindCursor} same cursor with wrapped .stream()
 */
function wrapCursorStreamWithScope(cursor, database) {
  const originalStream = cursor.stream.bind(cursor)
  cursor.stream = function stream(opts = {}) {
    const userTransform = opts.transform
    return originalStream({
      ...opts,
      transform: (doc) => {
        const base = userTransform ? userTransform(doc) : doc
        return { ...base, database }
      },
    })
  }
  return cursor
}

/**
 * Add `database` field to handler results that are documents or arrays of documents.
 * Skips non-document results (numbers, undefined, reply objects, etc.).
 *
 * @param {*} result - handler return value
 * @param {string} database - scope/database name
 * @param {import('fastify').FastifyReply} reply - to detect reply objects
 * @returns {*} result with database injected where appropriate
 */
function addScopeToResult(result, database, reply) {
  if (result === reply || result === null || result === undefined) { return result }
  if (typeof result !== 'object') { return result }

  if (Array.isArray(result)) {
    return result.map((item) => {
      if (item && typeof item === 'object') { return { ...item, database } }
      return item
    })
  }

  return { ...result, database }
}

module.exports = {
  getEditableFields,
  parseSubScope,
  parseSort,
  createScopedMultidb,
  resolveMultidb,
  createScopedCrudService,
  wrapCursorStreamWithScope,
  addScopeToResult,
}
