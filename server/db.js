// server/db.js — упрощённая версия без root.crt (рекомендуется для начала)
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/tetris', 
ssl: false
});

export default pool;