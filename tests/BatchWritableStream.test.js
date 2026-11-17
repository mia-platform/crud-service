/*
 * Copyright 2023 Mia s.r.l.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict'

const { test } = require('node:test')
const { once } = require('node:events')
const BatchWritableStream = require('../lib/BatchWritableStream')

test('BatchWritableStream', async t => {
  t.test('requires an async processBatch ', async t => {
    t.assert.throws(() => new BatchWritableStream({}),
      { message: 'BatchWritableStream requires an async "processBatch" function' })

    t.assert.throws(() => new BatchWritableStream({
      processBatch: () => ({}),
    }), { message: 'BatchWritableStream requires an async "processBatch" function' })

    t.assert.doesNotThrow(() => new BatchWritableStream({
      processBatch: async() => ({}),
    }))
  })

  t.test('should call processBatch only when batch is full', async t => {
    const expectedBatches = [['a', '142'], ['c']]
    const valueToProcess = expectedBatches.flat()
    const results = []
    const batchWritableStream = new BatchWritableStream({
      processBatch: async(batch) => { results.push(batch.map(val => val.toString())) },
      batchSize: 2,
    })

    for (let i = 0; i < valueToProcess.length; i++) {
      await batchWritableStream.write(valueToProcess[i])
    }

    await batchWritableStream.end()
    t.assert.deepStrictEqual(results, expectedBatches)
  })

  t.test('should call processBatch at the end of the stream', async t => {
    const valueToProcess = ['a', 'b', '123', 'foo', 'bar']
    const results = []
    const batchWritableStream = new BatchWritableStream({
      processBatch: async(batch) => { results.push(...batch.map(val => val.toString())) },
      batchSize: 100,
    })

    for (let i = 0; i < valueToProcess.length; i++) {
      await batchWritableStream.write(valueToProcess[i])
    }

    // BatchSize not reached, and not processBatch called
    t.assert.deepStrictEqual(results, [])

    // Flush the batch at the end
    await batchWritableStream.end()
    t.assert.deepStrictEqual(results, valueToProcess)
  })

  t.test('should do nothing the end of the stream if empty batch', t => {
    const valueToProcess = ['a', 'b', '123', 'foo', 'bar']
    const results = []
    const batchWritableStream = new BatchWritableStream({
      processBatch: async(batch) => { results.push(...batch.map(val => val.toString())) },
      batchSize: valueToProcess.length,
    })

    for (let i = 0; i < valueToProcess.length; i++) {
      batchWritableStream.write(valueToProcess[i])
    }

    // BatchSize not reached, and not processBatch called
    t.assert.deepStrictEqual(results, valueToProcess)

    // Flush the batch at the end
    batchWritableStream.end()
    t.assert.deepStrictEqual(results, valueToProcess)
  })

  t.test('should catch and returns errors', t => {
    const expectedErrorMessage = 'this is an error'

    const batchWritableStream = new BatchWritableStream({
      processBatch: async() => { throw new Error(expectedErrorMessage) },
      batchSize: 1,
    })

    batchWritableStream.write('foo')
    batchWritableStream.write('bar')
    batchWritableStream.end()
    once(batchWritableStream, 'error')
  })
})
