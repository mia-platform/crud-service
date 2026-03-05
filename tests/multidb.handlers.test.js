'use strict'

const { test } = require('tap')
const {
  parseSort,
  parseSubScope,
  createScopedMultidb,
  resolveMultidb,
  wrapWriteHandler,
  addScopeToResult,
  wrapCursorStreamWithScope,
  handleMultidbPatchId,
  handleMultidbPatchMany,
  handleMultidbPatchBulk,
  createScopedCrudService,
  getEditableFields,
} = require('../lib/multidb/handlers')

test('parseSort', async(t) => {
  t.test('returns default createdAt DESC when no input', async(t) => {
    const result = parseSort(undefined)
    t.same(result, { sortField: 'createdAt', sortDir: -1 })
  })

  t.test('parses descending sort with dash prefix', async(t) => {
    const result = parseSort('-updatedAt')
    t.same(result, { sortField: 'updatedAt', sortDir: -1 })
  })

  t.test('parses ascending sort without dash prefix', async(t) => {
    const result = parseSort('name')
    t.same(result, { sortField: 'name', sortDir: 1 })
  })

  t.test('handles numeric input via toString', async(t) => {
    const result = parseSort(123)
    t.same(result, { sortField: '123', sortDir: 1 })
  })
})

test('parseSubScope', async(t) => {
  t.test('parses sub@main format', async(t) => {
    const result = parseSubScope('programA@rome')
    t.same(result, { physical: 'rome', sub: 'programA' })
  })

  t.test('parses plain scope (no @)', async(t) => {
    const result = parseSubScope('rome')
    t.same(result, { physical: 'rome', sub: undefined })
  })

  t.test('handles whitespace', async(t) => {
    const result = parseSubScope('  programA @ rome  ')
    t.same(result, { physical: 'rome', sub: 'programA' })
  })

  t.test('handles empty string', async(t) => {
    const result = parseSubScope('')
    t.same(result, { physical: '', sub: undefined })
  })

  t.test('handles undefined', async(t) => {
    const result = parseSubScope(undefined)
    t.same(result, { physical: '', sub: undefined })
  })

  t.test('handles @ with no sub', async(t) => {
    const result = parseSubScope('@rome')
    t.same(result, { physical: 'rome', sub: undefined })
  })
})

test('createScopedMultidb', async(t) => {
  function makeMockMultidb() {
    const dbs = {
      rome: { collection(name) { return { name, scope: 'rome' } } },
      milan: { collection(name) { return { name, scope: 'milan' } } },
      naples: { collection(name) { return { name, scope: 'naples' } } },
    }

    return {
      scopes: ['rome', 'milan', 'naples'],
      dbs,
      collection(scope, name) { return dbs[scope].collection(name) },
      allCollections(name) {
        return ['rome', 'milan', 'naples'].map(scope => ({
          scope,
          collection: dbs[scope].collection(name),
        }))
      },
    }
  }

  const mockLog = {
    warn() { /* noop */ },
    info() { /* noop */ },
  }

  t.test('returns multidb with only valid scopes', async(t) => {
    const multidb = makeMockMultidb()
    const scoped = createScopedMultidb(multidb, ['rome', 'milan'], mockLog)

    t.same(scoped.scopes, ['rome', 'milan'])
    t.equal(scoped.allCollections('tickets').length, 2)
  })

  t.test('ignores invalid scopes with warning', async(t) => {
    let warningCalled = false
    const log = {
      ...mockLog,
      warn() { warningCalled = true },
    }

    const multidb = makeMockMultidb()
    const scoped = createScopedMultidb(multidb, ['rome', 'nonexistent'], log)

    t.ok(warningCalled, 'warn should have been called')
    t.same(scoped.scopes, ['rome'])
  })

  t.test('falls back to all scopes when none are valid', async(t) => {
    const multidb = makeMockMultidb()
    const scoped = createScopedMultidb(multidb, ['invalid1', 'invalid2'], mockLog)

    t.same(scoped.scopes, ['rome', 'milan', 'naples'])
  })

  t.test('parses sub@main format and builds entries', async(t) => {
    const multidb = makeMockMultidb()
    const scoped = createScopedMultidb(multidb, ['programA@rome', 'programB@rome', 'milan'], mockLog)

    t.same(scoped.scopes, ['rome', 'milan'])
    t.equal(scoped.entries.length, 3)
    t.same(scoped.entries[0], { physical: 'rome', sub: 'programA', label: 'programA@rome', isCross: false })
    t.same(scoped.entries[1], { physical: 'rome', sub: 'programB', label: 'programB@rome', isCross: false })
    t.same(scoped.entries[2], { physical: 'milan', sub: undefined, label: 'milan', isCross: false })
  })

  t.test('marks cross-scope entries correctly', async(t) => {
    const multidb = makeMockMultidb()
    const scoped = createScopedMultidb(
      multidb,
      ['programA@rome', 'programB@rome', 'milan'],
      mockLog,
      ['programB@rome']
    )

    t.equal(scoped.entries[0].isCross, false, 'programA@rome is not cross')
    t.equal(scoped.entries[1].isCross, true, 'programB@rome is cross')
    t.equal(scoped.entries[2].isCross, false, 'milan is not cross')
  })

  t.test('plain scopes generate entries with no sub', async(t) => {
    const multidb = makeMockMultidb()
    const scoped = createScopedMultidb(multidb, ['rome', 'milan'], mockLog)

    t.equal(scoped.entries.length, 2)
    t.same(scoped.entries[0], { physical: 'rome', sub: undefined, label: 'rome', isCross: false })
    t.same(scoped.entries[1], { physical: 'milan', sub: undefined, label: 'milan', isCross: false })
  })

  t.test('deduplicates physical scopes from multiple sub@main entries', async(t) => {
    const multidb = makeMockMultidb()
    const scoped = createScopedMultidb(multidb, ['programA@rome', 'programB@rome'], mockLog)

    t.same(scoped.scopes, ['rome'], 'only one physical scope')
    t.equal(scoped.entries.length, 2, 'but two entries')
  })
})

