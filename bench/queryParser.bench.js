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

const QueryParser = require('../lib/QueryParser')
const collectionDefinition = require('../tests/collectionDefinitions/books')

const bench = require('fastbench')

const queryParser = new QueryParser(collectionDefinition)

const run = bench([
  function integer(done) {
    queryParser.parseAndCast({ price: 33.3 })
    process.nextTick(done)
  },
  function string(done) {
    queryParser.parseAndCast({ name: 'foo' })
    process.nextTick(done)
  },
  function integerDate(done) {
    queryParser.parseAndCast({ publishDate: 1517827514394 })
    process.nextTick(done)
  },
  function stringDate(done) {
    queryParser.parseAndCast({ publishDate: '2018-02-05T10:45:14.394Z' })
    process.nextTick(done)
  },
  function string24ObjectId(done) {
    queryParser.parseAndCast({ _id: 'aaaaaaaaaaaaaaaaaaaaaaaa' })
    process.nextTick(done)
  },
  function string12ObjectId(done) {
    queryParser.parseAndCast({ _id: 'bbbbbbbbbbbb' })
    process.nextTick(done)
  },
  function $and(done) {
    queryParser.parseAndCast({
      $and: [
        { name: 'foo' },
        { price: 33.3 },
        { publishDate: 1517827514394 },
      ],
    })
    process.nextTick(done)
  },
  function $or(done) {
    queryParser.parseAndCast({
      $or: [
        { name: 'foo' },
        { price: 33.3 },
        { publishDate: 1517827514394 },
      ],
    })
    process.nextTick(done)
  },
], 1000000)

run(run)
