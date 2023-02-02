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

const DATABASE_DOT_COLLECTION = '^[\\w\\W][^.]+\\.[\\w\\W][^.]+$'

const gcpCryptSchema = {
  properties: {
    KMS_PROVIDER: { type: 'string', enum: ['gcp'], description: 'Master key is managed by GCP' },
  },
  required: ['KMS_GCP_EMAIL', 'KMS_GCP_PROJECT_ID', 'KMS_GCP_LOCATION', 'KMS_GCP_KEY_RING', 'KMS_GCP_KEY_NAME', 'KMS_GCP_PRIVATE_KEY_PATH', 'KEY_VAULT_NAMESPACE'],
}

const localCryptSchema = {
  properties: {
    KMS_PROVIDER: { type: 'string', enum: ['local'], description: 'Master key is managed locally' },
  },
  required: ['LOCAL_MASTER_KEY_PATH', 'KEY_VAULT_NAMESPACE'],
}

const noCryptSchema = {
  properties: {
    KMS_PROVIDER: { type: 'string', enum: ['none'], description: 'No KMS configured' },
  },
}

const properties = {
  MONGODB_URL: { type: 'string', description: 'the mongodb connection string' },
  COLLECTION_DEFINITION_FOLDER: { type: 'string', description: 'a path where all collections are defined' },
  VIEWS_DEFINITION_FOLDER: { type: 'string', description: 'a path where all views are defined' },
  USER_ID_HEADER_KEY: { type: 'string', description: 'Header key used to know which user makes the request' },
  CRUD_LIMIT_CONSTRAINT_ENABLED: {
    type: 'boolean',
    description: 'Enable the query limit contraints feature',
    default: true,
  },
  CRUD_MAX_LIMIT: {
    type: 'number',
    description: 'Change the maximum limit of objects returned by a Mongo query',
    default: 200,
  },
  TRUSTED_PROXIES: { type: 'string', default: '10.0.0.0/8,172.16.0.0/12,192.168.0.0/16' },
  KMS_PROVIDER: { type: 'string', enum: ['gcp', 'local', 'none'], description: 'Master key manager', default: 'none' },
  ALLOW_DISK_USE_IN_QUERIES: {
    type: 'boolean',
    description: 'Allow disk use in queries to mongo. It works with Mongo 4.4 or above. WARNING: using this variable set to true with MongoDB version below 4.4 will break all the GETs.',
  },
  // Encryption properties
  KEY_VAULT_NAMESPACE: { type: 'string', pattern: DATABASE_DOT_COLLECTION },
  LOCAL_MASTER_KEY_PATH: { type: 'string', description: 'Path for the local Master key', minLength: 1 },
  // Google Cloud Platform encryption properties
  KMS_GCP_EMAIL: { type: 'string', description: 'GCP email of the kms' },
  KMS_GCP_PROJECT_ID: { type: 'string', description: 'GCP project id for kms' },
  KMS_GCP_LOCATION: { type: 'string', description: 'GCP location' },
  KMS_GCP_KEY_RING: { type: 'string', description: 'GCP keyring' },
  KMS_GCP_KEY_NAME: { type: 'string', description: 'GCP key name' },
  KMS_GCP_PRIVATE_KEY_PATH: { type: 'string', description: 'GCP private key path', minLength: 1 },
}

const fastifyEnvSchema = {
  type: 'object',
  required: ['MONGODB_URL', 'COLLECTION_DEFINITION_FOLDER', 'USER_ID_HEADER_KEY'],
  properties,
  anyOf: [gcpCryptSchema, localCryptSchema, noCryptSchema],
  additionalProperties: false,
}

module.exports = fastifyEnvSchema
