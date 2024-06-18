'use strict'

const tap = require('tap')

const { getAccept } = require('../lib/acceptHeaderParser')

tap.test('test HTTP Accept getter', t => {
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
    t.test(`- header: ${input}`, assert => {
      assert.strictSame(getAccept(input), output)
      assert.end()
    })
  })

  t.end()
})
