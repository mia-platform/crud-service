'use strict'

const fp = require('fastify-plugin')
const { MongoClient } = require('mongodb')

/**
 * Registers multiple MongoDB connections, one per scope.
 *
 * Each connection is stored in fastify.multidb.clients[scope] as a MongoClient,
 * and fastify.multidb.dbs[scope] as the default database for that scope.
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

  const connectionPromises = scopes.map(async(scope) => {
    const url = MULTIDB_URL_TEMPLATE.replace(/\{\{scope\}\}/g, scope)
    const client = new MongoClient(url, {
      maxIdleTimeMS: MULTIDB_MAX_IDLE_TIME_MS || 0,
    })

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
     * Get a collection from a specific scope's database.
     * @param {string} scope
     * @param {string} collectionName
     * @returns {import('mongodb').Collection}
     */
    collection(scope, collectionName) {
      const db = dbs[scope]
      if (!db) {
        throw new Error(`Unknown multi-db scope: ${scope}`)
      }
      return db.collection(collectionName)
    },

    /**
     * Get collections across all scopes for a given collection name.
     * Returns an array of { scope, collection } objects.
     * @param {string} collectionName
     * @returns {Array<{ scope: string, collection: import('mongodb').Collection }>}
     */
    allCollections(collectionName) {
      return scopes.map(scope => ({
        scope,
        collection: dbs[scope].collection(collectionName),
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
