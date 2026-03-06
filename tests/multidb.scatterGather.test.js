'use strict'

const { test } = require('tap')
const { scatterGather, scatterCount, compareValues } = require('../lib/multidb/scatter-gather')
const { encodeCursor } = require('../lib/multidb/cursor')

/**
 * Creates a mock multidb object with in-memory data per scope.
 * Each scope has a "collection" that supports find().project().sort().limit().toArray()
 * and countDocuments().
 *
 * Optionally accepts `entries` to test sub-partition and cross-query logic.
 */
function createMockMultidb(scopeData, entries) {
  const scopes = Object.keys(scopeData)
  const dbs = {}

  for (const scope of scopes) {
    dbs[scope] = {
      collection(collectionName) {
        return createMockCollection(scopeData[scope][collectionName] || [])
      },
    }
  }

  return {
    scopes,
    dbs,
    ...(entries ? { entries } : {}),
    collection(scope, collectionName) {
      return dbs[scope].collection(collectionName)
    },
    allCollections(collectionName) {
      return scopes.map(scope => ({
        scope,
        collection: dbs[scope].collection(collectionName),
      }))
    },
  }
}

function createMockCollection(docs) {
  let currentFilter = {}
  let currentProjection = {}
  let currentSort = {}
  let currentLimit = Infinity

  function matchesFilter(doc, filter) {
    if (!filter || Object.keys(filter).length === 0) {
      return true
    }

    if (filter.$and) {
      return filter.$and.every(sub => matchesFilter(doc, sub))
    }
    if (filter.$or) {
      return filter.$or.some(sub => matchesFilter(doc, sub))
    }
    if (filter.$in) {
      return filter.$in.includes(doc)
    }

    for (const [key, val] of Object.entries(filter)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const docVal = doc[key]
        if ('$lt' in val && !(docVal < val.$lt)) {
          return false
        }
        if ('$gt' in val && !(docVal > val.$gt)) {
          return false
        }
        if ('$lte' in val && !(docVal <= val.$lte)) {
          return false
        }
        if ('$gte' in val && !(docVal >= val.$gte)) {
          return false
        }
        if ('$in' in val && !val.$in.includes(docVal)) {
          return false
        }
      } else if (doc[key] !== val) {
        return false
      }
    }
    return true
  }

  const chainable = {
    find(filter) {
      currentFilter = filter
      return chainable
    },
    project(proj) {
      currentProjection = proj
      return chainable
    },
    sort(sort) {
      currentSort = sort
      return chainable
    },
    limit(lim) {
      currentLimit = lim
      return chainable
    },
    async toArray() {
      let results = docs.filter(doc => matchesFilter(doc, currentFilter))

      // Sort
      if (currentSort && Object.keys(currentSort).length > 0) {
        const sortEntries = Object.entries(currentSort)
        results.sort((itemA, itemB) => {
          for (const [field, dir] of sortEntries) {
            const aVal = itemA[field]
            const bVal = itemB[field]
            if (aVal < bVal) {
              return -1 * Number(dir)
            }
            if (aVal > bVal) {
              return 1 * Number(dir)
            }
          }
          return 0
        })
      }

      // Limit
      if (currentLimit < Infinity) {
        results = results.slice(0, currentLimit)
      }

      // Reset for next query
      currentFilter = {}
      currentProjection = {}
      currentSort = {}
      currentLimit = Infinity

      return results
    },
    async countDocuments(filter) {
      return docs.filter(doc => matchesFilter(doc, filter || {})).length
    },
  }

  return chainable
}

// ─── Test Data ───────────────────────────────────────────────────────────

const ROME_DOCS = [
  { _id: 'r1', name: 'Roma A', createdAt: '2024-01-15', __STATE__: 'PUBLIC' },
  { _id: 'r2', name: 'Roma B', createdAt: '2024-01-13', __STATE__: 'PUBLIC' },
  { _id: 'r3', name: 'Roma C', createdAt: '2024-01-11', __STATE__: 'PUBLIC' },
  { _id: 'r4', name: 'Roma D', createdAt: '2024-01-09', __STATE__: 'DRAFT' },
]

const MILAN_DOCS = [
  { _id: 'm1', name: 'Milan A', createdAt: '2024-01-14', __STATE__: 'PUBLIC' },
  { _id: 'm2', name: 'Milan B', createdAt: '2024-01-12', __STATE__: 'PUBLIC' },
  { _id: 'm3', name: 'Milan C', createdAt: '2024-01-10', __STATE__: 'PUBLIC' },
]

