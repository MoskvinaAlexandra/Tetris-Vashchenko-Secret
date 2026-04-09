// init-db.js — Initialize tetris database and scores table
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/tetris',
    ssl: { rejectUnauthorized: false }
});

async function initDb() {
    try {
        // Create table if not exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS scores (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                score INT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_scores_desc ON scores(score DESC);
        `);
        console.log('✅ Database initialized successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ DB initialization error:', err);
        process.exit(1);
    }
}

initDb();
