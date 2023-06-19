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
const path = require('path')
const lc39 = require('@mia-platform/lc39')
const { ObjectId, MongoClient } = require('mongodb')

const { getHeaders } = require('./httpInterface.utils')
const {
  viewPrefix,
  expectedOrderDetailsViewDocsPublic,
  ordersFixture,
  ridersFixture,
  expectedRidersLookup,
} = require('./viewUtils.utils')

const {
  getMongoDatabaseName,
  getMongoURL,
} = require('./utils')

const HTTP_PUBLIC_FIXTURES = JSON.parse(JSON.stringify(expectedOrderDetailsViewDocsPublic))
const COLLECTION_DEFINITION_FOLDER = path.join(__dirname, 'collectionDefinitions')
const VIEWS_DEFINITION_FOLDER = path.join(__dirname, 'viewsDefinitionsLookup')

tap.test('Writable views (enableLookups: true)', async t => {
  if (process.env.MONGO_VERSION <= '4.4') {
    t.skip('Lookup view not supported on Mongo version <= 4.4')
    return
  }
  const databaseName = getMongoDatabaseName()
  const mongoURL = getMongoURL(databaseName)

  const client = await MongoClient.connect(mongoURL)
  const database = client.db(databaseName)

  const logLevel = 'silent'
  const envVariables = {
    MONGODB_URL: mongoURL,
    COLLECTION_DEFINITION_FOLDER,
    USER_ID_HEADER_KEY: 'userId',
    VIEWS_DEFINITION_FOLDER,
  }

  const fastify = await lc39('./index', { logLevel, envVariables })

  t.teardown(async() => {
    await database.dropDatabase()
    await client.close()
    await fastify.close()
  })

  const ridersCollection = database.collection('riders')
  const ordersCollection = database.collection('orders')
  const orderDetailsCollection = database.collection('orders-details')

  const [newRider] = expectedRidersLookup
  const DOC = {
    rider: {
      value: newRider.value,
      label: newRider.label,
    },
    items: ['lasagna'],
  }

  t.beforeEach(async() => {
    try {
      await ridersCollection.drop()
      await ordersCollection.drop()
    } catch (error) { /* NOOP - ignore errors when a resource is missing*/ }

    await ordersCollection.insertMany(ordersFixture)
    await ridersCollection.insertMany(ridersFixture)
  })

  t.test('HTTP GET /orders-details-endpoint/', async t => {
    const tests = [
      {
        name: 'without filters',
        url: '/',
        acl_rows: undefined,
        found: HTTP_PUBLIC_FIXTURES,
      },
      {
        name: 'with sorting',
        url: '/?_s=rider.label',
        acl_rows: undefined,
        found: HTTP_PUBLIC_FIXTURES.concat([])
          .sort((a, b) => a.rider.label.localeCompare(b.rider.label)),
      },
      {
        name: 'with filter regex',
        url: `/?_q=${JSON.stringify({ 'rider.label': { $regex: 'Mar', $options: 'i' } })}`,
        acl_rows: undefined,
        found: HTTP_PUBLIC_FIXTURES.filter(f => /Mar/i.test(f.rider.label)),
      },
    ]

    tests.forEach(testConf => {
      const { name, found, ...conf } = testConf

      t.test(name, async t => {
        const response = await fastify.inject({
          method: 'GET',
          url: viewPrefix + conf.url,
          headers: getHeaders(conf),
        })

        t.test('should return 200', t => {
          t.strictSame(response.statusCode, 200, response.payload)
          t.end()
        })

        t.test('should return "application/json"', t => {
          t.strictSame(response.headers['content-type'], 'application/json')
          t.end()
        })

        t.test('should return the document', t => {
          t.strictSame(JSON.parse(response.payload), found)
          t.end()
        })

        t.end()
      })
    })

    t.test('should keep the document as is in database', async t => {
      const documents = await orderDetailsCollection.find().toArray()
      t.strictSame(documents, expectedOrderDetailsViewDocsPublic)
      t.end()
    })
  })

  t.test('HTTP POST /orders-details-endpoint/', async t => {
    t.test('with rider object instead of rider id', async t => {
      const response = await fastify.inject({
        method: 'POST',
        url: `${viewPrefix}/`,
        payload: {
          ...DOC,
        },
      })

      t.strictSame(response.statusCode, 200)

      const body = JSON.parse(response.payload)
      const viewDoc = await orderDetailsCollection.findOne({ _id: new ObjectId(body._id) })
      t.strictSame(viewDoc.rider, {
        value: newRider.value,
        label: newRider.label,
      })
      t.strictSame(viewDoc.items, ['lasagna'])
      t.notHas(viewDoc, 'id_rider')

      const orderDoc = await ordersCollection.findOne({ _id: new ObjectId(body._id) })
      t.strictSame(orderDoc.id_rider, newRider.value)
      t.strictSame(orderDoc.items, ['lasagna'])
      t.notHas(orderDoc, 'rider')

      t.end()
    })
  })

  t.test('HTTP PATCH /orders-details-endpoint/:id', async t => {
    const [{ _id, items }] = ordersFixture

    t.test('update rider object instead of rider id', async t => {
      const response = await fastify.inject({
        method: 'PATCH',
        url: `${viewPrefix}/${_id.toHexString()}`,
        payload: {
          $set: {
            rider: { ...DOC.rider },
          },
        },
      })

      t.strictSame(response.statusCode, 200)

      const body = JSON.parse(response.payload)
      t.strictSame(body.rider, {
        value: newRider.value.toString(),
        label: newRider.label,
      })
      t.strictSame(body.items, items)

      const viewDoc = await orderDetailsCollection.findOne({ _id })
      t.strictSame(viewDoc.rider, {
        value: newRider.value,
        label: newRider.label,
      })
      t.strictSame(viewDoc.items, items)
      t.notHas(viewDoc, 'id_rider')

      const orderDoc = await ordersCollection.findOne({ _id })
      t.strictSame(orderDoc.id_rider, newRider.value)
      t.strictSame(orderDoc.items, items)
      t.notHas(orderDoc, 'rider')

      t.end()
    })
  })

  t.test('HTTP DELETE /orders-details-endpoint/', async t => {
    const [{ _id }] = ordersFixture

    t.test('delete order throught view', async t => {
      const response = await fastify.inject({
        method: 'DELETE',
        url: `${viewPrefix}/${_id.toHexString()}`,
      })

      t.strictSame(response.statusCode, 204)

      const viewDoc = await orderDetailsCollection.findOne({ _id })
      t.strictSame(viewDoc, null)

      const orderDoc = await ordersCollection.findOne({ _id })
      t.strictSame(orderDoc, null)

      t.end()
    })

    t.test('delete each order throught view', async t => {
      const response = await fastify.inject({
        method: 'DELETE',
        url: `${viewPrefix}/`,
      })

      t.strictSame(response.statusCode, 200)
      t.strictSame(response.payload, '3')

      const viewDoc = await orderDetailsCollection.find().toArray()
      t.strictSame(viewDoc, [])

      const orderDoc = await ordersCollection.find().toArray()
      t.strictSame(orderDoc, [])

      t.end()
    })
  })
})