const NAPLES_DOCS = [
  { _id: 'n1', name: 'Naples A', createdAt: '2024-01-16', __STATE__: 'PUBLIC' },
  { _id: 'n2', name: 'Naples B', createdAt: '2024-01-08', __STATE__: 'PUBLIC' },
]

const mockLog = {
  debug() { /* noop */ },
  info() { /* noop */ },
  warn() { /* noop */ },
  error() { /* noop */ },
}

test('scatterGather', async(t) => {
  t.test('first page returns correctly merged and sorted results', async(t) => {
    const multidb = createMockMultidb({
      rome: { tickets: ROME_DOCS },
      milan: { tickets: MILAN_DOCS },
      naples: { tickets: NAPLES_DOCS },
    })

    const result = await scatterGather({
      multidb,
      collectionName: 'tickets',
      sortField: 'createdAt',
      sortDir: -1,
      limit: 5,
      log: mockLog,
    })

    t.equal(result.data.length, 5)
    t.ok(result.nextCursor, 'should have a next cursor')
    // eslint-disable-next-line no-underscore-dangle
    t.equal(result._meta.hasNextPage, true)

    // Verify sorted order: DESC by createdAt
    const dates = result.data.map(d => d.createdAt)
    for (let i = 1; i < dates.length; i++) {
      t.ok(dates[i] <= dates[i - 1], `${dates[i]} <= ${dates[i - 1]}`)
    }

    // First item should be Naples A (2024-01-16)
    t.equal(result.data[0].database, 'naples')
    t.equal(result.data[0].name, 'Naples A')
  })

  t.test('second page using cursor continues correctly', async(t) => {
    const multidb = createMockMultidb({
      rome: { tickets: ROME_DOCS },
      milan: { tickets: MILAN_DOCS },
      naples: { tickets: NAPLES_DOCS },
    })

    // Get first page
    const page1 = await scatterGather({
      multidb,
      collectionName: 'tickets',
      sortField: 'createdAt',
      sortDir: -1,
      limit: 4,
      log: mockLog,
    })

    t.ok(page1.nextCursor, 'page1 should have next cursor')

    // Get second page
    const page2 = await scatterGather({
      multidb,
      collectionName: 'tickets',
      sortField: 'createdAt',
      sortDir: -1,
      limit: 4,
      cursorToken: page1.nextCursor,
      log: mockLog,
    })

    t.ok(page2.data.length > 0, 'page2 should have results')

    // No document from page1 should appear in page2
    const page1Ids = new Set(page1.data.map(d => d._id))
    for (const doc of page2.data) {
      t.notOk(page1Ids.has(doc._id), `${doc._id} should not be duplicated`)
    }
  })

  t.test('respects states filter', async(t) => {
    const multidb = createMockMultidb({
      rome: { tickets: ROME_DOCS },
    })

    const result = await scatterGather({
      multidb,
      collectionName: 'tickets',
      states: ['DRAFT'],
      limit: 10,
      log: mockLog,
    })

    t.equal(result.data.length, 1)
    t.equal(result.data[0].name, 'Roma D')
  })

  t.test('returns empty for non-existent collection', async(t) => {
    const multidb = createMockMultidb({
      rome: { tickets: ROME_DOCS },
    })

    const result = await scatterGather({
      multidb,
      collectionName: 'nonexistent',
      limit: 10,
      log: mockLog,
    })

    t.equal(result.data.length, 0)
    t.equal(result.nextCursor, null)
  })

  t.test('each result includes scope field', async(t) => {
    const multidb = createMockMultidb({
      rome: { tickets: ROME_DOCS },
      milan: { tickets: MILAN_DOCS },
    })

    const result = await scatterGather({
      multidb,
      collectionName: 'tickets',
      limit: 10,
      log: mockLog,
    })

    for (const doc of result.data) {
      t.ok(doc.database, 'database must be present')
      t.ok(['rome', 'milan'].includes(doc.database), `database must be rome or milan, got ${doc.database}`)
    }
  })

  t.test('limits page size to MAX_PAGE_SIZE', async(t) => {
    const multidb = createMockMultidb({
      rome: { tickets: ROME_DOCS },
    })

    const result = await scatterGather({
      multidb,
      collectionName: 'tickets',
      limit: 99999,
      log: mockLog,
    })

    // Should be capped at 200 (MAX_PAGE_SIZE) but we only have a few docs
    // eslint-disable-next-line no-underscore-dangle
    t.ok(result._meta.pageSize <= 200)
  })

  t.test('rejects cursor with mismatched sort params', async(t) => {
    const fakeCursor = encodeCursor({
      sortField: 'name',
      sortDir: 1,
      positions: {},
    })

    const multidb = createMockMultidb({
      rome: { tickets: ROME_DOCS },
    })

    try {
      await scatterGather({
        multidb,
        collectionName: 'tickets',
        sortField: 'createdAt',
        sortDir: -1,
        cursorToken: fakeCursor,
        log: mockLog,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.match(error.message, /Sort parameters changed/)
    }
  })
})

test('scatterCount', async(t) => {
  t.test('counts across all scopes', async(t) => {
    const multidb = createMockMultidb({
      rome: { tickets: ROME_DOCS },
      milan: { tickets: MILAN_DOCS },
      naples: { tickets: NAPLES_DOCS },
    })

    const result = await scatterCount({
      multidb,
      collectionName: 'tickets',
      states: ['PUBLIC'],
      log: mockLog,
    })

    // rome: 3 PUBLIC, milan: 3 PUBLIC, naples: 2 PUBLIC = 8
    t.equal(result.totalCount, 8)
    t.equal(result.countByScope.rome, 3)
    t.equal(result.countByScope.milan, 3)
    t.equal(result.countByScope.naples, 2)
  })

  t.test('respects filter', async(t) => {
    const multidb = createMockMultidb({
      rome: { tickets: ROME_DOCS },
    })

    const result = await scatterCount({
      multidb,
      collectionName: 'tickets',
      filter: { name: 'Roma A' },
      states: ['PUBLIC'],
      log: mockLog,
    })

    t.equal(result.totalCount, 1)
  })
})

test('compareValues', async(t) => {
  t.test('compares numbers', async(t) => {
    t.ok(compareValues(1, 2) < 0)
    t.ok(compareValues(3, 1) > 0)
    t.equal(compareValues(5, 5), 0)
  })

  t.test('compares strings', async(t) => {
    t.ok(compareValues('a', 'b') < 0)
    t.ok(compareValues('z', 'a') > 0)
    t.equal(compareValues('hello', 'hello'), 0)
  })

  t.test('handles nulls', async(t) => {
    t.ok(compareValues(null, 'a') > 0, 'null pushed to end')
    t.ok(compareValues('a', null) < 0, 'non-null comes first')
    t.equal(compareValues(null, null), 0)
    t.equal(compareValues(undefined, undefined), 0)
  })

  t.test('compares dates', async(t) => {
    const d1 = new Date('2024-01-01')
    const d2 = new Date('2024-06-01')
    t.ok(compareValues(d1, d2) < 0)
    t.ok(compareValues(d2, d1) > 0)
    t.equal(compareValues(d1, new Date('2024-01-01')), 0)
  })
})

// ─── Sub-partition (sub@main) tests ──────────────────────────────────────

const ROME_DOCS_WITH_SUBSCOPE = [
  { _id: 'r1', name: 'Roma A', createdAt: '2024-01-15', subScope: 'programA', __STATE__: 'PUBLIC' },
  { _id: 'r2', name: 'Roma B', createdAt: '2024-01-13', subScope: 'programB', __STATE__: 'PUBLIC' },
  { _id: 'r3', name: 'Roma C', createdAt: '2024-01-11', subScope: 'programA', __STATE__: 'PUBLIC' },
  { _id: 'r4', name: 'Roma D', createdAt: '2024-01-09', subScope: 'programB', __STATE__: 'PUBLIC' },
  { _id: 'r5', name: 'Roma E', createdAt: '2024-01-07', subScope: 'programA', __STATE__: 'PUBLIC' },
]

const MILAN_DOCS_PLAIN = [
  { _id: 'm1', name: 'Milan A', createdAt: '2024-01-14', __STATE__: 'PUBLIC' },
  { _id: 'm2', name: 'Milan B', createdAt: '2024-01-12', __STATE__: 'PUBLIC' },
  { _id: 'm3', name: 'Milan C', createdAt: '2024-01-10', __STATE__: 'PUBLIC' },
]

test('scatterGather with sub-partitions', async(t) => {
  t.test('filters by subScope when entry has sub', async(t) => {
    const entries = [
      { physical: 'rome', sub: 'programA', label: 'programA@rome', isCross: false },
    ]
    const multidb = createMockMultidb(
      { rome: { tickets: ROME_DOCS_WITH_SUBSCOPE } },
      entries
    )

    const result = await scatterGather({
      multidb,
      collectionName: 'tickets',
      sortField: 'createdAt',
      sortDir: -1,
      limit: 10,
      log: mockLog,
    })

    // Should only get programA docs: r1, r3, r5
    t.equal(result.data.length, 3)
    const names = result.data.map(d => d.name)
    t.same(names, ['Roma A', 'Roma C', 'Roma E'])
    // All results should have database = physical and subScope = sub
    for (const doc of result.data) {
      t.equal(doc.database, 'rome')
      t.equal(doc.subScope, 'programA')
    }
  })

  t.test('multiple sub-entries on same physical scope', async(t) => {
    const entries = [
      { physical: 'rome', sub: 'programA', label: 'programA@rome', isCross: false },
      { physical: 'rome', sub: 'programB', label: 'programB@rome', isCross: false },
    ]
    const multidb = createMockMultidb(
      { rome: { tickets: ROME_DOCS_WITH_SUBSCOPE } },
      entries
    )

    const result = await scatterGather({
      multidb,
      collectionName: 'tickets',
      sortField: 'createdAt',
      sortDir: -1,
      limit: 10,
      log: mockLog,
    })

    // All 5 docs from rome should be returned (3 programA + 2 programB)
    t.equal(result.data.length, 5)
    // Verify merge-sort order
    const dates = result.data.map(d => d.createdAt)
    for (let i = 1; i < dates.length; i++) {
      t.ok(dates[i] <= dates[i - 1], `${dates[i]} <= ${dates[i - 1]}`)
    }
    // Each doc should have the correct subScope
    const programADocs = result.data.filter(d => d.subScope === 'programA')
    const programBDocs = result.data.filter(d => d.subScope === 'programB')
    t.equal(programADocs.length, 3)
    t.equal(programBDocs.length, 2)
  })

  t.test('mixed sub-partition and plain entries', async(t) => {
    const entries = [
      { physical: 'rome', sub: 'programA', label: 'programA@rome', isCross: false },
      { physical: 'milan', sub: undefined, label: 'milan', isCross: false },
    ]
    const multidb = createMockMultidb(
      { rome: { tickets: ROME_DOCS_WITH_SUBSCOPE }, milan: { tickets: MILAN_DOCS_PLAIN } },
      entries
    )

    const result = await scatterGather({
      multidb,
      collectionName: 'tickets',
      sortField: 'createdAt',
      sortDir: -1,
      limit: 10,
      log: mockLog,
    })

    // programA@rome: 3 docs, milan: 3 docs = 6 total
    t.equal(result.data.length, 6)
    // Milan docs should not have subScope
    const milanDocs = result.data.filter(d => d.database === 'milan')
    for (const doc of milanDocs) {
      t.notOk(doc.subScope, 'milan docs should not have subScope')
    }
    // Rome docs should have subScope
    const romeDocs = result.data.filter(d => d.database === 'rome')
    for (const doc of romeDocs) {
      t.equal(doc.subScope, 'programA')
    }
  })

  t.test('keyset pagination works with sub-partition entries', async(t) => {
    const entries = [
      { physical: 'rome', sub: 'programA', label: 'programA@rome', isCross: false },
      { physical: 'milan', sub: undefined, label: 'milan', isCross: false },
    ]
    const multidb = createMockMultidb(
      { rome: { tickets: ROME_DOCS_WITH_SUBSCOPE }, milan: { tickets: MILAN_DOCS_PLAIN } },
      entries
    )

    // Page 1: limit 3
    const page1 = await scatterGather({
      multidb,
      collectionName: 'tickets',
      sortField: 'createdAt',
      sortDir: -1,
      limit: 3,
      log: mockLog,
    })

    t.equal(page1.data.length, 3)
    t.ok(page1.nextCursor)

    // Page 2: use cursor
    const page2 = await scatterGather({
      multidb,
      collectionName: 'tickets',
      sortField: 'createdAt',
      sortDir: -1,
      limit: 3,
      cursorToken: page1.nextCursor,
      log: mockLog,
    })

    t.equal(page2.data.length, 3)

    // No duplicates between pages
    const page1Ids = new Set(page1.data.map(d => d._id))
    for (const doc of page2.data) {
      t.notOk(page1Ids.has(doc._id), `${doc._id} should not appear on both pages`)
    }

    // Combined: all 6 docs
    const allIds = [...page1.data.map(d => d._id), ...page2.data.map(d => d._id)]
    t.equal(new Set(allIds).size, 6)
  })
})

test('scatterGather with crossFilter', async(t) => {
  const ROME_VISIBLE = [
    { _id: 'rv1', name: 'Public Rome', createdAt: '2024-01-16', visibility: 'public', __STATE__: 'PUBLIC' },
    { _id: 'rv2', name: 'Private Rome', createdAt: '2024-01-14', visibility: 'private', __STATE__: 'PUBLIC' },
  ]

  t.test('cross-scope uses crossFilter instead of normal filter', async(t) => {
    const entries = [
      { physical: 'rome', sub: undefined, label: 'rome', isCross: false },
      { physical: 'milan', sub: undefined, label: 'milan', isCross: true },
    ]
    const multidb = createMockMultidb(
      {
        rome: { tickets: ROME_VISIBLE },
        milan: { tickets: MILAN_DOCS_PLAIN },
      },
      entries
    )

    // Normal filter: visibility=private
    // Cross filter: no filter (all docs)
    const result = await scatterGather({
      multidb,
      collectionName: 'tickets',
      filter: { visibility: 'private' },
      crossFilter: {},
      sortField: 'createdAt',
      sortDir: -1,
      limit: 10,
      log: mockLog,
    })

    // Rome (normal): only Private Rome matches → 1 doc
    // Milan (cross): crossFilter = {} → all 3 docs
    t.equal(result.data.length, 4)
    const romeResults = result.data.filter(d => d.database === 'rome')
    t.equal(romeResults.length, 1)
    t.equal(romeResults[0].name, 'Private Rome')
  })

  t.test('cross-scope with sub-partition and crossFilter', async(t) => {
    const entries = [
      { physical: 'rome', sub: 'programA', label: 'programA@rome', isCross: false },
      { physical: 'rome', sub: 'programB', label: 'programB@rome', isCross: true },
    ]
    const multidb = createMockMultidb(
      { rome: { tickets: ROME_DOCS_WITH_SUBSCOPE } },
      entries
    )

    // Normal filter: name starts with Roma A (filter on name)
    // Cross filter: no restriction
    const result = await scatterGather({
      multidb,
      collectionName: 'tickets',
      filter: { name: 'Roma A' },
      crossFilter: {},
      sortField: 'createdAt',
      sortDir: -1,
      limit: 10,
      log: mockLog,
    })

    // programA@rome (normal): filter {name:'Roma A'} + subScope=programA → only r1
    // programB@rome (cross): crossFilter {} + subScope=programB → r2, r4
    t.equal(result.data.length, 3)
    const programBDocs = result.data.filter(d => d.subScope === 'programB')
    t.equal(programBDocs.length, 2)
  })
})

test('scatterCount with sub-partitions', async(t) => {
  t.test('counts only matching subScope entries', async(t) => {
    const entries = [
      { physical: 'rome', sub: 'programA', label: 'programA@rome', isCross: false },
    ]
    const multidb = createMockMultidb(
      { rome: { tickets: ROME_DOCS_WITH_SUBSCOPE } },
      entries
    )

    const result = await scatterCount({
      multidb,
      collectionName: 'tickets',
      states: ['PUBLIC'],
      log: mockLog,
    })

    t.equal(result.totalCount, 3, 'only programA docs')
    t.equal(result.countByScope['programA@rome'], 3)
  })

  t.test('counts with crossFilter for cross entries', async(t) => {
    const entries = [
      { physical: 'rome', sub: 'programA', label: 'programA@rome', isCross: false },
      { physical: 'rome', sub: 'programB', label: 'programB@rome', isCross: true },
    ]
    const multidb = createMockMultidb(
      { rome: { tickets: ROME_DOCS_WITH_SUBSCOPE } },
      entries
    )

    const result = await scatterCount({
      multidb,
      collectionName: 'tickets',
      filter: { name: 'Roma A' },
      crossFilter: {},
      states: ['PUBLIC'],
      log: mockLog,
    })

    // programA (normal, filter name=Roma A): 1
    // programB (cross, crossFilter={}): 2
    t.equal(result.totalCount, 3)
    t.equal(result.countByScope['programA@rome'], 1)
    t.equal(result.countByScope['programB@rome'], 2)
  })

  t.test('mixed sub-partition and plain entries count', async(t) => {
    const entries = [
      { physical: 'rome', sub: 'programA', label: 'programA@rome', isCross: false },
      { physical: 'milan', sub: undefined, label: 'milan', isCross: false },
    ]
    const multidb = createMockMultidb(
      { rome: { tickets: ROME_DOCS_WITH_SUBSCOPE }, milan: { tickets: MILAN_DOCS_PLAIN } },
      entries
    )

    const result = await scatterCount({
      multidb,
      collectionName: 'tickets',
      states: ['PUBLIC'],
      log: mockLog,
    })

    t.equal(result.totalCount, 6, '3 programA + 3 milan')
    t.equal(result.countByScope['programA@rome'], 3)
    t.equal(result.countByScope.milan, 3)
  })
})
