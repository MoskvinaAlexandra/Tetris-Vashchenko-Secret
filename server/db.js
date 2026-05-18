import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/tetris',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

export default pool;