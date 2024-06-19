'use strict'

const tap = require('tap')

const { getAccept, getReplyTypeCallback } = require('../lib/acceptHeaderParser')

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

tap.test('getReplyTypeCallback', t => {
  const defaultAccept = 'application/json';
  const callback = getReplyTypeCallback(defaultAccept);

  t.test('should return defaultAccept when acceptHeader is empty', t => {
    const result = callback('');
    t.equal(result, defaultAccept, 'Expected to return the defaultAccept');
    t.end();
  });

  t.test('should return defaultAccept when acceptHeader is undefined', t => {
    const result = callback();
    t.equal(result, defaultAccept, 'Expected to return the defaultAccept');
    t.end();
  });

  t.test('should return defaultAccept when acceptHeader is */*', t => {
    const result = callback('*/*');
    t.equal(result, defaultAccept, 'Expected to return the defaultAccept');
    t.end();
  });

  t.test('should return the first part of acceptHeader when it is not */* or empty', t => {
    const result = callback('text/html');
    t.equal(result, 'text/html', 'Expected to return the first part of acceptHeader');
    t.end();
  });

  t.test('should return the first part of acceptHeader when it has multiple types', t => {
    const result = callback('text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8');
    t.equal(result, 'text/html', 'Expected to return the first part of acceptHeader');
    t.end();
  });

  t.end();
});
