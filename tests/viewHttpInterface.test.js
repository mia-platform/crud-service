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
  expectedOrderDetailsViewDocsPublic,
  ordersFixture,
  ridersFixture,
  expectedRidersLookup,
} = require('./viewUtils.utils')

const itemsFixtures = require('./fixtures/items')
const orderItemsFixtures = require('./fixtures/orders-items')

const {
  getMongoDatabaseName,
  getMongoURL,
} = require('./utils')

const HTTP_PUBLIC_FIXTURES = JSON.parse(JSON.stringify(expectedOrderDetailsViewDocsPublic))
const COLLECTION_DEFINITION_FOLDER = path.join(__dirname, 'collectionDefinitions')
const VIEWS_DEFINITION_FOLDER = path.join(__dirname, 'viewsDefinitionsLookup')

tap.test('Writable views (enableLookups: true)', async t => {
  if (process.env.MONGO_VERSION <= '4.4') {
    t.test('Writable views not supported on Mongo version <= 4.4')
    return
  }

  const viewPrefix = '/orders-details-endpoint'

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
    await fastify.close()
    await database.dropDatabase()
    await client.close()
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
    items: [ObjectId.createFromHexString('888888888888888888888888')],
    paid: true,
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
      t.strictSame(viewDoc.items, ['888888888888888888888888'])
      t.notHas(viewDoc, 'id_rider')

      const orderDoc = await ordersCollection.findOne({ _id: new ObjectId(body._id) })
      t.strictSame(orderDoc.id_rider, newRider.value)
      t.strictSame(orderDoc.items, ['888888888888888888888888'])
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
      t.strictSame(body.items, items.map(it => it.toHexString()))

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


tap.test('Writable views - list of lookup references', async t => {
  if (process.env.MONGO_VERSION <= '4.4') {
    t.test('Writable views not supported on Mongo version <= 4.4')
    return
  }

  const viewPrefix = '/orders-items-endpoint'

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
    await fastify.close()
    await database.dropDatabase()
    await client.close()
  })

  const itemsCollection = database.collection('items')
  const ordersCollection = database.collection('orders')
  const orderItemsCollection = database.collection('orders-items')

  t.beforeEach(async() => {
    try {
      await itemsCollection.drop()
      await ordersCollection.drop()
    } catch (error) { /* NOOP - ignore errors when a resource is missing*/
    }

    await ordersCollection.insertMany(ordersFixture)
    await itemsCollection.insertMany(itemsFixtures)
  })

  t.test('HTTP GET /orders-items-endpoint/', async t => {
    const tests = [
      {
        name: 'without filters',
        url: '/',
        acl_rows: undefined,
        found: orderItemsFixtures.response,
      },
      {
        name: 'with filter regex',
        url: `/?_q=${JSON.stringify({ 'items.label': { $regex: 'piz', $options: 'i' } })}`,
        acl_rows: undefined,
        found: [orderItemsFixtures.response[1]],
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
          t.strictSame(response.statusCode, 200)
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
      const documents = await orderItemsCollection.find().toArray()
      t.strictSame(documents, orderItemsFixtures.documents)
      t.end()
    })
  })

  t.test('HTTP POST /orders-items-endpoint/', async t => {
    t.test('with items object list instead of ids list', async t => {
      const response = await fastify.inject({
        method: 'POST',
        url: `${viewPrefix}/`,
        payload: {
          items: [{
            value: '888888888888888888888888',
            label: 'piadina',
          }],
          paid: false,
        },
      })

      t.strictSame(response.statusCode, 200)

      const body = JSON.parse(response.payload)
      const viewDoc = await orderItemsCollection.findOne({ _id: new ObjectId(body._id) })
      t.strictSame(viewDoc.items, [
        {
          value: ObjectId.createFromHexString('888888888888888888888888'),
          label: 'piadina',
        }]
      )
      t.strictSame(viewDoc.paid, false)

      const orderDoc = await ordersCollection.findOne({ _id: new ObjectId(body._id) })
      t.notHas(orderDoc, 'id_rider')
      t.strictSame(orderDoc.items, [ObjectId.createFromHexString('888888888888888888888888')])
      t.strictSame(orderDoc.paid, false)

      t.end()
    })
  })

  t.test('HTTP PATCH /orders-items-endpoint/', async t => {
    t.test('with items object list instead of ids list', async t => {
      const [orderItems] = orderItemsFixtures.response

      const response = await fastify.inject({
        method: 'PATCH',
        url: `${viewPrefix}/${orderItems._id}`,
        payload: {
          $push: {
            items: {
              value: '888888888888888888888888',
              label: 'piadina',
            },
          },
        },
      })

      t.strictSame(response.statusCode, 200)

      const body = JSON.parse(response.payload)
      t.strictSame(
        body.items,
        [
          { value: '555555555555555555555555', label: 'spatzle' },
          { value: '666666666666666666666666', label: 'lasagna' },
          { value: '888888888888888888888888', label: 'piadina' },
        ]
      )

      const viewDoc = await orderItemsCollection.findOne({ _id: new ObjectId(orderItems._id) })
      t.strictSame(
        viewDoc.items,
        [
          { value: ObjectId.createFromHexString('555555555555555555555555'), label: 'spatzle' },
          { value: ObjectId.createFromHexString('666666666666666666666666'), label: 'lasagna' },
          { value: ObjectId.createFromHexString('888888888888888888888888'), label: 'piadina' },
        ]
      )
      t.strictSame(viewDoc.paid, true)

      const orderDoc = await ordersCollection.findOne({ _id: new ObjectId(orderItems._id) })
      t.strictSame(orderDoc.items, [
        ObjectId.createFromHexString('555555555555555555555555'),
        ObjectId.createFromHexString('666666666666666666666666'),
        ObjectId.createFromHexString('888888888888888888888888'),
      ])
      t.strictSame(orderDoc.paid, true)

      t.end()
    })
  })
})
