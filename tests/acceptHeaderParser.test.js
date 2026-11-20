'use strict'

const { test } = require('node:test')

const { getAccept, getReplyTypeCallback } = require('../lib/acceptHeaderParser')

test('test HTTP Accept getter', t => {
  const testCases = [
    {
      input: '',
      output: undefined,
    },
    {
      input: '*/*',
      output: '*/*',
    },
    {
      input: 'application/json;q=0.1',
      output: 'application/json',
    },
    {
      input: 'application/x-ndjson',
      output: 'application/x-ndjson',
    },
    {
      input: 'text/csv',
      output: 'text/csv',
    },
    {
      input: 'application/json, */*;q=0.5',
      output: 'application/json',
    },
    {
      input: 'application/x-ndjson, */*',
      output: 'application/x-ndjson',
    },
    {
      input: 'text/csv, */*',
      output: 'text/csv',
    },
    {
      input: 'application/x-ndjson;q=0.9, */*, text/csv;q=1.0',
      output: '*/*',
    },
    {
      input: 'application/x-ndjson;q=0.9, text/csv, */*',
      output: 'text/csv',
    },
    {
      input: 'application/x-ndjson;q=0.9, */*;q=1.0, text/csv;q=0.7',
      output: '*/*',
    },
    {
      input: 'application/json;q=0.9,text/csv;q=0.9',
      output: 'application/json',
    },
    {
      input: 'application/x-ndjson;q=0.6,*/*;q=0.5,text/csv',
      output: 'text/csv',
    },
    {
      input: 'application/x-ndjson; q=0.6, */*; q=0.5, text/csv',
      output: 'text/csv',
    },
  ]

  testCases.forEach(({ input, output }) => {
    t.test(`- header: ${input}`, t => {
      t.assert.deepStrictEqual(getAccept(input), output)
    })
  })
})

test('getReplyTypeCallback', t => {
  const defaultAccept = 'application/json'
  const replyTypeCallback = getReplyTypeCallback(defaultAccept)

  t.test('should return defaultAccept when acceptHeader is empty', t => {
    const result = replyTypeCallback('')
    t.assert.strictEqual(result, defaultAccept, 'Expected to return the defaultAccept')
  })

  t.test('should return defaultAccept when acceptHeader is undefined', t => {
    const result = replyTypeCallback()
    t.assert.strictEqual(result, defaultAccept, 'Expected to return the defaultAccept')
  })

  t.test('should return defaultAccept when acceptHeader is */*', t => {
    const result = replyTypeCallback('*/*')
    t.assert.strictEqual(result, defaultAccept, 'Expected to return the defaultAccept')
  })

  t.test('should return the first part of acceptHeader when it is not */* or empty', t => {
    const result = replyTypeCallback('text/html')
    t.assert.strictEqual(result, 'text/html', 'Expected to return the first part of acceptHeader')
  })

  t.test('should return the first part of acceptHeader when it has multiple types', t => {
    const result = replyTypeCallback('text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8')
    t.assert.strictEqual(result, 'text/html', 'Expected to return the first part of acceptHeader')
  })
})
