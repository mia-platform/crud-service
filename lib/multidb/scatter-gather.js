'use strict'

const { buildKeysetFilter, computeNextPositions, encodeCursor, decodeCursor, CursorError } = require('./cursor')

const DEFAULT_SORT_FIELD = 'createdAt'
const DEFAULT_SORT_DIR = -1
const MAX_PAGE_SIZE = 200

/**
 * Performs a scatter-gather query across all multi-db scopes with keyset pagination.
 *
 * Algorithm:
 * 1. Parse or initialize the cursor (first page has no cursor)
 * 2. For each entry (scope+subPartition), build a keyset-filtered query and run in parallel
 * 3. Merge-sort results from all entries
 * 4. Take first `limit` items
 * 5. Compute next cursor positions from emitted results
 * 6. Return results + encoded next cursor (null if no more data)
 *
 * Supports sub-partitions (sub@main format in x-scope) and cross-query overrides.
 * Each entry gets its own cursor position keyed by label (e.g., "programA@rome").
 *
 * @param {object} params
 * @param {object} params.multidb - The fastify.multidb decorator (with entries array)
 * @param {string} params.collectionName - MongoDB collection name
 * @param {object} params.filter - User-provided filter (already parsed)
 * @param {object|null} params.crossFilter - Alternative filter for cross-scope entries
 * @param {string} params.sortField - Field to sort by
 * @param {number} params.sortDir - 1 (ASC) or -1 (DESC)
 * @param {number} params.limit - Page size
 * @param {number} params.maxLimit - Maximum allowed page size (default: 200)
 * @param {object} params.projection - MongoDB projection
 * @param {string[]} params.states - Document states to include (__STATE__)
 * @param {string|null} params.cursorToken - Opaque cursor from previous page (null for first page)
 * @param {import('pino').Logger} params.log - Logger instance
 * @returns {Promise<{ data: object[], nextCursor: string|null, _meta: object }>}
 */
// eslint-disable-next-line max-statements
async function scatterGather({
  multidb,
  collectionName,
  filter = {},
  crossFilter = null,
  sortField = DEFAULT_SORT_FIELD,
  sortDir = DEFAULT_SORT_DIR,
  limit,
  maxLimit = MAX_PAGE_SIZE,
  projection = {},
  states = ['PUBLIC'],
  cursorToken = null,
  log,
}) {
  const effectiveLimit = Math.min(Math.max(limit, 1), maxLimit)

  // Resolve entries: use entries array (with sub-partition info) or fall back to plain scopes
  const entries = multidb.entries
    || multidb.scopes.map(sc => ({ physical: sc, sub: undefined, label: sc, isCross: false }))
  const entryLabels = entries.map(en => en.label)

  let positions = {}

  // If cursor is provided, decode and validate it
  if (cursorToken) {
    const decoded = decodeCursor(cursorToken)

    // Validate that sort parameters match — changing sort mid-pagination is not allowed
    if (decoded.sortField !== sortField || decoded.sortDir !== sortDir) {
      throw new CursorError('Sort parameters changed between pages. Start a new query.')
    }

    positions = decoded.positions || {}
  }

  // Build the state filter
  const stateFilter = states.length === 1
    ? { __STATE__: states[0] }
    : { __STATE__: { $in: states } }

  log.debug(
    { collectionName, scopes: entryLabels },
    'Scatter-gather: querying scopes'
  )

  // Scatter: query all entries in parallel
  const entryQueries = entries.map(async(entry) => {
    const collection = multidb.collection(entry.physical, collectionName)

    // Choose filter: cross-scope entries use crossFilter, others use normal filter
    const baseFilter = (entry.isCross && crossFilter) ? crossFilter : filter

    // Build subScope filter if entry has a sub-partition
    const subScopeFilter = entry.sub ? { subScope: entry.sub } : {}

    // Build keyset filter for this entry's cursor position
    const keysetFilter = buildKeysetFilter(positions[entry.label], sortField, sortDir)

    // Combine all filters
    const filterParts = [
      stateFilter,
      baseFilter,
      subScopeFilter,
      keysetFilter,
    ].filter(part => Object.keys(part).length > 0)

    // If $and has only one element, unwrap it
    const finalFilter = filterParts.length === 1
      ? filterParts[0]
      : { $and: filterParts }

    // Always include sort field and _id in projection for cursor computation
    const cursorProjection = { ...projection }
    if (Object.keys(cursorProjection).length > 0) {
      cursorProjection[sortField] = 1
      cursorProjection._id = 1
    }

    const sortConfig = { [sortField]: sortDir, _id: 1 }

    try {
      const docs = await collection
        .find(finalFilter)
        .project(cursorProjection)
        .sort(sortConfig)
        // fetch +1 to detect if entry has more data
        .limit(effectiveLimit + 1)
        .toArray()

      return {
        label: entry.label,
        physical: entry.physical,
        sub: entry.sub,
        docs,
        hasMore: docs.length > effectiveLimit,
        error: null,
      }
    } catch (error) {
      log.error(
        { scope: entry.label, collectionName, error: error.message },
        'Multi-db scope query failed'
      )
      return {
        label: entry.label,
        physical: entry.physical,
        sub: entry.sub,
        docs: [],
        hasMore: false,
        error: error.message,
      }
    }
  })

  const entryResults = await Promise.all(entryQueries)

  // Gather: report degraded entries
  const degradedScopes = entryResults
    .filter(result => result.error !== null)
    .map(result => result.label)

  // Merge: combine all docs with entry tag, then sort
  const taggedDocs = []
  for (const result of entryResults) {
    // Only take up to effectiveLimit docs per entry (discard the +1)
    const docsToMerge = result.docs.slice(0, effectiveLimit)
    for (const doc of docsToMerge) {
      taggedDocs.push({
        doc,
        scope: result.label,
        physical: result.physical,
        sub: result.sub,
      })
    }
  }

  // Merge sort by (sortField, _id) using the same direction
  taggedDocs.sort((itemA, itemB) => {
    const aVal = itemA.doc[sortField]
    const bVal = itemB.doc[sortField]

    const cmp = compareValues(aVal, bVal)
    if (cmp !== 0) {
      return sortDir === -1 ? -cmp : cmp
    }

    // Tie-breaker: _id ascending (deterministic)
    const aId = String(itemA.doc._id)
    const bId = String(itemB.doc._id)
    if (aId < bId) { return -1 }
    if (aId > bId) { return 1 }
    return 0
  })

  // Take the first `effectiveLimit` items
  const emitted = taggedDocs.slice(0, effectiveLimit)

  // Determine if there's a next page
  // There's more data if: any entry had more docs OR we had to truncate the merged results
  const anyMoreInEntries = entryResults.some(result => result.hasMore)
  const mergedHadMore = taggedDocs.length > effectiveLimit
  const hasNextPage = anyMoreInEntries || mergedHadMore

  // Compute next cursor (using entry labels for position keys)
  let nextCursor = null
  if (hasNextPage && emitted.length > 0) {
    const nextPositions = computeNextPositions(emitted, sortField, positions, entryLabels)
    nextCursor = encodeCursor({
      sortField,
      sortDir,
      positions: nextPositions,
      filter,
      states,
    })
  }

  // Build response: database = physical scope, subScope added when present
  const data = emitted.map(({ doc, physical, sub }) => ({
    ...doc,
    database: physical,
    ...(sub && { subScope: sub }),
  }))

  return {
    data,
    nextCursor,
    _meta: {
      scopes: entries.length,
      degradedScopes,
      pageSize: effectiveLimit,
      hasNextPage,
    },
  }
}

