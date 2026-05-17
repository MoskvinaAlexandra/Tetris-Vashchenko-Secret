import pkg from 'pg';
import { logger } from './utils/logger.js';

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/tetris',
  ssl: false
});

pool.on('error', (err) => {
  logger.error('Unexpected database error:', err);
});

(async () => {
  try {
    const client = await pool.connect();
    logger.info('Database connected successfully');
    client.release();
  } catch (err) {
    logger.error('Failed to connect to database:', err.message);
    logger.warn('Server will continue, but database operations may fail');
  }
})();

export default pool;