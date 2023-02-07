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

const keyringFactory = require('../../../lib/mongo/mongo-keyring-factory')

const buildFastifyInstance = (config) => ({ config })

tap.test('empty keyring configuration for undefined provider', t => {
  const fastify = buildFastifyInstance({ KMS_PROVIDER: undefined })
  t.match(keyringFactory(fastify), {})

  t.end()
})

tap.test('right crypt configuration for non gcp kms provider', t => {
  const fastify = buildFastifyInstance({ KMS_PROVIDER: 'local' })
  t.match(keyringFactory(fastify), {})

  t.end()
})

tap.test('right crypt configuration for gcp kms provider', t => {
  const fastify = buildFastifyInstance({
    KMS_PROVIDER: 'gcp',
    KMS_GCP_PROJECT_ID: 'projectId',
    KMS_GCP_LOCATION: 'location',
    KMS_GCP_KEY_RING: 'keyRing',
    KMS_GCP_KEY_NAME: 'keyName',
  })
  const expectedKeyring = {
    masterKey: {
      projectId: 'projectId',
      location: 'location',
      keyRing: 'keyRing',
      keyName: 'keyName',
    },
  }
  t.match(keyringFactory(fastify), expectedKeyring)

  t.end()
})
