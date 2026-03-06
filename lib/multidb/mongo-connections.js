'use strict'

const fp = require('fastify-plugin')
const { MongoClient } = require('mongodb')

const { generateEncryptionConfigForScope } = require('../mongo/mongo-crypt-factory')
const { retrieveDataKeyIdForScope, hasCollectionEncryptionEnabled } = require('../mongo/mongo-data-keygen')
const generateSchemaMaps = require('../mongo/mongo-schemaMap-generator')

/**
 * Registers multiple MongoDB connections, one per scope.
 *
 * Each connection is stored in fastify.multidb.clients[scope] as a MongoClient,
 * and fastify.multidb.dbs[scope] as the default database for that scope.
 *
 * When encryption is configured (KMS_PROVIDER !== 'none'), each scope's MongoClient
 * is created with autoEncryption using a scope-specific KEY_VAULT_NAMESPACE
 * (resolved via {{scope}} placeholder) and per-scope data keys.
 *
 * The URL template uses {{scope}} as placeholder, e.g.:
 *   mongodb+srv://user:pass@cluster/myapp-prod-{{scope}}?retryWrites=true&w=majority
 *
 * @param {import('fastify').FastifyInstance} fastify
 */
async function multidbMongoConnections(fastify) {
  const {
    MULTIDB_SCOPES,
    MULTIDB_URL_TEMPLATE,
    MULTIDB_MAX_IDLE_TIME_MS,
    DEFAULT_SCOPE,
    KMS_PROVIDER,
  } = fastify.config

  const scopes = parseScopes(MULTIDB_SCOPES)
  if (scopes.length === 0) {
    throw new Error('MULTIDB_SCOPES must contain at least one scope')
  }
  if (!MULTIDB_URL_TEMPLATE || !MULTIDB_URL_TEMPLATE.includes('{{scope}}')) {
    throw new Error('MULTIDB_URL_TEMPLATE must contain the {{scope}} placeholder')
  }

  // DEFAULT_SCOPE is required when multi-db is enabled
  if (!DEFAULT_SCOPE) {
    throw new Error('DEFAULT_SCOPE is required when MULTIDB_ENABLED=true')
  }
  if (!scopes.includes(DEFAULT_SCOPE)) {
    throw new Error(
      `DEFAULT_SCOPE "${DEFAULT_SCOPE}" is not one of MULTIDB_SCOPES: ${scopes.join(', ')}`
    )
  }

  const clients = {}
  const dbs = {}

  fastify.log.info({ scopes }, 'Connecting to multi-db scopes')

  // Determine if encryption is enabled
  const encryptionEnabled = KMS_PROVIDER && KMS_PROVIDER !== 'none'
  const hasEncryptedCollections = encryptionEnabled
    && fastify.collections?.some(hasCollectionEncryptionEnabled)

  const connectionPromises = scopes.map(async(scope) => {
    const url = MULTIDB_URL_TEMPLATE.replace(/\{\{scope\}\}/g, scope)
    const clientOptions = {
      maxIdleTimeMS: MULTIDB_MAX_IDLE_TIME_MS || 0,
    }

    // If encryption is configured, resolve per-scope data keys and schema maps
    if (hasEncryptedCollections) {
      fastify.log.debug({ scope }, 'Resolving encryption config for multi-db scope')

      const { databaseName, dataKeysId } = await retrieveDataKeyIdForScope(
        fastify,
        fastify.collections,
        scope,
        url
      )

      const schemaMaps = generateSchemaMaps(databaseName, fastify.collections, dataKeysId)
      const autoEncryption = generateEncryptionConfigForScope(fastify, scope, schemaMaps)

      if (autoEncryption) {
        clientOptions.autoEncryption = autoEncryption
        fastify.log.debug({ scope }, 'autoEncryption configured for multi-db scope')
      }
    }

    const client = new MongoClient(url, clientOptions)

    await client.connect()
    clients[scope] = client
    dbs[scope] = client.db()
    fastify.log.debug({ scope, dbName: dbs[scope].databaseName }, 'Multi-db scope connected')
  })

  await Promise.all(connectionPromises)

  const multidb = {
    scopes,
    clients,
    dbs,
    defaultScope: DEFAULT_SCOPE,
    defaultDb: dbs[DEFAULT_SCOPE],

    /**
     * Map of modelName → real MongoDB collection name.
     * Populated at boot from fastify.models (see multidb/index.js).
     * Allows collection() to accept either a modelName or a raw collection name.
     * @type {Record<string, string>}
     */
    collectionNameMap: {},

    /**
     * Get a collection from a specific scope's database.
     * Accepts either a modelName (resolved via collectionNameMap) or
     * a raw MongoDB collection name (used as-is when not in the map).
     * @param {string} scope
     * @param {string} nameOrModel - modelName or raw collection name
     * @returns {import('mongodb').Collection}
     */
    collection(scope, nameOrModel) {
      const db = dbs[scope]
      if (!db) {
        throw new Error(`Unknown multi-db scope: ${scope}`)
      }
      const resolved = this.collectionNameMap[nameOrModel] || nameOrModel
      return db.collection(resolved)
    },

    /**
     * Get collections across all scopes for a given collection/model name.
     * Returns an array of { scope, collection } objects.
     * @param {string} nameOrModel - modelName or raw collection name
     * @returns {Array<{ scope: string, collection: import('mongodb').Collection }>}
     */
    allCollections(nameOrModel) {
      const resolved = this.collectionNameMap[nameOrModel] || nameOrModel
      return scopes.map(scope => ({
        scope,
        collection: dbs[scope].collection(resolved),
      }))
    },

    /**
     * Check if all scope connections are healthy.
     * @returns {Promise<boolean>}
     */
    async isUp() {
      try {
        const pings = scopes.map(scope =>
          clients[scope].db().command({ ping: 1 })
        )
        await Promise.all(pings)
        return true
      } catch {
        return false
      }
    },
  }

  fastify.decorate('multidb', multidb)

  // Graceful shutdown: close all clients
  fastify.addHook('onClose', async() => {
    fastify.log.info('Closing multi-db connections')
    const closePromises = Object.entries(clients).map(async([scope, client]) => {
      try {
        await client.close()
        fastify.log.debug({ scope }, 'Multi-db client closed')
      } catch (error) {
        fastify.log.error({ scope, error }, 'Error closing multi-db client')
      }
    })
    await Promise.all(closePromises)
  })
}

/**
 * Parse scopes from env var. Supports comma-separated or JSON array.
 * @param {string} scopesValue
 * @returns {string[]}
 */
function parseScopes(scopesValue) {
  if (!scopesValue) {
    return []
  }

  const trimmed = scopesValue.trim()

  // Try JSON array first
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (!Array.isArray(parsed)) {
        throw new Error('MULTIDB_SCOPES JSON must be an array')
      }
      return parsed
        .map(item => String(item).trim())
        .filter(Boolean)
    } catch (error) {
      throw new Error(`Invalid MULTIDB_SCOPES JSON: ${error.message}`)
    }
  }

  // Comma-separated
  return trimmed
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

module.exports = fp(multidbMongoConnections, {
  name: 'multidb-mongo-connections',
  decorators: { fastify: ['config'] },
})

module.exports.parseScopes = parseScopes
