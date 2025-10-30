const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'transaction_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

/**
 * Execute a SQL query
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error', { text, error: error.message });
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 */
const getClient = async () => {
  return await pool.connect();
};

/**
 * Execute a transaction
 * @param {Function} callback - Function to execute within transaction
 * @returns {Promise} Transaction result
 */
const transaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Execute migration scripts
 */
const migrate = async () => {
  try {
    console.log('Starting database migration...');
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await query(schemaSQL);
    
    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

/**
 * Check database health
 */
const healthCheck = async () => {
  try {
    const result = await query('SELECT NOW() as current_time');
    return {
      status: 'healthy',
      timestamp: result.rows[0].current_time,
      pool: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

/**
 * Close database connections
 */
const close = async () => {
  await pool.end();
  console.log('Database connections closed');
};

module.exports = {
  query,
  getClient,
  transaction,
  migrate,
  healthCheck,
  close,
  pool
};