test('resolveMultidb', async(t) => {
  const mockMultidb = {
    scopes: ['alpha', 'beta'],
    defaultScope: 'alpha',
    dbs: {
      alpha: { collection() { return {} } },
      beta: { collection() { return {} } },
    },
    collection() { return {} },
    allCollections() { return [] },
  }
  const mockLog = {
    warn() { /* noop */ },
  }

  t.test('returns only defaultScope when no scopeFilter', async(t) => {
    const result = resolveMultidb(mockMultidb, undefined, mockLog)
    t.same(result.scopes, ['alpha'], 'should return only defaultScope')
  })

  t.test('returns only defaultScope when scopeFilter is empty string', async(t) => {
    const result = resolveMultidb(mockMultidb, '', mockLog)
    t.same(result.scopes, ['alpha'], 'should return only defaultScope')
  })

  t.test('filters scopes when scopeFilter is provided', async(t) => {
    const result = resolveMultidb(mockMultidb, 'alpha', mockLog)
    t.same(result.scopes, ['alpha'])
  })

  t.test('handles comma-separated scopes with spaces', async(t) => {
    const result = resolveMultidb(mockMultidb, ' alpha , beta ', mockLog)
    t.same(result.scopes, ['alpha', 'beta'])
  })

  t.test('parses sub@main format in scopeFilter', async(t) => {
    const result = resolveMultidb(mockMultidb, 'programA@alpha,programB@alpha,beta', mockLog)
    t.same(result.scopes, ['alpha', 'beta'], 'physical scopes are deduplicated')
    t.equal(result.entries.length, 3)
    t.same(result.entries[0], { physical: 'alpha', sub: 'programA', label: 'programA@alpha', isCross: false })
    t.same(result.entries[1], { physical: 'alpha', sub: 'programB', label: 'programB@alpha', isCross: false })
    t.same(result.entries[2], { physical: 'beta', sub: undefined, label: 'beta', isCross: false })
  })

  t.test('marks cross-scope entries from crossScopeFilter', async(t) => {
    const result = resolveMultidb(mockMultidb, 'programA@alpha,beta', mockLog, 'programA@alpha')
    t.equal(result.entries.length, 2)
    t.equal(result.entries[0].isCross, true, 'programA@alpha is cross')
    t.equal(result.entries[1].isCross, false, 'beta is not cross')
  })

  t.test('crossScopeFilter without scopeFilter defaults to defaultScope', async(t) => {
    const result = resolveMultidb(mockMultidb, undefined, mockLog, 'alpha')
    t.same(result.scopes, ['alpha'], 'defaults to defaultScope')
    t.equal(result.entries.length, 1)
    t.equal(result.entries[0].isCross, true, 'defaultScope alpha is in cross list')
  })

  t.test('generates entries for plain scopes', async(t) => {
    const result = resolveMultidb(mockMultidb, 'alpha,beta', mockLog)
    t.equal(result.entries.length, 2)
    t.same(result.entries[0], { physical: 'alpha', sub: undefined, label: 'alpha', isCross: false })
    t.same(result.entries[1], { physical: 'beta', sub: undefined, label: 'beta', isCross: false })
  })
})

