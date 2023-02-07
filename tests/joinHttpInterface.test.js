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

const { setUpTest } = require('./httpInterface.utils')

const peopleData = require('./fixtures/people')
const filmsData = require('./fixtures/films')
const addressesData = require('./fixtures/addresses')
const addressStatisticsData = require('./fixtures/address_statistics')

tap.test('HTTP POST /join', async t => {
  const { fastify, database } = await setUpTest(t)

  const peopleCollection = database.collection('people')
  const filmCollection = database.collection('films')
  const addressCollection = database.collection('addresses')
  const addressStatisticsCollection = database.collection('address-statistics')

  try {
    await peopleCollection.drop()
    await filmCollection.drop()
    await addressCollection.drop()
    await addressStatisticsCollection.drop()
  } catch (error) { /* NOOP - ignore errors when a resource is missing*/ }

  await peopleCollection.insertMany(peopleData)
  await filmCollection.insertMany(filmsData)
  await addressCollection.insertMany(addressesData)
  await addressStatisticsCollection.insertMany(addressStatisticsData)

  await fastify.ready()

  t.test('many-to-many', t => {
    t.test('ok - #1', async t => {
      t.plan(3)
      const response = await fastify.inject({
        method: 'POST',
        url: '/join/many-to-many/people-endpoint/films-endpoint/export',
        payload: {
          fromQueryFilter: {},
          toQueryFilter: {},
          asField: 'filmObjects',
          localField: 'films',
          foreignField: '_id',
        },
      })

      t.test('should return 200', t => {
        t.plan(1)
        t.strictSame(response.statusCode, 200)
      })
      t.test('should return "application/x-ndjson"', t => {
        t.plan(1)
        t.ok(/application\/x-ndjson/.test(response.headers['content-type']))
      })
      t.test('should return the expected body', t => {
        t.plan(1)

        const lines = response.payload.split('\n')
          .filter(s => s !== '')
          .map(JSON.parse)
        t.strictSame(lines, [
          {
            _id: '111111111111111111111111',
            filmObjects: [
              {
                _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
                title: 'A New Hope',
                episode_id: 1,
              },
            ],
            films: [
              'aaaaaaaaaaaaaaaaaaaaaaaa',
            ],
            height: 172,
            name: 'Luke, Skywalker',
          },
          {
            _id: '222222222222222222222222',
            filmObjects: [
              {
                _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
                title: 'Attack of the Clones',
                episode_id: 2,
              },
            ],
            films: [
              'bbbbbbbbbbbbbbbbbbbbbbbb',
            ],
            height: 167,
            name: 'C-3PO',
          },
          {
            _id: '333333333333333333333333',
            filmObjects: [
            ],
            films: [
            ],
            height: 96,
            name: 'R2-D2',
          },
          {
            _id: '444444444444444444444444',
            filmObjects: [
              {
                _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
                title: 'A New Hope',
                episode_id: 1,
              },
              {
                _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
                title: 'Attack of the Clones',
                episode_id: 2,
              },
              {
                _id: 'cccccccccccccccccccccccc',
                title: 'The Phantom Menace',
                episode_id: 3,
              },
            ],
            films: [
              'aaaaaaaaaaaaaaaaaaaaaaaa',
              'bbbbbbbbbbbbbbbbbbbbbbbb',
              'cccccccccccccccccccccccc',
            ],
            height: 202,
            name: 'Darth Vader',
          },
          {
            _id: '555555555555555555555555',
            filmObjects: [
            ],
            name: 'wrong data',
          },
        ])
      })
    })

    t.test('ko - first collection does not exist', async t => {
      t.plan(3)
      const response = await fastify.inject({
        method: 'POST',
        url: '/join/many-to-many/people_endpoint/films-endpoint/export',
        payload: {
          fromQueryFilter: {},
          toQueryFilter: {},
          asField: 'filmObjects',
          localField: 'films',
          foreignField: '_id',
        },
      })

      t.test('should return 404', t => {
        t.plan(1)
        t.strictSame(response.statusCode, 404, response.payload)
      })
      t.test('should return "application/json"', t => {
        t.plan(1)
        t.ok(/application\/json/.test(response.headers['content-type']))
      })
      t.test('should return the expected body', t => {
        t.plan(1)

        const actualBody = JSON.parse(response.payload)
        t.strictSame(actualBody, {
          error: 'Not Found',
          statusCode: 404,
          message: 'CRUD endpoint "people_endpoint" does not exist',
        })
      })
    })

    t.end()
  })

  t.test('one-to-many', t => {
    t.test('ok - #1', async t => {
      t.plan(3)
      const response = await fastify.inject({
        method: 'POST',
        url: '/join/one-to-many/addresses-endpoint/address-statistics-endpoint/export',
        payload: {
          asField: 'stats',
          localField: '_id',
          foreignField: 'addressId',
        },
      })

      t.test('should return 200', t => {
        t.plan(1)
        t.strictSame(response.statusCode, 200)
      })
      t.test('should return "application/x-ndjson"', t => {
        t.plan(1)
        t.ok(/application\/x-ndjson/.test(response.headers['content-type']))
      })
      t.test('should return the expected body', t => {
        t.plan(1)

        const lines = response.payload.split('\n')
          .filter(s => s !== '')
          .map(JSON.parse)
        t.strictSame(lines, [
          {
            _id: '111111111111111111111111',
            displayName: 'via Calatafimi, 11',
            street: 'via Calatafimi',
            house_number: 11,
            stats: [
              {
                _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
                addressId: '111111111111111111111111',
                count: 1,
                tag: 'tag1',
              },
              {
                _id: 'dddddddddddddddddddddddd',
                addressId: '111111111111111111111111',
                count: 4,
                tag: 'tag2',
              },
            ],
          },
          {
            _id: '222222222222222222222222',
            displayName: 'via dei Pazzi, 0',
            house_number: 0,
            street: 'via dei Pazzi',
            stats: [
              {
                _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
                addressId: '222222222222222222222222',
                count: 2,
                tag: 'tag1',
              },
              {
                _id: 'eeeeeeeeeeeeeeeeeeeeeeee',
                addressId: '222222222222222222222222',
                count: 5,
                tag: 'tag2',
              },
              {
                _id: 'ffffffffffffffffffffffff',
                addressId: '222222222222222222222222',
                count: 6,
                tag: 'tag3',
              },
            ],
          },
          {
            _id: '333333333333333333333333',
            displayName: 'via Cilea, 123',
            house_number: 123,
            street: 'via Cilea',
            stats: [
              {
                _id: 'cccccccccccccccccccccccc',
                addressId: '333333333333333333333333',
                count: 3,
                tag: 'tag1',
              },
            ],
          },
        ])
      })
    })

    t.test('ok - fromQueryFilter', async t => {
      t.plan(3)
      const response = await fastify.inject({
        method: 'POST',
        url: '/join/one-to-many/addresses-endpoint/address-statistics-endpoint/export',
        payload: {
          asField: 'stats',
          localField: '_id',
          foreignField: 'addressId',
          fromQueryFilter: { house_number: 11 },
        },
      })

      t.test('should return 200', t => {
        t.plan(1)
        t.strictSame(response.statusCode, 200)
      })
      t.test('should return "application/x-ndjson"', t => {
        t.plan(1)
        t.ok(/application\/x-ndjson/.test(response.headers['content-type']))
      })
      t.test('should return the expected body', t => {
        t.plan(1)

        const lines = response.payload.split('\n')
          .filter(s => s !== '')
          .map(JSON.parse)
        t.strictSame(lines, [
          {
            _id: '111111111111111111111111',
            displayName: 'via Calatafimi, 11',
            street: 'via Calatafimi',
            house_number: 11,
            stats: [
              {
                _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
                addressId: '111111111111111111111111',
                count: 1,
                tag: 'tag1',
              },
              {
                _id: 'dddddddddddddddddddddddd',
                addressId: '111111111111111111111111',
                count: 4,
                tag: 'tag2',
              },
            ],
          },
        ])
      })
    })

    t.test('ok - toQueryFilter', async t => {
      t.plan(3)
      const response = await fastify.inject({
        method: 'POST',
        url: '/join/one-to-many/addresses-endpoint/address-statistics-endpoint/export',
        payload: {
          asField: 'stats',
          localField: '_id',
          foreignField: 'addressId',
          toQueryFilter: { count: 1 },
        },
      })

      t.test('should return 200', t => {
        t.plan(1)
        t.strictSame(response.statusCode, 200)
      })
      t.test('should return "application/x-ndjson"', t => {
        t.plan(1)
        t.ok(/application\/x-ndjson/.test(response.headers['content-type']))
      })
      t.test('should return the expected body', t => {
        t.plan(1)

        const lines = response.payload.split('\n')
          .filter(s => s !== '')
          .map(JSON.parse)
        t.strictSame(lines, [
          {
            _id: '111111111111111111111111',
            displayName: 'via Calatafimi, 11',
            street: 'via Calatafimi',
            house_number: 11,
            stats: [
              {
                _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
                addressId: '111111111111111111111111',
                count: 1,
                tag: 'tag1',
              },
            ],
          },
          {
            _id: '222222222222222222222222',
            displayName: 'via dei Pazzi, 0',
            house_number: 0,
            street: 'via dei Pazzi',
            stats: [
            ],
          },
          {
            _id: '333333333333333333333333',
            displayName: 'via Cilea, 123',
            house_number: 123,
            street: 'via Cilea',
            stats: [
            ],
          },
        ])
      })
    })

    t.test('ko - second collection does not exist', async t => {
      t.plan(3)
      const response = await fastify.inject({
        method: 'POST',
        url: '/join/one-to-many/addresses-endpoint/address_statistics_endpoint/export',
        payload: {
          asField: 'stats',
          localField: '_id',
          foreignField: 'addressId',
          toQueryFilter: { count: 1 },
        },
      })

      t.test('should return 404', t => {
        t.plan(1)
        t.strictSame(response.statusCode, 404, response.payload)
      })
      t.test('should return "application/json"', t => {
        t.plan(1)
        t.ok(/application\/json/.test(response.headers['content-type']))
      })
      t.test('should return the expected body', t => {
        t.plan(1)

        const actualBody = JSON.parse(response.payload)
        t.strictSame(actualBody, {
          error: 'Not Found',
          statusCode: 404,
          message: 'CRUD endpoint "address_statistics_endpoint" does not exist',
        })
      })
    })

    t.end()
  })

  t.test('one-to-one', t => {
    t.test('ok - #1', async t => {
      t.plan(3)
      const response = await fastify.inject({
        method: 'POST',
        url: '/join/one-to-one/addresses-endpoint/address-statistics-endpoint/export',
        payload: {
          asField: 'stats',
          localField: '_id',
          foreignField: 'addressId',
          toMerge: true,
        },
      })

      t.test('should return 200', t => {
        t.plan(1)
        t.strictSame(response.statusCode, 200)
      })
      t.test('should return "application/x-ndjson"', t => {
        t.plan(1)
        t.ok(/application\/x-ndjson/.test(response.headers['content-type']))
      })
      t.test('should return the expected body', t => {
        t.plan(1)

        const lines = response.payload.split('\n')
          .filter(s => s !== '')
          .map(JSON.parse)
        t.strictSame(lines, [
          {
            _id: '111111111111111111111111',
            addressId: '111111111111111111111111',
            count: 1,
            tag: 'tag1',
            displayName: 'via Calatafimi, 11',
            street: 'via Calatafimi',
            house_number: 11,
          },
          {
            _id: '222222222222222222222222',
            addressId: '222222222222222222222222',
            count: 2,
            displayName: 'via dei Pazzi, 0',
            house_number: 0,
            street: 'via dei Pazzi',
            tag: 'tag1',
          },
          {
            _id: '333333333333333333333333',
            addressId: '333333333333333333333333',
            count: 3,
            displayName: 'via Cilea, 123',
            house_number: 123,
            street: 'via Cilea',
            tag: 'tag1',
          },
        ])
      })
    })

    t.test('ok - fromQueryFilter', async t => {
      t.plan(3)
      const response = await fastify.inject({
        method: 'POST',
        url: '/join/one-to-one/addresses-endpoint/address-statistics-endpoint/export',
        payload: {
          asField: 'stats',
          localField: '_id',
          foreignField: 'addressId',
          fromQueryFilter: { house_number: 11 },
          toMerge: true,
        },
      })

      t.test('should return 200', t => {
        t.plan(1)
        t.strictSame(response.statusCode, 200)
      })
      t.test('should return "application/x-ndjson"', t => {
        t.plan(1)
        t.ok(/application\/x-ndjson/.test(response.headers['content-type']))
      })
      t.test('should return the expected body', t => {
        t.plan(1)

        const lines = response.payload.split('\n')
          .filter(s => s !== '')
          .map(JSON.parse)
        t.strictSame(lines, [
          {
            _id: '111111111111111111111111',
            addressId: '111111111111111111111111',
            count: 1,
            tag: 'tag1',
            displayName: 'via Calatafimi, 11',
            street: 'via Calatafimi',
            house_number: 11,
          },
        ])
      })
    })

    t.test('ok - toQueryFilter', async t => {
      t.plan(3)
      const response = await fastify.inject({
        method: 'POST',
        url: '/join/one-to-one/addresses-endpoint/address-statistics-endpoint/export',
        payload: {
          asField: 'stats',
          localField: '_id',
          foreignField: 'addressId',
          toQueryFilter: { count: 1 },
          toMerge: true,
        },
      })

      t.test('should return 200', t => {
        t.plan(1)
        t.strictSame(response.statusCode, 200)
      })
      t.test('should return "application/x-ndjson"', t => {
        t.plan(1)
        t.ok(/application\/x-ndjson/.test(response.headers['content-type']))
      })
      t.test('should return the expected body', t => {
        t.plan(1)

        const lines = response.payload.split('\n')
          .filter(s => s !== '')
          .map(JSON.parse)
        t.strictSame(lines, [
          {
            _id: '111111111111111111111111',
            addressId: '111111111111111111111111',
            count: 1,
            tag: 'tag1',
            displayName: 'via Calatafimi, 11',
            street: 'via Calatafimi',
            house_number: 11,
          },
          {
            _id: '222222222222222222222222',
            displayName: 'via dei Pazzi, 0',
            house_number: 0,
            street: 'via dei Pazzi',
          },
          {
            _id: '333333333333333333333333',
            displayName: 'via Cilea, 123',
            house_number: 123,
            street: 'via Cilea',
          },
        ])
      })
    })

    t.test('ok - merge false', async t => {
      t.plan(3)
      const response = await fastify.inject({
        method: 'POST',
        url: '/join/one-to-one/addresses-endpoint/address-statistics-endpoint/export',
        payload: {
          asField: 'stats',
          localField: '_id',
          foreignField: 'addressId',
          toQueryFilter: { count: 1 },
          toMerge: false,
        },
      })

      t.test('should return 200', t => {
        t.plan(1)
        t.strictSame(response.statusCode, 200)
      })
      t.test('should return "application/x-ndjson"', t => {
        t.plan(1)
        t.ok(/application\/x-ndjson/.test(response.headers['content-type']))
      })
      t.test('should return the expected body', t => {
        t.plan(1)

        const lines = response.payload.split('\n')
          .filter(s => s !== '')
          .map(JSON.parse)
        t.strictSame(lines, [
          {
            _id: '111111111111111111111111',
            displayName: 'via Calatafimi, 11',
            street: 'via Calatafimi',
            house_number: 11,
            stats: {
              _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
              addressId: '111111111111111111111111',
              count: 1,
              tag: 'tag1',
            },
          },
          {
            _id: '222222222222222222222222',
            displayName: 'via dei Pazzi, 0',
            house_number: 0,
            street: 'via dei Pazzi',
            stats: null,
          },
          {
            _id: '333333333333333333333333',
            displayName: 'via Cilea, 123',
            house_number: 123,
            street: 'via Cilea',
            stats: null,
          },
        ])
      })
    })

    t.test('ok - _id', async t => {
      t.plan(3)
      const response = await fastify.inject({
        method: 'POST',
        url: '/join/one-to-one/addresses-endpoint/address-statistics-endpoint/export',
        payload: {
          fromQueryFilter: { _id: '111111111111111111111111' },
          asField: 'stats',
          localField: '_id',
          foreignField: 'addressId',
          toMerge: true,
        },
      })

      t.test('should return 200', t => {
        t.plan(1)
        t.strictSame(response.statusCode, 200)
      })
      t.test('should return "application/x-ndjson"', t => {
        t.plan(1)
        t.ok(/application\/x-ndjson/.test(response.headers['content-type']))
      })
      t.test('should return the expected body', t => {
        t.plan(1)

        const lines = response.payload.split('\n')
          .filter(s => s !== '')
          .map(JSON.parse)
        t.strictSame(lines, [
          {
            _id: '111111111111111111111111',
            addressId: '111111111111111111111111',
            count: 1,
            tag: 'tag1',
            displayName: 'via Calatafimi, 11',
            street: 'via Calatafimi',
            house_number: 11,
          },
        ])
      })
    })

    t.test('ok - addressId', async t => {
      t.plan(3)
      const response = await fastify.inject({
        method: 'POST',
        url: '/join/one-to-one/addresses-endpoint/address-statistics-endpoint/export',
        payload: {
          toQueryFilter: { addressId: '111111111111111111111111' },
          asField: 'stats',
          localField: '_id',
          foreignField: 'addressId',
          toMerge: true,
        },
      })

      t.test('should return 200', t => {
        t.plan(1)
        t.strictSame(response.statusCode, 200)
      })
      t.test('should return "application/x-ndjson"', t => {
        t.plan(1)
        t.ok(/application\/x-ndjson/.test(response.headers['content-type']))
      })
      t.test('should return the expected body', t => {
        t.plan(1)

        const lines = response.payload.split('\n')
          .filter(s => s !== '')
          .map(JSON.parse)
        t.strictSame(lines, [
          {
            _id: '111111111111111111111111',
            addressId: '111111111111111111111111',
            count: 1,
            tag: 'tag1',
            displayName: 'via Calatafimi, 11',
            street: 'via Calatafimi',
            house_number: 11,
          },
          {
            _id: '222222222222222222222222',
            displayName: 'via dei Pazzi, 0',
            house_number: 0,
            street: 'via dei Pazzi',
          },
          {
            _id: '333333333333333333333333',
            displayName: 'via Cilea, 123',
            house_number: 123,
            street: 'via Cilea',
          },
        ])
      })
    })

    t.test('ko - both collections do not exist', async t => {
      t.plan(3)
      const response = await fastify.inject({
        method: 'POST',
        url: '/join/one-to-one/addresses_endpoint/address_statistics_endpoint/export',
        payload: {
          asField: 'stats',
          localField: '_id',
          foreignField: 'addressId',
          toQueryFilter: { count: 1 },
          toMerge: true,
        },
      })

      t.test('should return 404', t => {
        t.plan(1)
        t.strictSame(response.statusCode, 404, response.payload)
      })
      t.test('should return "application/json"', t => {
        t.plan(1)
        t.ok(/application\/json/.test(response.headers['content-type']))
      })
      t.test('should return the expected body', t => {
        t.plan(1)

        const actualBody = JSON.parse(response.payload)
        t.strictSame(actualBody, {
          error: 'Not Found',
          statusCode: 404,
          message: 'CRUD endpoint "addresses_endpoint" does not exist',
        })
      })
    })

    t.test('return json', async t => {
      t.plan(3)
      const response = await fastify.inject({
        method: 'POST',
        url: '/join/one-to-one/addresses-endpoint/address-statistics-endpoint/',
        payload: {
          asField: 'stats',
          localField: '_id',
          foreignField: 'addressId',
          toQueryFilter: { count: 1 },
          toMerge: true,
        },
      })

      t.test('should return 200', t => {
        t.plan(1)
        t.strictSame(response.statusCode, 200)
      })
      t.test('should return "application/json"', t => {
        t.plan(1)
        t.ok(/application\/json/.test(response.headers['content-type']))
      })
      t.test('should return the expected body', t => {
        t.plan(1)

        const lines = JSON.parse(response.payload)
        t.strictSame(lines, [
          {
            _id: '111111111111111111111111',
            addressId: '111111111111111111111111',
            count: 1,
            tag: 'tag1',
            displayName: 'via Calatafimi, 11',
            street: 'via Calatafimi',
            house_number: 11,
          },
          {
            _id: '222222222222222222222222',
            displayName: 'via dei Pazzi, 0',
            house_number: 0,
            street: 'via dei Pazzi',
          },
          {
            _id: '333333333333333333333333',
            displayName: 'via Cilea, 123',
            house_number: 123,
            street: 'via Cilea',
          },
        ])
      })
    })

    t.test('return json ko - collection does not exist', async t => {
      t.plan(3)
      const response = await fastify.inject({
        method: 'POST',
        url: '/join/one-to-one/addresses_endpoint/address_statistics_endpoint/',
        payload: {
          asField: 'stats',
          localField: '_id',
          foreignField: 'addressId',
          toQueryFilter: { count: 1 },
          toMerge: true,
        },
      })

      t.test('should return 404', t => {
        t.plan(1)
        t.strictSame(response.statusCode, 404, response.payload)
      })
      t.test('should return "application/json"', t => {
        t.plan(1)
        t.ok(/application\/json/.test(response.headers['content-type']))
      })
      t.test('should return the expected body', t => {
        t.plan(1)

        const actualBody = JSON.parse(response.payload)
        t.strictSame(actualBody, {
          error: 'Not Found',
          statusCode: 404,
          message: 'CRUD endpoint "addresses_endpoint" does not exist',
        })
      })
    })

    t.end()
  })
})
