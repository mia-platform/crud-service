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
const { ObjectId } = require('mongodb')
const { getDatabaseNameByType } = require('../lib/pkFactories')
const { fixtures, stationFixtures } = require('./utils')
const { setUpMultipleCollectionTest } = require('./httpInterface.utils')

const multipleFixtures = {
  books: fixtures,
  stations: stationFixtures,
}

test('Fastify register two different mongo instance', async t => {
  const { fastify } = await setUpMultipleCollectionTest(t, multipleFixtures, ['books', 'stations'])
  const mongoDbStringCollection = fastify.mongo[getDatabaseNameByType('string')].db.collection('books')
  const mongoDbObjectIdCollection = fastify.mongo[getDatabaseNameByType('ObjectId')].db.collection('stations')

  await t.test('Collection exists', async t => {
    t.assert.ok(mongoDbStringCollection)
    t.assert.ok(mongoDbObjectIdCollection)
  })

  await t.test('The correct pkFactory is used and different ids are generated', async t => {
    const stringIdentifier = 'stringIdentifier'
    const objectIdIdentifier = 'objectIdIdentifier'

    await mongoDbStringCollection.insertOne({ testIdentifier: stringIdentifier })
    await mongoDbObjectIdCollection.insertOne({ testIdentifier: objectIdIdentifier })

    const stringDocument = await mongoDbStringCollection.findOne({ testIdentifier: stringIdentifier })
    const objectIdDocument = await mongoDbObjectIdCollection.findOne({ testIdentifier: objectIdIdentifier })

    t.assert.ok(stringDocument)
    t.assert.ok(objectIdDocument)

    t.assert.throws(() => new ObjectId(stringDocument._id))
    t.assert.doesNotThrow(() => new ObjectId(objectIdDocument._id))
  })
}).then()
