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

module.exports = function mergeViewsInCollections(collections, views) {
  const collectionsObject = collections.reduce((acc, collection) => {
    const coll = (acc[collection.name] || []).concat(collection)
    return {
      ...acc,
      [collection.name]: coll,
    }
  }, {})

  for (const view of views) {
    const collectionConfig = collectionsObject[view.name]
    if (collectionConfig) {
      collectionsObject[view.name] = collectionConfig.map(coll => ({
        ...coll,
        source: view.source,
        // Mandatory to initialize the collection in Mongo as a MongoDB View
        type: 'view',
        pipeline: view.pipeline,
      }))
    }
  }

  return Object.values(collectionsObject).flat()
}
