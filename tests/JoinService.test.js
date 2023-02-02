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
const abstractLogger = require('abstract-logging')
const { MongoClient, ObjectId } = require('mongodb')

const JoinService = require('../lib/JoinService')

const peopleData = require('./fixtures/people')
const filmsData = require('./fixtures/films')
const addressesData = require('./fixtures/addresses')
const addressStatisticsData = require('./fixtures/address_statistics')

const peopleDef = require('./collectionDefinitions/people')
const filmsDef = require('./collectionDefinitions/films')
const addressesDef = require('./collectionDefinitions/addresses')
const addressStatisticsDef = require('./collectionDefinitions/address_statistics')

const {
  getMongoDatabaseName,
  getMongoURL,
} = require('./utils')

const context = {
  log: abstractLogger,
  userId: 'my-user-id',
  now: new Date('2018-02-08'),
}

tap.test('JoinService', async t => {
  const databaseName = getMongoDatabaseName()
  const mongoURL = getMongoURL(databaseName)

  const client = await MongoClient.connect(mongoURL)
  const database = client.db(databaseName)

  t.teardown(async() => {
    await database.dropDatabase()
    await client.close()
  })

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

  const joinService = new JoinService(database, [
    { definition: peopleDef },
    { definition: filmsDef },
    { definition: addressesDef },
    { definition: addressStatisticsDef },
  ])

  t.test('joinManyToMany', t => {
    t.test('people join films', async t => {
      const people = await joinService.joinManyToMany(context, {
        from: 'people-endpoint',
        to: 'films-endpoint',
        fromQueryFilter: {},
        toQueryFilter: {},
        asField: 'filmObjects',
        localField: 'films',
        foreignField: '_id',
      }).toArray()

      t.strictSame(people, [
        {
          _id: new ObjectId('111111111111111111111111'),
          filmObjects: [
            {
              _id: new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
              title: 'A New Hope',
              episode_id: 1,
            },
          ],
          films: [
            new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
          ],
          height: 172,
          name: 'Luke, Skywalker',
        },
        {
          _id: new ObjectId('222222222222222222222222'),
          filmObjects: [
            {
              _id: new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
              title: 'Attack of the Clones',
              episode_id: 2,
            },
          ],
          films: [
            new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
          ],
          height: 167,
          name: 'C-3PO',
        },
        {
          _id: new ObjectId('333333333333333333333333'),
          filmObjects: [
          ],
          films: [
          ],
          height: 96,
          name: 'R2-D2',
        },
        {
          _id: new ObjectId('444444444444444444444444'),
          filmObjects: [
            {
              _id: new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
              title: 'A New Hope',
              episode_id: 1,
            },
            {
              _id: new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
              title: 'Attack of the Clones',
              episode_id: 2,
            },
            {
              _id: new ObjectId('cccccccccccccccccccccccc'),
              title: 'The Phantom Menace',
              episode_id: 3,
            },
          ],
          films: [
            new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
            new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
            new ObjectId('cccccccccccccccccccccccc'),
          ],
          height: 202,
          name: 'Darth Vader',
        },
        {
          _id: new ObjectId('555555555555555555555555'),
          filmObjects: [
          ],
          name: 'wrong data',
        },
      ])

      t.end()
    })

    t.test('people.height > 170 join films', async t => {
      const people = await joinService.joinManyToMany(context, {
        from: 'people-endpoint',
        to: 'films-endpoint',
        fromQueryFilter: { height: { $gt: 170 } },
        toQueryFilter: {},
        asField: 'filmObjects',
        localField: 'films',
        foreignField: '_id',
      }).toArray()

      t.strictSame(people, [
        {
          _id: new ObjectId('111111111111111111111111'),
          filmObjects: [
            {
              _id: new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
              title: 'A New Hope',
              episode_id: 1,
            },
          ],
          films: [
            new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
          ],
          height: 172,
          name: 'Luke, Skywalker',
        },
        {
          _id: new ObjectId('444444444444444444444444'),
          filmObjects: [
            {
              _id: new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
              title: 'A New Hope',
              episode_id: 1,
            },
            {
              _id: new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
              title: 'Attack of the Clones',
              episode_id: 2,
            },
            {
              _id: new ObjectId('cccccccccccccccccccccccc'),
              title: 'The Phantom Menace',
              episode_id: 3,
            },
          ],
          films: [
            new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
            new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
            new ObjectId('cccccccccccccccccccccccc'),
          ],
          height: 202,
          name: 'Darth Vader',
        },
      ])

      t.end()
    })

    t.test('people join films.episode_id > 2', async t => {
      const people = await joinService.joinManyToMany(context, {
        from: 'people-endpoint',
        to: 'films-endpoint',
        fromQueryFilter: {},
        toQueryFilter: { episode_id: { $gt: 2 } },
        asField: 'filmObjects',
        localField: 'films',
        foreignField: '_id',
      }).toArray()

      t.strictSame(people, [
        {
          _id: new ObjectId('111111111111111111111111'),
          filmObjects: [
          ],
          films: [
            new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
          ],
          height: 172,
          name: 'Luke, Skywalker',
        },
        {
          _id: new ObjectId('222222222222222222222222'),
          filmObjects: [
          ],
          films: [
            new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
          ],
          height: 167,
          name: 'C-3PO',
        },
        {
          _id: new ObjectId('333333333333333333333333'),
          filmObjects: [
          ],
          films: [
          ],
          height: 96,
          name: 'R2-D2',
        },
        {
          _id: new ObjectId('444444444444444444444444'),
          filmObjects: [
            {
              _id: new ObjectId('cccccccccccccccccccccccc'),
              title: 'The Phantom Menace',
              episode_id: 3,
            },
          ],
          films: [
            new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
            new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
            new ObjectId('cccccccccccccccccccccccc'),
          ],
          height: 202,
          name: 'Darth Vader',
        },
        {
          _id: new ObjectId('555555555555555555555555'),
          filmObjects: [
          ],
          name: 'wrong data',
        },
      ])

      t.end()
    })

    t.test('people.height > 170 join films.episode_id > 2', async t => {
      const people = await joinService.joinManyToMany(context, {
        from: 'people-endpoint',
        to: 'films-endpoint',
        fromQueryFilter: { height: { $gt: 170 } },
        toQueryFilter: { episode_id: { $gt: 2 } },
        asField: 'filmObjects',
        localField: 'films',
        foreignField: '_id',
      }).toArray()

      t.strictSame(people, [
        {
          _id: new ObjectId('111111111111111111111111'),
          filmObjects: [
          ],
          films: [
            new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
          ],
          height: 172,
          name: 'Luke, Skywalker',
        },
        {
          _id: new ObjectId('444444444444444444444444'),
          filmObjects: [
            {
              _id: new ObjectId('cccccccccccccccccccccccc'),
              title: 'The Phantom Menace',
              episode_id: 3,
            },
          ],
          films: [
            new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
            new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
            new ObjectId('cccccccccccccccccccccccc'),
          ],
          height: 202,
          name: 'Darth Vader',
        },
      ])

      t.end()
    })

    t.test('people join films - with projections', async t => {
      const people = await joinService.joinManyToMany(context, {
        from: 'people-endpoint',
        to: 'films-endpoint',
        fromQueryFilter: {},
        toQueryFilter: {},
        asField: 'filmObjects',
        localField: 'films',
        foreignField: '_id',
        fromProjectBefore: {
          height: 0,
        },
        fromProjectAfter: {
          films: 0,
        },
        toProjectBefore: {
          episode_id: 0,
        },
        toProjectAfter: {
          _id: 0,
        },
      }).toArray()

      t.strictSame(people, [
        {
          _id: new ObjectId('111111111111111111111111'),
          filmObjects: [
            {
              title: 'A New Hope',
            },
          ],
          name: 'Luke, Skywalker',
        },
        {
          _id: new ObjectId('222222222222222222222222'),
          filmObjects: [
            {
              title: 'Attack of the Clones',
            },
          ],
          name: 'C-3PO',
        },
        {
          _id: new ObjectId('333333333333333333333333'),
          filmObjects: [
          ],
          name: 'R2-D2',
        },
        {
          _id: new ObjectId('444444444444444444444444'),
          filmObjects: [
            {
              title: 'A New Hope',
            },
            {
              title: 'Attack of the Clones',
            },
            {
              title: 'The Phantom Menace',
            },
          ],
          name: 'Darth Vader',
        },
        {
          _id: new ObjectId('555555555555555555555555'),
          filmObjects: [
          ],
          name: 'wrong data',
        },
      ])

      t.end()
    })

    t.test('people join films - with projections #2', async t => {
      const people = await joinService.joinManyToMany(context, {
        from: 'people-endpoint',
        to: 'films-endpoint',
        fromQueryFilter: {},
        toQueryFilter: {},
        asField: 'filmObjects',
        localField: 'films',
        foreignField: '_id',
        fromProjectBefore: {
          height: 0,
        },
        fromProjectAfter: {
          films: 0,
        },
        toProjectBefore: {
          _id: 0,
        },
        toProjectAfter: {
          episode_id: 0,
        },
      }).toArray()

      t.strictSame(people, [
        {
          _id: new ObjectId('111111111111111111111111'),
          filmObjects: [],
          name: 'Luke, Skywalker',
        },
        {
          _id: new ObjectId('222222222222222222222222'),
          filmObjects: [],
          name: 'C-3PO',
        },
        {
          _id: new ObjectId('333333333333333333333333'),
          filmObjects: [],
          name: 'R2-D2',
        },
        {
          _id: new ObjectId('444444444444444444444444'),
          filmObjects: [],
          name: 'Darth Vader',
        },
        {
          _id: new ObjectId('555555555555555555555555'),
          filmObjects: [],
          name: 'wrong data',
        },
      ])

      t.end()
    })

    t.end()
  })

  t.test('joinOneToMany', t => {
    t.test('addresses join address-statistics', async t => {
      const addresses = await joinService.joinOneToMany(context, {
        from: 'addresses-endpoint',
        to: 'address-statistics-endpoint',
        fromQueryFilter: {},
        toQueryFilter: {},
        asField: 'stats',
        localField: '_id',
        foreignField: 'addressId',
      }).toArray()

      t.strictSame(addresses, [
        {
          _id: new ObjectId('111111111111111111111111'),
          displayName: 'via Calatafimi, 11',
          house_number: 11,
          stats: [
            {
              _id: new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
              addressId: new ObjectId('111111111111111111111111'),
              count: 1,
              tag: 'tag1',
            },
            {
              _id: new ObjectId('dddddddddddddddddddddddd'),
              addressId: new ObjectId('111111111111111111111111'),
              count: 4,
              tag: 'tag2',
            },
          ],
          street: 'via Calatafimi',
        },
        {
          _id: new ObjectId('222222222222222222222222'),
          displayName: 'via dei Pazzi, 0',
          house_number: 0,
          stats: [
            {
              _id: new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
              addressId: new ObjectId('222222222222222222222222'),
              count: 2,
              tag: 'tag1',
            },
            {
              _id: new ObjectId('eeeeeeeeeeeeeeeeeeeeeeee'),
              addressId: new ObjectId('222222222222222222222222'),
              count: 5,
              tag: 'tag2',
            },
            {
              _id: new ObjectId('ffffffffffffffffffffffff'),
              addressId: new ObjectId('222222222222222222222222'),
              count: 6,
              tag: 'tag3',
            },
          ],
          street: 'via dei Pazzi',
        },
        {
          _id: new ObjectId('333333333333333333333333'),
          displayName: 'via Cilea, 123',
          house_number: 123,
          stats: [
            {
              _id: new ObjectId('cccccccccccccccccccccccc'),
              addressId: new ObjectId('333333333333333333333333'),
              count: 3,
              tag: 'tag1',
            },
          ],
          street: 'via Cilea',
        },
      ])

      t.end()
    })

    t.test('addresses.house_number > 10 join address-statistics', async t => {
      const addresses = await joinService.joinOneToMany(context, {
        from: 'addresses-endpoint',
        to: 'address-statistics-endpoint',
        fromQueryFilter: { house_number: { $gt: 10 } },
        toQueryFilter: {},
        asField: 'stats',
        localField: '_id',
        foreignField: 'addressId',
      }).toArray()

      t.strictSame(addresses, [
        {
          _id: new ObjectId('111111111111111111111111'),
          displayName: 'via Calatafimi, 11',
          house_number: 11,
          stats: [
            {
              _id: new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
              addressId: new ObjectId('111111111111111111111111'),
              count: 1,
              tag: 'tag1',
            },
            {
              _id: new ObjectId('dddddddddddddddddddddddd'),
              addressId: new ObjectId('111111111111111111111111'),
              count: 4,
              tag: 'tag2',
            },
          ],
          street: 'via Calatafimi',
        },
        {
          _id: new ObjectId('333333333333333333333333'),
          displayName: 'via Cilea, 123',
          house_number: 123,
          stats: [
            {
              _id: new ObjectId('cccccccccccccccccccccccc'),
              addressId: new ObjectId('333333333333333333333333'),
              count: 3,
              tag: 'tag1',
            },
          ],
          street: 'via Cilea',
        },
      ])

      t.end()
    })

    t.test('addresses join address-statistics.tag = \'tag2\'', async t => {
      const addresses = await joinService.joinOneToMany(context, {
        from: 'addresses-endpoint',
        to: 'address-statistics-endpoint',
        fromQueryFilter: {},
        toQueryFilter: { tag: 'tag2' },
        asField: 'stats',
        localField: '_id',
        foreignField: 'addressId',
      }).toArray()

      t.strictSame(addresses, [
        {
          _id: new ObjectId('111111111111111111111111'),
          displayName: 'via Calatafimi, 11',
          house_number: 11,
          stats: [
            {
              _id: new ObjectId('dddddddddddddddddddddddd'),
              addressId: new ObjectId('111111111111111111111111'),
              count: 4,
              tag: 'tag2',
            },
          ],
          street: 'via Calatafimi',
        },
        {
          _id: new ObjectId('222222222222222222222222'),
          displayName: 'via dei Pazzi, 0',
          house_number: 0,
          stats: [
            {
              _id: new ObjectId('eeeeeeeeeeeeeeeeeeeeeeee'),
              addressId: new ObjectId('222222222222222222222222'),
              count: 5,
              tag: 'tag2',
            },
          ],
          street: 'via dei Pazzi',
        },
        {
          _id: new ObjectId('333333333333333333333333'),
          displayName: 'via Cilea, 123',
          house_number: 123,
          stats: [
          ],
          street: 'via Cilea',
        },
      ])

      t.end()
    })

    t.test('addresses.house_number > 0 join address-statistics.tag = \'tag2\'', async t => {
      const addresses = await joinService.joinOneToMany(context, {
        from: 'addresses-endpoint',
        to: 'address-statistics-endpoint',
        fromQueryFilter: { house_number: { $gt: 0 } },
        toQueryFilter: { tag: 'tag2' },
        asField: 'stats',
        localField: '_id',
        foreignField: 'addressId',
      }).toArray()

      t.strictSame(addresses, [
        {
          _id: new ObjectId('111111111111111111111111'),
          displayName: 'via Calatafimi, 11',
          house_number: 11,
          stats: [
            {
              _id: new ObjectId('dddddddddddddddddddddddd'),
              addressId: new ObjectId('111111111111111111111111'),
              count: 4,
              tag: 'tag2',
            },
          ],
          street: 'via Calatafimi',
        },
        {
          _id: new ObjectId('333333333333333333333333'),
          displayName: 'via Cilea, 123',
          house_number: 123,
          stats: [
          ],
          street: 'via Cilea',
        },
      ])

      t.end()
    })

    t.test('addresses join address-statistics - with projections', async t => {
      const addresses = await joinService.joinOneToMany(context, {
        from: 'addresses-endpoint',
        to: 'address-statistics-endpoint',
        fromQueryFilter: {},
        toQueryFilter: {},
        asField: 'stats',
        localField: '_id',
        foreignField: 'addressId',
        fromProjectBefore: {
          house_number: 0,
        },
        fromProjectAfter: {
          street: 0,
        },
        toProjectBefore: {
          count: 0,
        },
        toProjectAfter: {
          addressId: 0,
        },
      }).toArray()

      t.strictSame(addresses, [
        {
          _id: new ObjectId('111111111111111111111111'),
          displayName: 'via Calatafimi, 11',
          stats: [
            {
              _id: new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
              tag: 'tag1',
            },
            {
              _id: new ObjectId('dddddddddddddddddddddddd'),
              tag: 'tag2',
            },
          ],
        },
        {
          _id: new ObjectId('222222222222222222222222'),
          displayName: 'via dei Pazzi, 0',
          stats: [
            {
              _id: new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
              tag: 'tag1',
            },
            {
              _id: new ObjectId('eeeeeeeeeeeeeeeeeeeeeeee'),
              tag: 'tag2',
            },
            {
              _id: new ObjectId('ffffffffffffffffffffffff'),
              tag: 'tag3',
            },
          ],
        },
        {
          _id: new ObjectId('333333333333333333333333'),
          displayName: 'via Cilea, 123',
          stats: [
            {
              _id: new ObjectId('cccccccccccccccccccccccc'),
              tag: 'tag1',
            },
          ],
        },
      ])

      t.end()
    })

    t.end()
  })

  t.test('joinOneToOne', t => {
    t.test('addresses join address-statistics', async t => {
      const addresses = await joinService.joinOneToOne(context, {
        from: 'addresses-endpoint',
        to: 'address-statistics-endpoint',
        fromQueryFilter: {},
        toQueryFilter: {},
        asField: 'stats',
        localField: '_id',
        foreignField: 'addressId',
      }, false).toArray()

      t.strictSame(addresses, [
        {
          _id: new ObjectId('111111111111111111111111'),
          displayName: 'via Calatafimi, 11',
          house_number: 11,
          stats: {
            _id: new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
            addressId: new ObjectId('111111111111111111111111'),
            count: 1,
            tag: 'tag1',
          },
          street: 'via Calatafimi',
        },
        {
          _id: new ObjectId('222222222222222222222222'),
          displayName: 'via dei Pazzi, 0',
          house_number: 0,
          stats: {
            _id: new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),
            addressId: new ObjectId('222222222222222222222222'),
            count: 2,
            tag: 'tag1',
          },
          street: 'via dei Pazzi',
        },
        {
          _id: new ObjectId('333333333333333333333333'),
          displayName: 'via Cilea, 123',
          house_number: 123,
          stats: {
            _id: new ObjectId('cccccccccccccccccccccccc'),
            addressId: new ObjectId('333333333333333333333333'),
            count: 3,
            tag: 'tag1',
          },
          street: 'via Cilea',
        },
      ])

      t.end()
    })

    t.test('addresses.house_number > 10 join address-statistics', async t => {
      const addresses = await joinService.joinOneToOne(context, {
        from: 'addresses-endpoint',
        to: 'address-statistics-endpoint',
        fromQueryFilter: { house_number: { $gt: 10 } },
        toQueryFilter: {},
        asField: 'stats',
        localField: '_id',
        foreignField: 'addressId',
      }, false).toArray()

      t.strictSame(addresses, [
        {
          _id: new ObjectId('111111111111111111111111'),
          displayName: 'via Calatafimi, 11',
          house_number: 11,
          stats: {
            _id: new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'),
            addressId: new ObjectId('111111111111111111111111'),
            count: 1,
            tag: 'tag1',
          },
          street: 'via Calatafimi',
        },
        {
          _id: new ObjectId('333333333333333333333333'),
          displayName: 'via Cilea, 123',
          house_number: 123,
          stats: {
            _id: new ObjectId('cccccccccccccccccccccccc'),
            addressId: new ObjectId('333333333333333333333333'),
            count: 3,
            tag: 'tag1',
          },
          street: 'via Cilea',
        },
      ])

      t.end()
    })

    t.test('addresses join address-statistics.tag = \'tag2\'', async t => {
      const addresses = await joinService.joinOneToOne(context, {
        from: 'addresses-endpoint',
        to: 'address-statistics-endpoint',
        fromQueryFilter: {},
        toQueryFilter: { tag: 'tag2' },
        asField: 'stats',
        localField: '_id',
        foreignField: 'addressId',
      }, false).toArray()

      t.strictSame(addresses, [
        {
          _id: new ObjectId('111111111111111111111111'),
          displayName: 'via Calatafimi, 11',
          house_number: 11,
          stats: {
            _id: new ObjectId('dddddddddddddddddddddddd'),
            addressId: new ObjectId('111111111111111111111111'),
            count: 4,
            tag: 'tag2',
          },
          street: 'via Calatafimi',
        },
        {
          _id: new ObjectId('222222222222222222222222'),
          displayName: 'via dei Pazzi, 0',
          house_number: 0,
          stats: {
            _id: new ObjectId('eeeeeeeeeeeeeeeeeeeeeeee'),
            addressId: new ObjectId('222222222222222222222222'),
            count: 5,
            tag: 'tag2',
          },
          street: 'via dei Pazzi',
        },
        {
          _id: new ObjectId('333333333333333333333333'),
          displayName: 'via Cilea, 123',
          house_number: 123,
          stats: null,
          street: 'via Cilea',
        },
      ])

      t.end()
    })

    t.test('addresses.house_number > 0 join address-statistics.tag = \'tag2\'', async t => {
      const addresses = await joinService.joinOneToOne(context, {
        from: 'addresses-endpoint',
        to: 'address-statistics-endpoint',
        fromQueryFilter: { house_number: { $gt: 0 } },
        toQueryFilter: { tag: 'tag2' },
        asField: 'stats',
        localField: '_id',
        foreignField: 'addressId',
      }, false).toArray()

      t.strictSame(addresses, [
        {
          _id: new ObjectId('111111111111111111111111'),
          displayName: 'via Calatafimi, 11',
          house_number: 11,
          stats: {
            _id: new ObjectId('dddddddddddddddddddddddd'),
            addressId: new ObjectId('111111111111111111111111'),
            count: 4,
            tag: 'tag2',
          },
          street: 'via Calatafimi',
        },
        {
          _id: new ObjectId('333333333333333333333333'),
          displayName: 'via Cilea, 123',
          house_number: 123,
          stats: null,
          street: 'via Cilea',
        },
      ])

      t.end()
    })

    t.test('addresses join address-statistics merged', async t => {
      const addresses = await joinService.joinOneToOne(context, {
        from: 'addresses-endpoint',
        to: 'address-statistics-endpoint',
        fromQueryFilter: {},
        toQueryFilter: {},
        asField: 'stats',
        localField: '_id',
        foreignField: 'addressId',
      }, true).toArray()

      t.strictSame(addresses, [
        {
          _id: new ObjectId('111111111111111111111111'),
          displayName: 'via Calatafimi, 11',
          house_number: 11,
          addressId: new ObjectId('111111111111111111111111'),
          count: 1,
          tag: 'tag1',
          street: 'via Calatafimi',
        },
        {
          _id: new ObjectId('222222222222222222222222'),
          displayName: 'via dei Pazzi, 0',
          house_number: 0,
          addressId: new ObjectId('222222222222222222222222'),
          count: 2,
          tag: 'tag1',
          street: 'via dei Pazzi',
        },
        {
          _id: new ObjectId('333333333333333333333333'),
          displayName: 'via Cilea, 123',
          house_number: 123,
          addressId: new ObjectId('333333333333333333333333'),
          count: 3,
          tag: 'tag1',
          street: 'via Cilea',
        },
      ])

      t.end()
    })

    t.test('addresses join address-statistics - with projections', async t => {
      const addresses = await joinService.joinOneToOne(context, {
        from: 'addresses-endpoint',
        to: 'address-statistics-endpoint',
        fromQueryFilter: {},
        toQueryFilter: {},
        asField: 'stats',
        localField: '_id',
        foreignField: 'addressId',
        fromProjectBefore: {
          house_number: 0,
        },
        fromProjectAfter: {
          street: 0,
        },
        toProjectBefore: {
          count: 0,
        },
        toProjectAfter: {
          addressId: 0,
        },
      }, true).toArray()

      t.strictSame(addresses, [
        {
          _id: new ObjectId('111111111111111111111111'),
          displayName: 'via Calatafimi, 11',
          tag: 'tag1',
        },
        {
          _id: new ObjectId('222222222222222222222222'),
          displayName: 'via dei Pazzi, 0',
          tag: 'tag1',
        },
        {
          _id: new ObjectId('333333333333333333333333'),
          displayName: 'via Cilea, 123',
          tag: 'tag1',
        },
      ])

      t.end()
    })

    t.test('addresses join address-statistics - with projections #2', async t => {
      const addresses = await joinService.joinOneToOne(context, {
        from: 'addresses-endpoint',
        to: 'address-statistics-endpoint',
        fromQueryFilter: {},
        toQueryFilter: {},
        asField: 'stats',
        localField: '_id',
        foreignField: 'addressId',
        fromProjectBefore: {
          height: 0,
        },
        fromProjectAfter: {
          films: 0,
        },
        toProjectBefore: {
          addressId: 0,
        },
        toProjectAfter: {
          count: 0,
        },
      }, true).toArray()

      t.strictSame(addresses, [
        {
          _id: new ObjectId('111111111111111111111111'),
          displayName: 'via Calatafimi, 11',
          house_number: 11,
          street: 'via Calatafimi',
        },
        {
          _id: new ObjectId('222222222222222222222222'),
          displayName: 'via dei Pazzi, 0',
          house_number: 0,
          street: 'via dei Pazzi',
        },
        {
          _id: new ObjectId('333333333333333333333333'),
          displayName: 'via Cilea, 123',
          house_number: 123,
          street: 'via Cilea',
        },
      ])

      t.end()
    })

    t.end()
  })

  t.end()
})