test('wrapWriteHandler', async(t) => {
  t.test('returns a function with prefixed name', async(t) => {
    async function handleInsertOne() { /* noop */ }
    const wrapped = wrapWriteHandler(handleInsertOne)
    t.equal(typeof wrapped, 'function')
    t.ok(wrapped.name.startsWith('multidb_'), 'should have multidb_ prefix')
  })

  t.test('uses defaultScope when x-scope header is missing', async(t) => {
    let usedScope = null

    async function handleInsertOne() {
      // eslint-disable-next-line no-underscore-dangle
      usedScope = this.crudService._mongoCollection.scope
      return 'inserted'
    }
    const wrapped = wrapWriteHandler(handleInsertOne)

    const mockRequest = { headers: {}, query: {} }
    const mockReply = {}

    const context = {
      multidb: {
        scopes: ['rome', 'milan'],
        defaultScope: 'rome',
        collection(scope) { return { scope, name: `tickets-on-${scope}` } },
      },
      modelName: 'tickets',
      crudService: {
        _mongoCollection: { name: 'original-main-collection' },
        _stateOnInsert: 'PUBLIC',
      },
    }

    const result = await wrapped.call(context, mockRequest, mockReply)
    t.equal(result, 'inserted')
    t.equal(usedScope, 'rome', 'should use defaultScope when x-scope missing')
  })

  t.test('returns 400 for invalid scope name', async(t) => {
    async function handleInsertOne() { return 'ok' }
    const wrapped = wrapWriteHandler(handleInsertOne)

    let sentCode = null
    let sentBody = null
    const mockReply = {
      code(statusCode) { sentCode = statusCode; return this },
      send(body) { sentBody = body; return this },
    }
    const mockRequest = { headers: { 'x-scope': 'nonexistent' }, query: {} }

    const context = {
      multidb: {
        scopes: ['rome', 'milan'],
        defaultScope: 'rome',
      },
      modelName: 'tickets',
    }

    await wrapped.call(context, mockRequest, mockReply)
    t.equal(sentCode, 400)
    t.match(sentBody.error, /nonexistent/)
  })

  t.test('proxies crudService._mongoCollection to scoped collection', async(t) => {
    const scopedCollection = { name: 'tickets-on-rome' }
    let capturedCollection = null

    // Handler that reads this.crudService._mongoCollection
    async function handleInsertOne() {
      // eslint-disable-next-line no-underscore-dangle
      capturedCollection = this.crudService._mongoCollection
      return 'inserted'
    }
    const wrapped = wrapWriteHandler(handleInsertOne)

    const mockRequest = { headers: { 'x-scope': 'rome' }, query: {} }
    const mockReply = {}

    const context = {
      multidb: {
        scopes: ['rome', 'milan'],
        collection(scope, name) {
          if (scope === 'rome' && name === 'tickets') { return scopedCollection }
          return null
        },
      },
      modelName: 'tickets',
      crudService: {
        _mongoCollection: { name: 'original-main-collection' },
        _stateOnInsert: 'PUBLIC',
        _defaultSorting: { createdAt: -1 },
      },
    }

    const result = await wrapped.call(context, mockRequest, mockReply)
    t.equal(result, 'inserted')
    t.same(capturedCollection, scopedCollection, 'should use scoped collection')
  })

  t.test('preserves other crudService properties through proxy', async(t) => {
    let capturedState = null

    async function handleInsertOne() {
      // eslint-disable-next-line no-underscore-dangle
      capturedState = this.crudService._stateOnInsert
      return 'ok'
    }
    const wrapped = wrapWriteHandler(handleInsertOne)

    const mockRequest = { headers: { 'x-scope': 'rome' }, query: {} }
    const mockReply = {}
    const scopedCollection = { name: 'scoped' }

    const context = {
      multidb: {
        scopes: ['rome'],
        collection() { return scopedCollection },
      },
      modelName: 'tickets',
      crudService: {
        _mongoCollection: { name: 'original' },
        _stateOnInsert: 'DRAFT',
      },
    }

    await wrapped.call(context, mockRequest, mockReply)
    t.equal(capturedState, 'DRAFT', 'should preserve original _stateOnInsert')
  })

  t.test('preserves non-crudService properties through fastify proxy', async(t) => {
    let capturedParser = null

    async function handleInsertOne() {
      capturedParser = this.queryParser
      return 'ok'
    }
    const wrapped = wrapWriteHandler(handleInsertOne)

    const mockRequest = { headers: { 'x-scope': 'rome' }, query: {} }
    const mockReply = {}
    const scopedCollection = { name: 'scoped' }
    const mockParser = { parse() { /* noop */ } }

    const context = {
      multidb: {
        scopes: ['rome'],
        collection() { return scopedCollection },
      },
      modelName: 'tickets',
      crudService: { _mongoCollection: { name: 'original' } },
      queryParser: mockParser,
    }

    await wrapped.call(context, mockRequest, mockReply)
    t.equal(capturedParser, mockParser, 'this.queryParser should pass through proxy')
  })

  t.test('trims whitespace from x-scope value', async(t) => {
    let usedScope = null

    async function handleInsertOne() { return 'ok' }
    const wrapped = wrapWriteHandler(handleInsertOne)

    const mockRequest = { headers: { 'x-scope': '  rome  ' }, query: {} }
    const mockReply = {}

    const context = {
      multidb: {
        scopes: ['rome'],
        collection(scope) { usedScope = scope; return { name: 'scoped' } },
      },
      modelName: 'tickets',
      crudService: { _mongoCollection: { name: 'original' } },
    }

    await wrapped.call(context, mockRequest, mockReply)
    t.equal(usedScope, 'rome', 'should trim scope value')
  })

  t.test('injects scope into object result from handler', async(t) => {
    async function handleInsertOne() {
      return { _id: 'abc123' }
    }
    const wrapped = wrapWriteHandler(handleInsertOne)

    const mockRequest = { headers: { 'x-scope': 'rome' }, query: {} }
    const mockReply = {}

    const context = {
      multidb: {
        scopes: ['rome'],
        collection() { return { name: 'scoped' } },
      },
      modelName: 'tickets',
      crudService: { _mongoCollection: { name: 'original' } },
    }

    const result = await wrapped.call(context, mockRequest, mockReply)
    t.same(result, { _id: 'abc123', scope: 'rome' })
  })

  t.test('injects scope into array result from handler', async(t) => {
    async function handleInsertMany() {
      return [{ _id: 'a1' }, { _id: 'a2' }]
    }
    const wrapped = wrapWriteHandler(handleInsertMany)

    const mockRequest = { headers: { 'x-scope': 'milan' }, query: {} }
    const mockReply = {}

    const context = {
      multidb: {
        scopes: ['milan'],
        collection() { return { name: 'scoped' } },
      },
      modelName: 'tickets',
      crudService: { _mongoCollection: { name: 'original' } },
    }

    const result = await wrapped.call(context, mockRequest, mockReply)
    t.same(result, [{ _id: 'a1', scope: 'milan' }, { _id: 'a2', scope: 'milan' }])
  })

  t.test('does not inject scope when handler returns reply (e.g. 204)', async(t) => {
    const mockReply = {
      code() { return this },
      send() { return this },
    }
    async function handleDelete() { return mockReply }
    const wrapped = wrapWriteHandler(handleDelete)

    const mockRequest = { headers: { 'x-scope': 'rome' }, query: {} }

    const context = {
      multidb: {
        scopes: ['rome'],
        collection() { return { name: 'scoped' } },
      },
      modelName: 'tickets',
      crudService: { _mongoCollection: { name: 'original' } },
    }

    const result = await wrapped.call(context, mockRequest, mockReply)
    t.equal(result, mockReply, 'should return reply object untouched')
  })

  t.test('does not inject scope when handler returns a number', async(t) => {
    async function handleCount() { return 42 }
    const wrapped = wrapWriteHandler(handleCount)

    const mockRequest = { headers: { 'x-scope': 'rome' }, query: {} }
    const mockReply = {}

    const context = {
      multidb: {
        scopes: ['rome'],
        collection() { return { name: 'scoped' } },
      },
      modelName: 'tickets',
      crudService: { _mongoCollection: { name: 'original' } },
    }

    const result = await wrapped.call(context, mockRequest, mockReply)
    t.equal(result, 42, 'numeric result should pass through unchanged')
  })

  t.test('wraps findAll cursor with scope injection via proxy', async(t) => {
    const mockDocs = [{ _id: 'doc1', name: 'A' }, { _id: 'doc2', name: 'B' }]
    let streamTransform = null

    const mockCursor = {
      stream(opts = {}) {
        streamTransform = opts.transform
        return 'mock-stream'
      },
    }

    async function handleExport() {
      // Simulate what export handler does: call crudService.findAll().stream()
      const cursor = this.crudService.findAll()
      const stream = cursor.stream({ transform: JSON.stringify })
      return stream
    }
    const wrapped = wrapWriteHandler(handleExport)

    const mockRequest = { headers: { 'x-scope': 'rome' }, query: {} }
    const mockReply = {}

    const context = {
      multidb: {
        scopes: ['rome'],
        collection() { return { name: 'scoped' } },
      },
      modelName: 'tickets',
      crudService: {
        _mongoCollection: { name: 'original' },
        findAll() { return mockCursor },
      },
    }

    await wrapped.call(context, mockRequest, mockReply)

    // The proxy should have wrapped the stream transform to inject scope
    t.ok(streamTransform, 'stream should have a transform')
    const transformed = streamTransform({ _id: 'x', name: 'test' })
    // The wrapped transform should chain: first JSON.stringify (user transform), then add scope.
    // But since JSON.stringify returns a string (not object), scope is added to the string wrapper.
    // Actually, the wrapping adds scope to the result of userTransform.
    // Since JSON.stringify returns a string, { ...string, scope } = { scope }
    t.equal(transformed.scope, 'rome')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// addScopeToResult
// ────────────────────────────────────────────────────────────────────────────

test('addScopeToResult', async(t) => {
  t.test('adds scope to a plain object', async(t) => {
    const result = addScopeToResult({ _id: 'abc', name: 'Test' }, 'rome', {})
    t.same(result, { _id: 'abc', name: 'Test', scope: 'rome' })
  })

  t.test('adds scope to each item in an array', async(t) => {
    const input = [{ _id: 'a' }, { _id: 'b' }]
    const result = addScopeToResult(input, 'milan', {})
    t.same(result, [{ _id: 'a', scope: 'milan' }, { _id: 'b', scope: 'milan' }])
  })

  t.test('returns null unchanged', async(t) => {
    t.equal(addScopeToResult(null, 'rome', {}), null)
  })

  t.test('returns undefined unchanged', async(t) => {
    t.equal(addScopeToResult(undefined, 'rome', {}), undefined)
  })

  t.test('returns number unchanged', async(t) => {
    t.equal(addScopeToResult(42, 'rome', {}), 42)
  })

  t.test('returns string unchanged', async(t) => {
    t.equal(addScopeToResult('some string', 'rome', {}), 'some string')
  })

  t.test('returns reply object unchanged', async(t) => {
    const reply = { code() { return this } }
    t.equal(addScopeToResult(reply, 'rome', reply), reply)
  })

  t.test('skips non-object items in array', async(t) => {
    const input = [{ _id: 'a' }, 'string-item', null, { _id: 'b' }]
    const result = addScopeToResult(input, 'naples', {})
    t.same(result, [
      { _id: 'a', scope: 'naples' },
      'string-item',
      null,
      { _id: 'b', scope: 'naples' },
    ])
  })
})

// ────────────────────────────────────────────────────────────────────────────
// wrapCursorStreamWithScope
// ────────────────────────────────────────────────────────────────────────────

test('wrapCursorStreamWithScope', async(t) => {
  t.test('injects scope into each streamed document', async(t) => {
    let capturedTransform = null
    const mockCursor = {
      stream(opts = {}) {
        capturedTransform = opts.transform
        return 'stream-result'
      },
    }

    const wrapped = wrapCursorStreamWithScope(mockCursor, 'rome')
    t.equal(wrapped, mockCursor, 'returns same cursor object')

    const streamResult = wrapped.stream()
    t.equal(streamResult, 'stream-result')
    t.ok(capturedTransform, 'transform should be injected')

    const doc = { _id: 'abc', name: 'Test' }
    t.same(capturedTransform(doc), { _id: 'abc', name: 'Test', scope: 'rome' })
  })

  t.test('chains with user-provided transform', async(t) => {
    let capturedTransform = null
    const mockCursor = {
      stream(opts = {}) {
        capturedTransform = opts.transform
        return 'stream-result'
      },
    }

    wrapCursorStreamWithScope(mockCursor, 'milan')

    mockCursor.stream({ transform: (doc) => ({ ...doc, extra: true }) })
    t.ok(capturedTransform)

    const doc = { _id: 'x' }
    const result = capturedTransform(doc)
    t.same(result, { _id: 'x', extra: true, scope: 'milan' })
  })

  t.test('passes through other stream options', async(t) => {
    let capturedOpts = null
    const mockCursor = {
      stream(opts = {}) {
        capturedOpts = opts
        return 'stream-result'
      },
    }

    wrapCursorStreamWithScope(mockCursor, 'naples')
    mockCursor.stream({ highWaterMark: 1024 })

    t.equal(capturedOpts.highWaterMark, 1024)
    t.ok(capturedOpts.transform, 'transform should be present')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// createScopedCrudService
// ────────────────────────────────────────────────────────────────────────────

test('createScopedCrudService', async(t) => {
  t.test('redirects _mongoCollection to the scoped collection', async(t) => {
    const original = {
      _mongoCollection: { name: 'original' },
      _stateOnInsert: 'PUBLIC',
      someMethod() { return 42 },
    }
    const scopedCol = { name: 'scoped-rome' }
    const scoped = createScopedCrudService(original, scopedCol)

    // eslint-disable-next-line no-underscore-dangle
    t.same(scoped._mongoCollection, scopedCol)
    // eslint-disable-next-line no-underscore-dangle
    t.equal(scoped._stateOnInsert, 'PUBLIC')
    t.equal(scoped.someMethod(), 42)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// getEditableFields
// ────────────────────────────────────────────────────────────────────────────

test('getEditableFields', async(t) => {
  t.test('returns allFieldNames minus internals when no ACL', async(t) => {
    const fields = getEditableFields(undefined, ['name', 'age', 'updaterId', 'updatedAt', '__STATE__'])
    t.same(fields, ['name', 'age'])
  })

  t.test('returns ACL columns minus internals when ACL provided', async(t) => {
    const fields = getEditableFields('name,updaterId', ['name', 'age', 'updaterId'])
    t.same(fields, ['name'])
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Helpers for PATCH handler tests
// ────────────────────────────────────────────────────────────────────────────

function makeMockMultidb(scopes = ['rome', 'milan']) {
  const collections = {}
  for (const scope of scopes) {
    collections[scope] = {}
  }
  return {
    scopes,
    collection(scope, _name) {
      return collections[scope]
    },
  }
}

function makeMockLog() {
  return {
    warn() { /* noop */ },
    info() { /* noop */ },
    error() { /* noop */ },
    debug() { /* noop */ },
  }
}

function makeMockQueryParser() {
  return {
    parseAndCastCommands() { /* noop */ },
    parseAndCast() { /* noop */ },
  }
}

// ────────────────────────────────────────────────────────────────────────────
// handleMultidbPatchId
// ────────────────────────────────────────────────────────────────────────────

test('handleMultidbPatchId', async(t) => {
  t.test('patches document in the scope where it exists, adds scope field', async(t) => {
    const multidb = makeMockMultidb(['rome', 'milan'])
    const updatedDoc = { _id: 'abc123', name: 'Updated', __STATE__: 'PUBLIC' }

    const context = {
      multidb,
      modelName: 'tickets',
      allFieldNames: ['name', 'priority'],
      queryParser: makeMockQueryParser(),
      crudService: {
        _mongoCollection: {},
        async patchById(_ctx, _id, _cmds, _q, _proj, _states) {
          const col = this._mongoCollection
          // Only the rome collection has the doc
          if (col === multidb.collection('rome', 'tickets')) {
            return updatedDoc
          }
          return null
        },
      },
    }

    const request = {
      query: { _st: 'PUBLIC' },
      headers: { 'x-scope': 'rome,milan' },
      params: { id: 'abc123' },
      crudContext: { userId: 'user1', now: new Date() },
      body: { $set: { name: 'Updated' } },
      log: makeMockLog(),
    }

    const result = await handleMultidbPatchId.call(context, request, {
      notFound() { return { statusCode: 404 } },
    })

    t.equal(result.scope, 'rome')
    t.equal(result.name, 'Updated')
  })

  t.test('returns 404 when document not found in any scope', async(t) => {
    const multidb = makeMockMultidb(['rome', 'milan'])
    multidb.defaultScope = 'rome'

    const context = {
      multidb,
      modelName: 'tickets',
      allFieldNames: ['name'],
      queryParser: makeMockQueryParser(),
      crudService: {
        _mongoCollection: {},
        async patchById() { return null },
      },
    }

    const request = {
      query: { _st: 'PUBLIC' },
      headers: {},
      params: { id: 'nonexistent' },
      crudContext: { userId: 'user1', now: new Date() },
      body: { $set: { name: 'X' } },
      log: makeMockLog(),
    }

    let wasNotFound = false
    const mockReply = {
      notFound() { wasNotFound = true; return { statusCode: 404 } },
    }

    await handleMultidbPatchId.call(context, request, mockReply)
    t.ok(wasNotFound, 'should call reply.notFound()')
  })

  t.test('defaults to DEFAULT_SCOPE when x-scope is missing', async(t) => {
    const patchedScopes = []
    const multidb = makeMockMultidb(['rome', 'milan', 'naples'])
    multidb.defaultScope = 'rome'

    const context = {
      multidb,
      modelName: 'tickets',
      allFieldNames: ['name'],
      queryParser: makeMockQueryParser(),
      crudService: {
        _mongoCollection: {},
        async patchById() {
          const col = this._mongoCollection
          for (const scope of ['rome', 'milan', 'naples']) {
            if (col === multidb.collection(scope, 'tickets')) {
              patchedScopes.push(scope)
            }
          }
          return null
        },
      },
    }

    const request = {
      query: { _st: 'PUBLIC' },
      headers: {},
      params: { id: 'abc123' },
      crudContext: { userId: 'user1', now: new Date() },
      body: { $set: { name: 'X' } },
      log: makeMockLog(),
    }

    await handleMultidbPatchId.call(context, request, {
      notFound() { return { statusCode: 404 } },
    })

    t.same(patchedScopes, ['rome'], 'should only try DEFAULT_SCOPE')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// handleMultidbPatchMany
// ────────────────────────────────────────────────────────────────────────────

test('handleMultidbPatchMany', async(t) => {
  t.test('defaults to DEFAULT_SCOPE when x-scope missing', async(t) => {
    const multidb = makeMockMultidb(['rome', 'milan', 'naples'])
    multidb.defaultScope = 'rome'
    let callCount = 0

    const context = {
      multidb,
      modelName: 'tickets',
      allFieldNames: ['name', 'priority'],
      queryParser: makeMockQueryParser(),
      crudService: {
        _mongoCollection: {},
        async patchMany() {
          callCount += 1
          return 3
        },
      },
    }

    const request = {
      query: { _st: 'PUBLIC' },
      headers: {},
      crudContext: { userId: 'user1', now: new Date() },
      body: { $set: { priority: 'low' } },
      log: makeMockLog(),
    }

    const result = await handleMultidbPatchMany.call(context, request)
    t.equal(callCount, 1, 'should only patch DEFAULT_SCOPE')
    t.equal(result, 3, '1 scope × 3 docs = 3')
  })

  t.test('respects x-scope filter', async(t) => {
    const multidb = makeMockMultidb(['rome', 'milan', 'naples'])
    multidb.defaultScope = 'rome'
    let callCount = 0

    const context = {
      multidb,
      modelName: 'tickets',
      allFieldNames: ['name'],
      queryParser: makeMockQueryParser(),
      crudService: {
        _mongoCollection: {},
        async patchMany() { callCount += 1; return 2 },
      },
    }

    const request = {
      query: { _st: 'PUBLIC' },
      headers: { 'x-scope': 'rome,milan' },
      crudContext: { userId: 'user1', now: new Date() },
      body: { $set: { name: 'X' } },
      log: makeMockLog(),
    }

    const result = await handleMultidbPatchMany.call(context, request)
    t.equal(callCount, 2, 'should only patch rome and milan')
    t.equal(result, 4, '2 scopes × 2 docs = 4')
  })

  t.test('returns 0 when all scopes error', async(t) => {
    const multidb = makeMockMultidb(['rome'])
    multidb.defaultScope = 'rome'

    const context = {
      multidb,
      modelName: 'tickets',
      allFieldNames: ['name'],
      queryParser: makeMockQueryParser(),
      crudService: {
        _mongoCollection: {},
        async patchMany() { throw new Error('db down') },
      },
    }

    const request = {
      query: { _st: 'PUBLIC' },
      headers: {},
      crudContext: { userId: 'user1', now: new Date() },
      body: { $set: { name: 'X' } },
      log: makeMockLog(),
    }

    const result = await handleMultidbPatchMany.call(context, request)
    t.equal(result, 0)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// handleMultidbPatchBulk
// ────────────────────────────────────────────────────────────────────────────

test('handleMultidbPatchBulk', async(t) => {
  t.test('sums modifiedCount across scopes with deep-cloned body', async(t) => {
    const multidb = makeMockMultidb(['rome', 'milan'])
    multidb.defaultScope = 'rome'
    const receivedBodies = []

    const context = {
      multidb,
      modelName: 'tickets',
      allFieldNames: ['name'],
      queryParser: makeMockQueryParser(),
      crudService: {
        _mongoCollection: {},
        async patchBulk(_ctx, filterUpdateCommands) {
          receivedBodies.push(filterUpdateCommands)
          // Mutate to test isolation
          filterUpdateCommands[0].mutated = true
          return 5
        },
      },
    }

    const request = {
      body: [
        { filter: { _st: 'PUBLIC' }, update: { $set: { name: 'A' } } },
      ],
      crudContext: { userId: 'user1', now: new Date() },
      headers: { 'x-scope': 'rome,milan' },
      log: makeMockLog(),
    }

    const result = await handleMultidbPatchBulk.call(context, request)
    t.equal(result, 10, '2 scopes × 5 = 10')
    // Verify deep cloning: original body should NOT be mutated
    t.notOk(request.body[0].mutated, 'original body should not be mutated')
    // Each scope received its own copy
    t.equal(receivedBodies.length, 2)
    t.not(receivedBodies[0], receivedBodies[1], 'each scope gets a different object')
  })

  t.test('defaults to DEFAULT_SCOPE when x-scope missing', async(t) => {
    const multidb = makeMockMultidb(['rome', 'milan', 'naples'])
    multidb.defaultScope = 'rome'
    let callCount = 0

    const context = {
      multidb,
      modelName: 'tickets',
      allFieldNames: ['name'],
      queryParser: makeMockQueryParser(),
      crudService: {
        _mongoCollection: {},
        async patchBulk() { callCount += 1; return 1 },
      },
    }

    const request = {
      body: [{ filter: { _st: 'PUBLIC' }, update: { $set: { name: 'B' } } }],
      crudContext: { userId: 'u1', now: new Date() },
      headers: {},
      log: makeMockLog(),
    }

    const result = await handleMultidbPatchBulk.call(context, request)
    t.equal(callCount, 1, 'only DEFAULT_SCOPE called')
    t.equal(result, 1)
  })
})
