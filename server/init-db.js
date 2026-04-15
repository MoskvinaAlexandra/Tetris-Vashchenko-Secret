// init-db.js — Initialize tetris database with new schema (v2.0)
import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/tetris',
    ssl: false
});

async function initDb() {
    try {
        console.log('🔧 Initializing database schema...');

        // Read migration file
        const migrationPath = path.join(__dirname, 'db/migrations/001_initial_schema.sql');
        const schema = fs.readFileSync(migrationPath, 'utf8');

        // Execute schema
        await pool.query(schema);

        console.log('✅ Database schema initialized successfully');
        console.log('📊 Tables created:');
        console.log('  ✓ players');
        console.log('  ✓ rooms');
        console.log('  ✓ room_participants');
        console.log('  ✓ matches');
        console.log('  ✓ player_stats');

        process.exit(0);
    } catch (err) {
        console.error('❌ DB initialization error:', err.message);
        process.exit(1);
    }
}

initDb();
