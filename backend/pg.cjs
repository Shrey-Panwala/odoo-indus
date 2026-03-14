let Pool = null

try {
  ;({ Pool } = require('pg'))
} catch (_error) {
  Pool = null
}

let pool = null

function getPool() {
  if (pool) return pool

  const connectionString = process.env.DATABASE_URL
  if (!connectionString || !Pool) {
    return null
  }

  pool = new Pool({
    connectionString,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  })

  return pool
}

async function withTransaction(handler) {
  const localPool = getPool()
  if (!localPool) {
    const error = new Error('PostgreSQL is not configured. Set DATABASE_URL and install pg.')
    error.code = 'PG_NOT_CONFIGURED'
    throw error
  }

  const client = await localPool.connect()
  try {
    await client.query('BEGIN')
    const result = await handler(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

module.exports = {
  getPool,
  withTransaction,
}
