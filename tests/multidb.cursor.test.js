'use strict'

const { test } = require('tap')
const { ObjectId } = require('mongodb')
const {
  encodeCursor,
  decodeCursor,
  buildKeysetFilter,
  computeNextPositions,
  serializeValue,
  deserializeValue,
  CursorError,
} = require('../lib/multidb/cursor')

test('cursor module', async(t) => {
  t.test('encodeCursor and decodeCursor roundtrip', async(t) => {
    const state = {
      sortField: 'createdAt',
      sortDir: -1,
      positions: {
        rome: { sortValue: '2024-01-15T10:00:00Z', _id: 'abc123' },
        milan: { sortValue: '2024-01-14T08:00:00Z', _id: 'def456' },
      },
    }

    const token = encodeCursor(state)
    t.type(token, 'string')
    t.ok(token.length > 0, 'token is not empty')

    const decoded = decodeCursor(token)
    t.equal(decoded.sortField, 'createdAt')
    t.equal(decoded.sortDir, -1)
    t.same(decoded.positions.rome, state.positions.rome)
    t.same(decoded.positions.milan, state.positions.milan)
  })

  t.test('decodeCursor rejects corrupted base64', async(t) => {
    t.throws(() => decodeCursor('!!!not-valid-base64!!!'), CursorError)
  })

  t.test('decodeCursor rejects invalid JSON in base64', async(t) => {
    const badToken = Buffer.from('not json').toString('base64url')
    t.throws(() => decodeCursor(badToken), CursorError)
  })

  t.test('decodeCursor rejects wrong version', async(t) => {
    const badVersion = Buffer.from(JSON.stringify({ v: 999 })).toString('base64url')
    t.throws(() => decodeCursor(badVersion), CursorError)
  })

  t.test('encodeCursor preserves filter and states in roundtrip', async(t) => {
    const state = {
      sortField: 'updatedAt',
      sortDir: 1,
      positions: {},
      filter: { status: 'active' },
      states: ['PUBLIC', 'DRAFT'],
    }

    const token = encodeCursor(state)
    const decoded = decodeCursor(token)

    t.same(decoded.filter, { status: 'active' })
    t.same(decoded.states, ['PUBLIC', 'DRAFT'])
  })
})

test('buildKeysetFilter', async(t) => {
  t.test('returns empty object for null position', async(t) => {
    const result = buildKeysetFilter(null, 'createdAt', -1)
    t.same(result, {})
  })

  t.test('returns empty object for undefined position', async(t) => {
    const result = buildKeysetFilter(undefined, 'createdAt', -1)
    t.same(result, {})
  })

  t.test('builds $lt filter for DESC sort', async(t) => {
    const position = { sortValue: '2024-01-15', _id: 'abc' }
    const result = buildKeysetFilter(position, 'createdAt', -1)

    t.same(result, {
      $or: [
        { createdAt: { $lt: '2024-01-15' } },
        { createdAt: '2024-01-15', _id: { $gt: 'abc' } },
      ],
    })
  })

  t.test('builds $gt filter for ASC sort', async(t) => {
    const position = { sortValue: 'Alice', _id: 'xyz' }
    const result = buildKeysetFilter(position, 'name', 1)

    t.same(result, {
      $or: [
        { name: { $gt: 'Alice' } },
        { name: 'Alice', _id: { $gt: 'xyz' } },
      ],
    })
  })
})