/**
 * Compare two values generically for sorting.
 * Handles strings, numbers, dates, and nulls.
 *
 * @param {*} a
 * @param {*} b
 * @returns {number} -1, 0, or 1
 */
function compareValues(valA, valB) {
  // Handle nulls/undefined — push them to the end
  if (valA === null || valA === undefined) {
    if (valB === null || valB === undefined) {
      return 0
    }
    return 1
  }
  if (valB === null || valB === undefined) { return -1 }

  // Dates
  if (valA instanceof Date && valB instanceof Date) {
    return valA.getTime() - valB.getTime()
  }

  // Convert date strings for comparison
  if (typeof valA === 'string' && typeof valB === 'string') {
    if (valA < valB) { return -1 }
    if (valA > valB) { return 1 }
    return 0
  }

  // Numbers
  if (typeof valA === 'number' && typeof valB === 'number') {
    return valA - valB
  }

  // Fallback: coerce to string
  const strA = String(valA)
  const strB = String(valB)
  if (strA < strB) { return -1 }
  if (strA > strB) { return 1 }
  return 0
}

/**
 * Counts documents across all multi-db scopes/entries.
 * Supports sub-partitions and cross-query overrides.
 *
 * @param {object} params
 * @param {object} params.multidb
 * @param {string} params.collectionName
 * @param {object} params.filter
 * @param {object|null} params.crossFilter - Alternative filter for cross-scope entries
 * @param {string[]} params.states
 * @param {import('pino').Logger} params.log
 * @returns {Promise<{ totalCount: number, countByScope: object }>}
 */
async function scatterCount({
  multidb,
  collectionName,
  filter = {},
  crossFilter = null,
  states = ['PUBLIC'],
  log,
}) {
  // Resolve entries: use entries array (with sub-partition info) or fall back to plain scopes
  const entries = multidb.entries
    || multidb.scopes.map(sc => ({ physical: sc, sub: undefined, label: sc, isCross: false }))

  const stateFilter = states.length === 1
    ? { __STATE__: states[0] }
    : { __STATE__: { $in: states } }

  const countPromises = entries.map(async(entry) => {
    const collection = multidb.collection(entry.physical, collectionName)

    // Choose filter: cross-scope entries use crossFilter, others use normal filter
    const baseFilter = (entry.isCross && crossFilter) ? crossFilter : filter

    // Build subScope filter if entry has a sub-partition
    const subScopeFilter = entry.sub ? { subScope: entry.sub } : {}

    const filterParts = [
      stateFilter,
      baseFilter,
      subScopeFilter,
    ].filter(part => Object.keys(part).length > 0)

    const combinedFilter = filterParts.length === 1
      ? filterParts[0]
      : { $and: filterParts }

    try {
      const count = await collection.countDocuments(combinedFilter)
      return { label: entry.label, count, error: null }
    } catch (error) {
      log.error({ scope: entry.label, collectionName, error: error.message }, 'Multi-db count failed for scope')
      return { label: entry.label, count: 0, error: error.message }
    }
  })

  const results = await Promise.all(countPromises)

  const countByScope = {}
  let totalCount = 0
  for (const { label, count } of results) {
    countByScope[label] = count
    totalCount += count
  }

  const degradedScopes = results
    .filter(result => result.error !== null)
    .map(result => result.label)

  return {
    totalCount,
    countByScope,
    _meta: {
      degradedScopes,
    },
  }
}

module.exports = {
  scatterGather,
  scatterCount,
  compareValues,
  DEFAULT_SORT_FIELD,
  DEFAULT_SORT_DIR,
  MAX_PAGE_SIZE,
}
