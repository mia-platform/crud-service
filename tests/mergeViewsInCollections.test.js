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

const mergeViewsInCollections = require('../lib/mergeViewsInCollections')
const animalsColl = require('./collectionDefinitions/animals')
const caninesColl = require('./collectionDefinitions/canines')
const felinesColl = require('./collectionDefinitions/felines')
const storesColl = require('./collectionDefinitions/store')
const openStoresColl = require('./collectionDefinitions/store-open')
const felinesView = require('./viewsDefinitions/felines')
const openStoresView = require('./viewsDefinitions/store-open')

tap.test('mergeViewsInCollections', t => {
  t.test('correctly merges view definition into related collection definition', t => {
    const result = mergeViewsInCollections([animalsColl, felinesColl], [felinesView])
    const [unmodifiedAnimals, mergedFelines] = result

    t.strictSame(unmodifiedAnimals, animalsColl)
    t.strictSame(mergedFelines, {
      name: 'felines',
      endpointBasePath: '/felines-endpoint',
      defaultState: 'PUBLIC',
      fields: felinesColl.fields,
      indexes: felinesColl.indexes,
      source: 'animals',
      type: 'view',
      pipeline: [{
        $match: { family: 'felines' },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          updaterId: 1,
          updatedAt: 1,
          creatorId: 1,
          createdAt: 1,
          weight: 1,
          __STATE__: 1,
        },
      }],
    })
    t.end()
  })

  t.test('does not modify view already present in collections folder if no corresponding view is present in views folder', t => {
    const result = mergeViewsInCollections([caninesColl], [])
    const [unmodifiedCanines] = result
    t.strictSame(unmodifiedCanines, caninesColl)
    t.end()
  })

  t.test('modifies view already present in collections folder if a corresponding view is present in views folder', t => {
    const result = mergeViewsInCollections(
      [caninesColl],
      [
        {
          name: 'canines',
          source: 'dogs',
          pipeline: [
            {
              $match: { specie: 'dog' },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                updaterId: 1,
                updatedAt: 1,
                creatorId: 1,
                createdAt: 1,
                weight: 1,
                __STATE__: 1,
              },
            },
          ],
        },
      ]
    )
    const [mergedCanines] = result
    t.strictSame(mergedCanines, {
      name: 'canines',
      endpointBasePath: '/canines-endpoint',
      defaultState: 'PUBLIC',
      fields: caninesColl.fields,
      source: 'dogs',
      type: 'view',
      pipeline: [{
        $match: { specie: 'dog' },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          updaterId: 1,
          updatedAt: 1,
          creatorId: 1,
          createdAt: 1,
          weight: 1,
          __STATE__: 1,
        },
      }],
    })
    t.end()
  })

  t.test('Recognize a definition as a view despite despite the absence of the \'type\' property.', t => {
    const result = mergeViewsInCollections([storesColl, openStoresColl], [openStoresView])
    const [collection, view] = result

    t.strictSame(collection, storesColl)
    t.strictSame(view, {
      name: 'store-open',
      endpointBasePath: '/store-open-endpoint',
      defaultState: 'PUBLIC',
      fields: openStoresColl.fields,
      indexes: openStoresColl.indexes,
      source: 'store',
      type: 'view',
      pipeline: [
        { $match: { currentlyWorking: true } },
        {
          $project: {
            _id: 1,
            name: 1,
            updaterId: 1,
            updatedAt: 1,
            creatorId: 1,
            createdAt: 1,
            address: 1,
            __STATE__: 1,
          },
        },
      ],
    })

    t.end()
  })

  t.end()
})