test('computeNextPositions', async(t) => {
  t.test('updates positions for scopes that contributed docs', async(t) => {
    const results = [
      { doc: { _id: '1', createdAt: '2024-01-10' }, scope: 'rome' },
      { doc: { _id: '2', createdAt: '2024-01-09' }, scope: 'milan' },
      { doc: { _id: '3', createdAt: '2024-01-08' }, scope: 'rome' },
    ]

    const positions = computeNextPositions(
      results,
      'createdAt',
      {},
      ['rome', 'milan', 'naples']
    )

    // rome: last doc was _id: 3
    t.same(positions.rome, { sortValue: '2024-01-08', _id: '3' })
    // milan: last doc was _id: 2
    t.same(positions.milan, { sortValue: '2024-01-09', _id: '2' })
    // naples: no docs, no previous position
    t.equal(positions.naples, null)
  })

  t.test('preserves previous position when scope has no new docs', async(t) => {
    const previousPositions = {
      naples: { sortValue: '2024-01-05', _id: 'prev1' },
    }

    const results = [
      { doc: { _id: '1', createdAt: '2024-01-10' }, scope: 'rome' },
    ]

    const positions = computeNextPositions(
      results,
      'createdAt',
      previousPositions,
      ['rome', 'naples']
    )

    t.same(positions.naples, { sortValue: '2024-01-05', _id: 'prev1' })
    t.same(positions.rome, { sortValue: '2024-01-10', _id: '1' })
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Type-preserving serialization (Date, ObjectId)
// ────────────────────────────────────────────────────────────────────────────

test('serializeValue / deserializeValue', async(t) => {
  t.test('Date → { $date } → Date roundtrip', async(t) => {
    const date = new Date('2025-12-31T09:53:21.283Z')
    const serialized = serializeValue(date)
    t.same(serialized, { $date: '2025-12-31T09:53:21.283Z' })
    const deserialized = deserializeValue(serialized)
    t.ok(deserialized instanceof Date)
    t.equal(deserialized.toISOString(), '2025-12-31T09:53:21.283Z')
  })

  t.test('ObjectId → { $oid } → ObjectId roundtrip', async(t) => {
    const oid = new ObjectId('507f1f77bcf86cd799439011')
    const serialized = serializeValue(oid)
    t.same(serialized, { $oid: '507f1f77bcf86cd799439011' })
    const deserialized = deserializeValue(serialized)
    t.ok(deserialized instanceof ObjectId)
    t.equal(deserialized.toHexString(), '507f1f77bcf86cd799439011')
  })

  t.test('plain string passes through unchanged', async(t) => {
    t.equal(serializeValue('hello'), 'hello')
    t.equal(deserializeValue('hello'), 'hello')
  })

  t.test('number passes through unchanged', async(t) => {
    t.equal(serializeValue(42), 42)
    t.equal(deserializeValue(42), 42)
  })

  t.test('null passes through unchanged', async(t) => {
    t.equal(serializeValue(null), null)
    t.equal(deserializeValue(null), null)
  })
})

test('encodeCursor/decodeCursor preserves Date and ObjectId types', async(t) => {
  const date = new Date('2025-06-15T12:30:00.000Z')
  const oid = new ObjectId('6939a5e3becbbda73d8ccdcd')

  const state = {
    sortField: 'updatedAt',
    sortDir: -1,
    positions: {
      tutor: { sortValue: date, _id: oid },
      quiperte: null,
    },
    filter: {},
    states: ['PUBLIC'],
  }

  const token = encodeCursor(state)
  const decoded = decodeCursor(token)

  t.equal(decoded.sortField, 'updatedAt')
  t.equal(decoded.sortDir, -1)

  // tutor position should be restored to native types
  const tutorPos = decoded.positions.tutor
  t.ok(tutorPos.sortValue instanceof Date, 'sortValue should be Date')
  t.equal(tutorPos.sortValue.toISOString(), '2025-06-15T12:30:00.000Z')
  t.ok(tutorPos._id instanceof ObjectId, '_id should be ObjectId')
  t.equal(tutorPos._id.toHexString(), '6939a5e3becbbda73d8ccdcd')

  // null position preserved
  t.equal(decoded.positions.quiperte, null)
})

test('buildKeysetFilter with native types produces correct MongoDB query', async(t) => {
  const date = new Date('2025-12-31T09:53:21.283Z')
  const oid = new ObjectId('6939a5e3becbbda73d8ccdcd')

  const position = { sortValue: date, _id: oid }
  const result = buildKeysetFilter(position, 'updatedAt', -1)

  t.same(result, {
    $or: [
      { updatedAt: { $lt: date } },
      { updatedAt: date, _id: { $gt: oid } },
    ],
  })

  // Verify the Date is a real Date object in the filter
  t.ok(result.$or[0].updatedAt.$lt instanceof Date)
  t.ok(result.$or[1]._id.$gt instanceof ObjectId)
})
