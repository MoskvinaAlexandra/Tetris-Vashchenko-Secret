const { Pool } = require('pg');

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

pool.query('SELECT 1')
    .then(() => { 
        console.log('✅ PostgreSQL ready'); 
        pool.end(); 
        process.exit(0); 
    })
    .catch(() => { 
        console.log('⏳ PostgreSQL not ready yet...'); 
        pool.end(); 
        process.exit(1); 
    });
