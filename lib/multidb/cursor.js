'use strict'

const { ObjectId } = require('mongodb')

const CURSOR_VERSION = 2

class CursorError extends Error {
  constructor(message) {
    super(message)
    this.name = 'CursorError'
    this.statusCode = 400
  }
}

/**
 * Serialize a value to a JSON-safe representation that preserves MongoDB types.
 * Uses EJSON-style markers: { $date: iso }, { $oid: hex }.
 *
 * @param {*} val
 * @returns {*} JSON-safe value
 */
function serializeValue(val) {
  if (val instanceof Date) {
    return { $date: val.toISOString() }
  }
  if (val && typeof val === 'object' && typeof val.toHexString === 'function') {
    // ObjectId, Decimal128, or other BSON types with toHexString
    return { $oid: val.toHexString() }
  }
  return val
}

/**
 * Deserialize a JSON-safe value back to its native MongoDB type.
 * Recognizes { $date: ... } and { $oid: ... } markers.
 *
 * @param {*} val
 * @returns {*} Native value (Date, ObjectId, or primitive)
 */
function deserializeValue(val) {
  if (val && typeof val === 'object') {
    if (val.$date) { return new Date(val.$date) }
    if (val.$oid) { return new ObjectId(val.$oid) }
  }
  return val
}

/**
 * Serialize a positions object, converting typed values within each entry.
 * @param {object} positions - { [scope]: { sortValue, _id } | null }
 * @returns {object}
 */
function serializePositions(positions) {
  if (!positions) { return positions }
  const result = {}
  for (const [key, pos] of Object.entries(positions)) {
    if (pos === null || pos === undefined) {
      result[key] = pos
      continue
    }
    result[key] = {
      sortValue: serializeValue(pos.sortValue),
      _id: serializeValue(pos._id),
    }
  }
  return result
}

/**
 * Deserialize a positions object, restoring typed values.
 * @param {object} positions
 * @returns {object}
 */
function deserializePositions(positions) {
  if (!positions) { return positions }
  const result = {}
  for (const [key, pos] of Object.entries(positions)) {
    if (pos === null || pos === undefined) {
      result[key] = pos
      continue
    }
    result[key] = {
      sortValue: deserializeValue(pos.sortValue),
      _id: deserializeValue(pos._id),
    }
  }
  return result
}

/**
 * Encodes a cursor state into an opaque base64url token.
 *
 * Cursor state shape:
 * {
 *   sortField: string,
 *   sortDir: 1 | -1,
 *   positions: {
 *     [scope: string]: { sortValue: any, _id: any } | null
 *   }
 * }
 *
 * @param {object} state - Cursor state
 * @returns {string} Opaque cursor token (base64url)
 */
function encodeCursor(state) {
  const envelope = {
    v: CURSOR_VERSION,
    ...state,
    positions: serializePositions(state.positions),
  }
  return Buffer.from(JSON.stringify(envelope)).toString('base64url')
}

/**
 * Decodes an opaque base64url cursor token.
 *
 * @param {string} token - The opaque cursor token
 * @returns {object} Decoded cursor state
 * @throws {CursorError} If the token is malformed or has wrong version
 */
function decodeCursor(token) {
  let decoded
  try {
    decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'))
  } catch {
    throw new CursorError('Corrupted cursor payload')
  }

  // Accept both v1 (legacy, plain strings) and v2 (typed EJSON markers)
  if (decoded.v !== CURSOR_VERSION && decoded.v !== 1) {
    throw new CursorError(`Unsupported cursor version: ${decoded.v}`)
  }

  return {
    sortField: decoded.sortField,
    sortDir: decoded.sortDir,
    positions: deserializePositions(decoded.positions),
    filter: decoded.filter || {},
    states: decoded.states,
  }
}

/**
 * Builds the keyset filter condition for a specific scope, given the cursor position.
 * This enables efficient, deterministic pagination without skip/offset.
 *
 * For DESC sort: (sortField < lastSortValue) OR (sortField == lastSortValue AND _id > lastId)
 * For ASC sort:  (sortField > lastSortValue) OR (sortField == lastSortValue AND _id > lastId)
 *
 * @param {object} position - { sortValue, _id }
 * @param {string} sortField - The field used for sorting
 * @param {number} sortDir - 1 for ASC, -1 for DESC
 * @returns {object} MongoDB query filter
 */
function buildKeysetFilter(position, sortField, sortDir) {
  if (!position) {
    return {}
  }

  const { sortValue, _id } = position
  const comparator = sortDir === -1 ? '$lt' : '$gt'

  return {
    $or: [
      { [sortField]: { [comparator]: sortValue } },
      {
        [sortField]: sortValue,
        _id: { $gt: _id },
      },
    ],
  }
}

/**
 * Computes the new cursor positions from the emitted results.
 * For each scope that contributed documents to this page, records the last
 * sortValue and _id so the next page can resume from there.
 *
 * @param {Array} results - Array of { doc, scope } items emitted in this page
 * @param {string} sortField - The field used for sorting
 * @param {object} previousPositions - Positions from the previous cursor
 * @param {string[]} scopes - All active scopes
 * @returns {object} New positions keyed by scope
 */
function computeNextPositions(results, sortField, previousPositions, scopes) {
  const nextPositions = {}

  for (const scope of scopes) {
    // Find the last document from this scope in the emitted results
    const scopeDocs = results.filter(result => result.scope === scope)
    if (scopeDocs.length > 0) {
      const lastDoc = scopeDocs[scopeDocs.length - 1].doc
      // Values are stored as-is here; serializePositions in encodeCursor
      // will convert Date/ObjectId to EJSON markers for safe JSON transport.
      nextPositions[scope] = {
        sortValue: lastDoc[sortField],
        _id: lastDoc._id,
      }
    } else {
      // Scope didn't contribute to this page — keep previous position
      nextPositions[scope] = previousPositions[scope] || null
    }
  }

  return nextPositions
}

module.exports = {
  encodeCursor,
  decodeCursor,
  buildKeysetFilter,
  computeNextPositions,
  serializeValue,
  deserializeValue,
  serializePositions,
  deserializePositions,
  CursorError,
}
