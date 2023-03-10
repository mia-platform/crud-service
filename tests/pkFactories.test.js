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

const tap = require('tap')

const { pkFactories, castCollectionId } = require('../lib/pkFactories')
const { ObjectId } = require('mongodb')
const validate = require('uuid-validate')

const { stationFixtures } = require('./utils')
const { setUpTest } = require('./httpInterface.utils')

tap.test('pkFactories', async t => {
  const UUIDFactory = pkFactories.string
  const ObjectIdFactory = pkFactories.ObjectId

  t.test('A correct UUID is generated by the factory', assert => {
    assert.ok(validate(UUIDFactory.createPk(), 4))
    assert.end()
  })
  t.test('A correct ObjectId is generated by the factory', assert => {
    const newID = ObjectIdFactory.createPk().toHexString()
    assert.doesNotThrow(() => new ObjectId(newID), {}, { skip: false })
    assert.end()
  })
})

tap.test('castCollectionId', async t => {
  const { fastify } = await setUpTest(t, stationFixtures, 'stations')
  const castFunction = castCollectionId(fastify)

  const objectId = '111111111111111111111111'
  const stringId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

  t.test('works for both types of input', assert => {
    const castedObjectId = castFunction(objectId)
    const castedStringId = castFunction(stringId)

    assert.ok(castedObjectId)
    assert.equal(typeof castedObjectId, 'object')

    assert.ok(castedStringId)
    assert.equal(typeof castedStringId, 'string')

    assert.end()
  })
})
