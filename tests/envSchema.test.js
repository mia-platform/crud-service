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

const lc39 = require('@mia-platform/lc39')
const path = require('path')
const { getMongoDatabaseName, getMongoURL } = require('./utils')

tap.test('envSchema tests', async t => {
  const databaseName = getMongoDatabaseName()
  const mongoURL = getMongoURL(databaseName)

  let fastify

  const startFastify = async(envs) => {
    fastify = await lc39('./index.js', {
      envVariables: {
        MONGODB_URL: mongoURL,
        COLLECTION_DEFINITION_FOLDER: path.join(__dirname, 'emptyCollectionDefinitions'),
        VIEWS_DEFINITION_FOLDER: path.join(__dirname, 'emptyViewsDefinitions'),
        USER_ID_HEADER_KEY: 'userid',
        ...envs,
      },
      logLevel: 'silent',
    })
  }

  t.test('Invalid base schema', async t => {
    t.rejects(startFastify({ COLLECTION_DEFINITION_FOLDER: undefined }))
  })

  t.test('Valid base schema', async t => {
    t.resolves(startFastify())
  })

  t.test('Valid base schema with none provider', async t => {
    t.resolves(startFastify({ KMS_PROVIDER: 'none' }))
  })

  t.test('Valid base schema with relative paths', async t => {
    t.resolves(
      startFastify(
        {
          COLLECTION_DEFINITION_FOLDER: 'tests/emptyCollectionDefinitions',
          VIEWS_DEFINITION_FOLDER: 'tests/emptyViewsDefinitions' }
      )
    )
  })

  t.test('Missing local master key path', async t => {
    t.rejects(startFastify({ KMS_PROVIDER: 'local' }))
  })

  t.test('Invalid local configuration for empty path', async t => {
    t.rejects(startFastify({
      KMS_PROVIDER: 'local',
      LOCAL_MASTER_KEY_PATH: '',
      KEY_VAULT_NAMESPACE: 'db.collection',
    }))
  })

  t.test('Invalid local configuration for keyvault namespace', async t => {
    t.rejects(startFastify({
      KMS_PROVIDER: 'local',
      LOCAL_MASTER_KEY_PATH: '',
      KEY_VAULT_NAMESPACE: 'db_only',
    }))
  })

  t.test('Invalid local configuration for keyvault namespace format', async t => {
    t.rejects(startFastify({
      KMS_PROVIDER: 'local',
      LOCAL_MASTER_KEY_PATH: '',
      KEY_VAULT_NAMESPACE: 'db.collection.other',
    }))
  })

  t.test('Valid local configuration', async t => {
    t.resolves(startFastify({
      KMS_PROVIDER: 'local',
      LOCAL_MASTER_KEY_PATH: 'path',
      KEY_VAULT_NAMESPACE: 'db.collection',
    }))
  })

  t.test('Valid base schema with views definition folder', async t => {
    t.resolves(startFastify({
      VIEWS_DEFINITION_FOLDER: path.join(__dirname, 'emptyViewsDefinitions'),
    }))
  })

  t.test('Missing props for gcp kms', async t => {
    t.rejects(startFastify({ KMS_PROVIDER: 'gcp' }))
  })

  t.test('Missing half props for gcp kms', async t => {
    t.rejects(startFastify({ KMS_PROVIDER: 'gcp', KMS_GCP_EMAIL: 'a@a.it', KMS_GCP_PROJECT_ID: '123', KMS_GCP_LOCATION: 'italy' }))
  })

  t.test('Invalid gcp configuration for empty path', async t => {
    t.rejects(
      startFastify({
        KMS_PROVIDER: 'gcp',
        KMS_GCP_EMAIL: 'a@a.it',
        KMS_GCP_PROJECT_ID: '123',
        KMS_GCP_LOCATION: 'italy',
        KMS_GCP_KEY_RING: 'keyring',
        KMS_GCP_KEY_NAME: 'keyName',
        KMS_GCP_PRIVATE_KEY_PATH: '',
        KEY_VAULT_NAMESPACE: 'db.collection',
      })
    )
  })

  t.test('Invalid gcp configuration for bad kay vault namespace', async t => {
    t.rejects(
      startFastify({
        KMS_PROVIDER: 'gcp',
        KMS_GCP_EMAIL: 'a@a.it',
        KMS_GCP_PROJECT_ID: '123',
        KMS_GCP_LOCATION: 'italy',
        KMS_GCP_KEY_RING: 'keyring',
        KMS_GCP_KEY_NAME: 'keyName',
        KMS_GCP_PRIVATE_KEY_PATH: 'privateKeyPath',
        KEY_VAULT_NAMESPACE: 'db_only',
      })
    )
  })

  t.test('Valid gcp configuration', async t => {
    t.resolves(
      startFastify({
        KMS_PROVIDER: 'gcp',
        KMS_GCP_EMAIL: 'a@a.it',
        KMS_GCP_PROJECT_ID: '123',
        KMS_GCP_LOCATION: 'italy',
        KMS_GCP_KEY_RING: 'keyring',
        KMS_GCP_KEY_NAME: 'keyName',
        KMS_GCP_PRIVATE_KEY_PATH: 'privateKeyPath',
        KEY_VAULT_NAMESPACE: 'db.collection',
      })
    )
  })

  t.afterEach(async() => {
    await fastify?.close()
  })
})
