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

const { MONGOID, HASHED_FIELD, GEO_FIELD, TEXT_FIELD, NORMAL_INDEX, HASHED_INDEX, GEO_INDEX, TEXT_INDEX } = require('./consts')

const addKeyToSpec = (specObject, { name, order }) => ({ ...specObject, [name]: order })
const addTextKeyToSpec = (specObject, { name }) => ({ ...specObject, [name]: TEXT_FIELD })

module.exports = async function createIndexes(collection, indexes, prefixOfIndexesToPreserve) {
  let alreadyPresentIndexes = []
  const indexNamesToMantain = []
  const indexNamesToDrop = []
  try {
    alreadyPresentIndexes = await collection.indexes()
  } catch (error) {
    // throws if the collection doesn't exists...
  }

  const indexesNames = indexes.map(index => (index['name']))

  alreadyPresentIndexes.forEach(foundIndex => {
    if (
      !foundIndex.name.startsWith(prefixOfIndexesToPreserve)
      && !foundIndex.key._id
      && !(
        indexesNames.includes(foundIndex.name)
        && checkIndexEquality(foundIndex, indexes.find(idx => idx.name === foundIndex.name))
      )
    ) {
      indexNamesToDrop.push(foundIndex.name)
    } else {
      indexNamesToMantain.push(foundIndex.name)
    }
  })

  await Promise.all(indexNamesToDrop.map(name => collection.dropIndex(name)))

  return Promise.all(indexes
    .filter(index => index.name !== MONGOID && !indexNamesToMantain.includes(index.name))
    .map(index => createIndex(collection, index)))
}

async function createIndex(collection, index) {
  let spec

  switch (index.type) {
  case NORMAL_INDEX: {
    spec = index.fields.reduce(addKeyToSpec, {})
    break
  }
  case GEO_INDEX: {
    const { field } = index
    spec = { [field]: GEO_FIELD }
    break
  }
  case HASHED_INDEX: {
    const { field } = index
    spec = { [field]: HASHED_FIELD }
    break
  }
  case TEXT_INDEX: {
    spec = index.fields.reduce(addTextKeyToSpec, {})
    break
  }
  default: {
    throw new Error(`Cannot create index of type ${index?.type}`)
  }
  }

  const options = getIndexOptions(index)
  return collection.createIndex(spec, options)
}

function getIndexOptions(index) {
  let options = {
    name: index.name,
    unique: index.unique || false,
    background: true,
  }

  if (index.expireAfterSeconds) {
    options = { ...options, expireAfterSeconds: index.expireAfterSeconds }
  }
  if (index.weights) {
    options = { ...options, weights: index.weights }
  }
  if (index.defaultLanguage) {
    options = { ...options, default_language: index.defaultLanguage }
  }
  if (index.languageOverride) {
    options = { ...options, language_override: index.languageOverride }
  }
  if (index.usePartialFilter) {
    let partialFilterExpression
    try {
      partialFilterExpression = index.partialFilterExpression ? JSON.parse(index.partialFilterExpression) : {}
    } catch (error) {
      throw new Error(`Impossible to parse the Partial Index expression of index ${index.name}`, { catch: error })
    }

    options = { ...options, partialFilterExpression }
  }
  return options
}

function checkIndexEquality(foundIndex, index) {
  const isOptionUniqueEqual = index.unique ? foundIndex.unique === true : foundIndex.unique === undefined
  const isOptionExpireAfterSecondsEqual = foundIndex.expireAfterSeconds === index.expireAfterSeconds
  return (
    isOptionUniqueEqual
    && isOptionExpireAfterSecondsEqual
    && checkIndexEqualityByType(foundIndex, index)
  )
}

function checkIndexEqualityByType(foundIndex, index) {
  switch (index.type) {
  case NORMAL_INDEX: {
    const expectedKey = index.fields.reduce(addKeyToSpec, {})
    return JSON.stringify(foundIndex.key) === JSON.stringify(expectedKey)
  }
  case GEO_INDEX: {
    return foundIndex.key[index.field] === GEO_FIELD
  }
  case HASHED_INDEX: {
    return foundIndex.key[index.field] === HASHED_FIELD
  }
  case TEXT_INDEX: {
    const expectedKey = index.fields.reduce(addTextKeyToSpec, {})
    return JSON.stringify(foundIndex.key) === JSON.stringify(expectedKey)
  }
  default:
    return false
  }
}
