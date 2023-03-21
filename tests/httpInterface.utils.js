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

const lc39 = require('@mia-platform/lc39')
const { join } = require('path')
const { MongoClient } = require('mongodb')

const {
  clearCollectionAndInsertFixtures,
  getMongoDatabaseName,
  getMongoURL,
  BOOKS_COLLECTION_NAME,
  CRUD_LIMIT_CONSTRAINT_ENABLED,
  CRUD_MAX_LIMIT,
  fixtures,
} = require('./utils')

async function setUpTest(
  tap,
  testFixtures = fixtures,
  mongoDBCollectionName = BOOKS_COLLECTION_NAME,
  exposeMetrics = false
) {
  const databaseName = getMongoDatabaseName()
  const mongoURL = getMongoURL(databaseName)

  const client = await MongoClient.connect(mongoURL)
  const database = client.db(databaseName)
  const collection = database.collection(mongoDBCollectionName)

  const resetCollection = (records = testFixtures) => clearCollectionAndInsertFixtures(collection, records)
  await resetCollection()

  const logLevel = 'silent'
  const envVariables = {
    MONGODB_URL: mongoURL,
    COLLECTION_DEFINITION_FOLDER: join(__dirname, 'collectionDefinitions'),
    CRUD_LIMIT_CONSTRAINT_ENABLED,
    CRUD_MAX_LIMIT,
    // The header key is case-insensitive. nodejs makes it lower case
    // Here is not in lower case for testing it
    USER_ID_HEADER_KEY: 'userId',
    VIEWS_DEFINITION_FOLDER: join(__dirname, 'viewsDefinitions'),
  }

  const fastify = await lc39('./index', { logLevel, envVariables, exposeMetrics })

  tap.teardown(async() => {
    await database.dropDatabase()
    await client.close()
    await fastify.close()
  })

  return { fastify, collection, database, resetCollection }
}

async function setUpEmptyCollectionsTest(t) {
  const databaseName = getMongoDatabaseName()
  const mongoURL = getMongoURL(databaseName)
  const logLevel = 'silent'

  const envVariables = {
    MONGODB_URL: mongoURL,
    COLLECTION_DEFINITION_FOLDER: join(__dirname, 'emptyCollectionDefinitions'),
    CRUD_LIMIT_CONSTRAINT_ENABLED,
    CRUD_MAX_LIMIT,
    // The header key is case-insensitive. nodejs makes it lower case
    // Here is not in lower case for testing it
    USER_ID_HEADER_KEY: 'userId',
    VIEWS_DEFINITION_FOLDER: join(__dirname, 'emptyViewsDefinitions'),
  }

  const fastify = await lc39('./index', { logLevel, envVariables })

  t.teardown(async() => {
    await fastify.close()
  })

  return { fastify }
}

async function setUpMultipleCollectionTest(t, testFixtures, mongoDBCollectionName) {
  const databaseName = getMongoDatabaseName()
  const mongoURL = getMongoURL(databaseName)
  const client = await MongoClient.connect(mongoURL)
  const database = client.db(databaseName)
  const collections = []

  for (const collectionName of mongoDBCollectionName) {
    const collection = database.collection(collectionName)
    // eslint-disable-next-line no-await-in-loop
    await clearCollectionAndInsertFixtures(collection, testFixtures[collectionName])
    collections.push(collection)
  }

  const logLevel = 'silent'
  const envVariables = {
    MONGODB_URL: mongoURL,
    COLLECTION_DEFINITION_FOLDER: join(__dirname, 'collectionDefinitions'),
    CRUD_LIMIT_CONSTRAINT_ENABLED,
    CRUD_MAX_LIMIT,
    // The header key is case-insensitive. nodejs makes it lower case
    // Here is not in lower case for testing it
    USER_ID_HEADER_KEY: 'userId',
    VIEWS_DEFINITION_FOLDER: join(__dirname, 'viewsDefinitions'),
  }
  const fastify = await lc39('./index', { logLevel, envVariables, exposeMetrics: false })

  t.teardown(async() => {
    await client.close()
    await fastify.close()
  })

  return { fastify, collections, database }
}

const NOT_FOUND_BODY = { error: 'not found' }

function getHeaders({ acl_rows: aclRows, acl_read_columns: aclReadColumns, jsonQueryParamsEncoding } = {}) {
  return {
    ...aclRows ? { acl_rows: JSON.stringify(aclRows) } : {},
    ...aclReadColumns ? { acl_read_columns: aclReadColumns.join(',') } : {},
    ...jsonQueryParamsEncoding ? { 'json-query-params-encoding': jsonQueryParamsEncoding } : {},
  }
}

module.exports = {
  setUpTest,
  setUpMultipleCollectionTest,
  setUpEmptyCollectionsTest,
  getHeaders,
  NOT_FOUND_BODY,
  prefix: '/books-endpoint',
  stationsPrefix: '/stations-endpoint',
}
