'use strict'
const { Writable } = require('stream')

class BatchWritableStream extends Writable {
  constructor(options) {
    super(options)

    if (!options.processBatch || options.processBatch[Symbol.toStringTag] !== 'AsyncFunction') {
      throw new Error('BatchWritableStream requires an async "processBatch" function')
    }

    this.processBatch = options.processBatch
    this.batchSize = options.batchSize || 1000
    this.flushBatch()
  }

  flushBatch() {
    this.batch = []
  }

  _write(chunk, _encoding, callback) {
    this.batch.push(chunk)
    if (this.batch.length >= this.batchSize) {
      this.processBatch(this.batch)
        .then(() => {
          this.flushBatch()
          callback()
        })
        .catch((error) => callback(error))
    } else {
      return callback()
    }
  }

  _final(callback) {
    if (this.batch.length > 0) {
      this.processBatch(this.batch)
        .then(() => {
          this.flushBatch()
          callback()
        })
        .catch((error) => callback(error))
    } else {
      return callback()
    }
  }
}

module.exports = BatchWritableStream
