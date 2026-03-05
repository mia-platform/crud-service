'use strict'

/**
 * MongoDB-backed cursor cache for multi-db keyset pagination.
 *
 * Stores opaque cursor tokens in a MongoDB collection (on the DEFAULT_SCOPE database)
 * with MongoDB-native TTL expiration (expireAfterSeconds: 0 on the `expireAt` field).
 *
 * The collection name is configurable via the `CURSOR_CACHE_COLLECTION` env var
 * (default: `_multidb_cursors`). The collection **must** already have a TTL index
 * on the `expireAt` field — the cache does NOT create indexes at startup.
 *
 * Cache key format:
 *   cursor:{collection}:{scope}:{sort}:{filter}:{state}:p{page}
 *
 */

/**
 * Build a deterministic cache key from query parameters.
 *
 * @param {string} collection - Collection name
 * @param {string|undefined} scopeFilter - x-scope header value (or undefined for default)
 * @param {string|undefined} sortQuery - _s query param (e.g. "-createdAt")
 * @param {string|undefined} filterQuery - _q query param (raw JSON string)
 * @param {string|undefined} stateQuery - _st query param (e.g. "PUBLIC")
 * @param {number} page - Page number (0-based)
 * @returns {{ cacheKey: string, prevKey: string|null }}
 */
function buildCacheKey(collection, scopeFilter, sortQuery, filterQuery, stateQuery, page) {
  const scope = scopeFilter || 'default'
  const sort = sortQuery || '-createdAt'
  const filter = filterQuery || '{}'
  const state = stateQuery || 'PUBLIC'
  const base = `cursor:${collection}:${scope}:${sort}:${filter}:${state}`
  return {
    cacheKey: `${base}:p${page}`,
    prevKey: page > 0 ? `${base}:p${page - 1}` : null,
  }
}

/**
 * Create a MongoDB-backed cursor cache from a pre-configured collection.
 *
 * The collection MUST already have a TTL index on the `expireAt` field:
 *
 * @param {import('mongodb').Collection} collection - The MongoDB collection to use as cache
 * @returns {object} Cache interface { get, set }
 */
function createCursorCache(collection) {
  return {

    /**
     * Get a cursor token by cache key.
     * @param {string} key
     * @returns {Promise<string|null>}
     */
    async get(key) {
      const doc = await collection.findOne({ _id: key })
      if (!doc) { return null }
      return doc.cursor
    },

    /**
     * Store a cursor token with TTL.
     * @param {string} key
     * @param {string} cursor - Opaque cursor token
     * @param {number} ttlSeconds - Time-to-live in seconds
     */
    async set(key, cursor, ttlSeconds) {
      const expireAt = new Date(Date.now() + (ttlSeconds * 1000))
      await collection.updateOne(
        { _id: key },
        { $set: { cursor, expireAt } },
        { upsert: true }
      )
    },
  }
}

/**
 * Rebuild the cursor chain from page 0 up to targetPage by replaying queries.
 * Each intermediate cursor is cached so subsequent requests don't need a full replay.
 *
 * This is the fallback when a cursor is not found in MongoDB cache (e.g. TTL expired)
 * but the page is within MAX_REBUILD_PAGES.
 *
 * @param {Function} scatterGatherFn - The scatterGather function to execute queries
 * @param {object} params
 * @returns {Promise<string|null>} Cursor token for the target page, or null on failure
 */
async function rebuildCursorChain(scatterGatherFn, {
  multidb,
  collectionName,
  filter,
  crossFilter,
  sortField,
  sortDir,
  limit,
  projection,
  states,
  scopeFilter,
  sortQuery,
  filterQuery,
  stateQuery,
  targetPage,
  cursorCache,
  cursorTTL,
  log,
}) {
  let cursor = null

  // Sequential replay is intentional – each page depends on the previous cursor
  for (let pg = 0; pg < targetPage; pg++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await scatterGatherFn({
        multidb,
        collectionName,
        filter,
        crossFilter,
        sortField,
        sortDir,
        limit,
        projection,
        states,
        cursorToken: cursor,
        log,
      })

      cursor = result.nextCursor
      if (!cursor) { break }

      // Cache intermediate cursor
      const { cacheKey } = buildCacheKey(
        collectionName, scopeFilter, sortQuery, filterQuery, stateQuery, pg
      )
      // eslint-disable-next-line no-await-in-loop
      await cursorCache.set(cacheKey, cursor, cursorTTL)
    } catch (error) {
      log.error(
        { error: error.message, page: pg, collectionName },
        'Failed to rebuild cursor chain'
      )
      return null
    }
  }

  return cursor
}

module.exports = {
  createCursorCache,
  buildCacheKey,
  rebuildCursorChain,
}
