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
  required: [
    'KMS_GCP_EMAIL',
    'KMS_GCP_PROJECT_ID',
    'KMS_GCP_LOCATION',
    'KMS_GCP_KEY_RING',
    'KMS_GCP_KEY_NAME',
    'KMS_GCP_PRIVATE_KEY_PATH',
    'KEY_VAULT_NAMESPACE',
    'CRYPT_SHARED_LIB_PATH',
  ],
}

const localCryptSchema = {
  properties: {
    KMS_PROVIDER: { type: 'string', enum: ['local'], description: 'Master key is managed locally' },
  },
  required: [
    'LOCAL_MASTER_KEY_PATH',
    'KEY_VAULT_NAMESPACE',
    'CRYPT_SHARED_LIB_PATH',
  ],
}

const noCryptSchema = {
  properties: {
    KMS_PROVIDER: { type: 'string', enum: ['none'], description: 'No KMS configured' },
  },
}

const properties = {
  MONGODB_URL: { type: 'string', description: 'the mongodb connection string' },
  MONGODB_MAX_IDLE_TIME_MS: {
    type: 'number',
    description: 'idle time (in ms) to control the MongoDB maxIdleTimeMs connection option (default: 0, meaning there is no max idle time and connection remain open indefinitely)',
    default: 0,
  },
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
  ENABLE_STRICT_OUTPUT_VALIDATION: {
    type: 'boolean',
    description: 'Enable CRUD responses to be compliant with the schema (Changing the schema without sanitizing the data could break GETs)',
    default: false,
  },
  MAX_MULTIPART_FILE_BYTES: {
    type: 'number',
    description: 'The max size (Mb) that is possible to process in multipart requests',
    default: 100,
    minimum: 1,
  },
  TRUSTED_PROXIES: { type: 'string', default: '10.0.0.0/8,172.16.0.0/12,192.168.0.0/16' },
  OPEN_API_SPECIFICATION: {
    type: 'string',
    enum: ['swagger', 'openapi'],
    description: 'OpenAPI specification used to expose Swagger',
    default: 'swagger',
  },
  ALLOW_DISK_USE_IN_QUERIES: {
    type: 'boolean',
    description: 'Allow disk use in queries to mongo. It works with Mongo 4.4 or above. WARNING: using this variable set to true with MongoDB version below 4.4 will break all the GETs.',
  },
  // Encryption properties
  KEY_VAULT_NAMESPACE: {
    type: 'string',
    pattern: DATABASE_DOT_COLLECTION,
    description: 'Key vault namespace in the format {databaseName}.{collectionName}. In multi-db mode, use {{scope}} placeholder in the database part (e.g. "myapp-{{scope}}.keyVaultCollection") to generate per-scope namespaces.',
  },
  LOCAL_MASTER_KEY_PATH: { type: 'string', description: 'Path for the local Master key', minLength: 1 },
  CRYPT_SHARED_LIB_PATH: {
    type: 'string',
    description: 'path to the folder containing Mongo shared library to support automatic encryption',
  },
  // Google Cloud Platform encryption properties
  KMS_PROVIDER: { type: 'string', enum: ['gcp', 'local', 'none'], description: 'Master key manager', default: 'none' },
  KMS_GCP_EMAIL: { type: 'string', description: 'GCP email of the kms' },
  KMS_GCP_PROJECT_ID: { type: 'string', description: 'GCP project id for kms' },
  KMS_GCP_LOCATION: { type: 'string', description: 'GCP location' },
  KMS_GCP_KEY_RING: { type: 'string', description: 'GCP keyring' },
  KMS_GCP_KEY_NAME: { type: 'string', description: 'GCP key name' },
  KMS_GCP_PRIVATE_KEY_PATH: { type: 'string', description: 'GCP private key path', minLength: 1 },
  HELPERS_PREFIX: {
    type: 'string',
    description: 'prefix string to assign to the helpers plugin, which exposes additional routes, such as /schemas',
    default: '/-/',
  },
  DISABLE_INDEX_MANAGEMENT: {
    type: 'boolean',
    description: 'When this option is activated, the service does manage the indexes of defined collections',
    default: false,
  },
  FASTIFY_PLUGIN_TIMEOUT_MS: {
    type: 'number',
    description: 'customize how many milliseconds are allowed to elapse to load a fastify plugin',
    default: 20000,
  },
  // Multi-DB properties (additive, all optional unless MULTIDB_ENABLED=true)
  MULTIDB_ENABLED: {
    type: 'boolean',
    description: 'Enable multi-database support. When true, existing GET routes use scatter-gather across scopes.',
    default: false,
  },
  MULTIDB_SCOPES: {
    type: 'string',
    description: 'Comma-separated or JSON array of scope names, e.g. "rome,milan,naples"',
  },
  MULTIDB_URL_TEMPLATE: {
    type: 'string',
    description: 'MongoDB connection URL template with {{scope}} placeholder, e.g. mongodb+srv://user:pwd@cluster/myapp-prod-{{scope}}?retryWrites=true&w=majority',
  },
  MULTIDB_MAX_IDLE_TIME_MS: {
    type: 'number',
    description: 'maxIdleTimeMS for multi-db scope connections (default: 0)',
    default: 0,
  },
  DEFAULT_SCOPE: {
    type: 'string',
    description: 'Required when MULTIDB_ENABLED=true. The default scope used when x-scope header is not provided. All operations (read, write, delete, patch) target only this scope by default. Must be one of MULTIDB_SCOPES. Its database is also used for infrastructure purposes (e.g. cursor cache).',
  },
  CURSOR_CACHE_COLLECTION: {
    type: 'string',
    description: 'Name of the MongoDB collection (on DEFAULT_SCOPE database) used as cursor cache for keyset pagination. The collection MUST already have a TTL index on the `expireAt` field.',
    default: '_multidb_cursors',
  },
  CURSOR_TTL: {
    type: 'number',
    description: 'Time-to-live (seconds) for cursor cache entries in MongoDB. Default: 300.',
    default: 300,
  },
  MAX_SKIP: {
    type: 'number',
    description: 'Maximum _sk value allowed in multi-db GET list. Prevents deep pagination abuse. Default: 2000.',
    default: 2000,
  },
  MAX_REBUILD_PAGES: {
    type: 'number',
    description: 'Maximum pages to replay from page 0 when a cursor cache miss occurs. Default: 5.',
    default: 5,
  },
}

const fastifyEnvSchema = {
  type: 'object',
  required: ['COLLECTION_DEFINITION_FOLDER', 'USER_ID_HEADER_KEY'],
  properties,
  anyOf: [gcpCryptSchema, localCryptSchema, noCryptSchema],
  if: {
    properties: { MULTIDB_ENABLED: { enum: [true, 'true'] } },
    required: ['MULTIDB_ENABLED'],
  },
  then: {
    required: ['MULTIDB_SCOPES', 'MULTIDB_URL_TEMPLATE', 'DEFAULT_SCOPE'],
  },
  else: {
    required: ['MONGODB_URL'],
  },
  additionalProperties: false,
}

module.exports = fastifyEnvSchema
