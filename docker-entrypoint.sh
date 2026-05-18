#!/bin/sh
set -e

echo "🎮 Tetris Vashchenko Secret - Starting..."

# Переходим в директорию с node_modules
cd /app/server

# Ждем готовности PostgreSQL
echo "⏳ Waiting for PostgreSQL..."
until node check-db.cjs 2>/dev/null; do
  sleep 2
done

# Автоинициализация БД если включена
if [ "$AUTO_INIT_DB" = "true" ]; then
  echo "🔧 Checking database schema..."
  
  # Проверяем существование таблицы players
  TABLE_EXISTS=$(node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });
  pool.query(\"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'players')\")
    .then(res => { console.log(res.rows[0].exists); pool.end(); })
    .catch(err => { console.log('false'); pool.end(); });
  " 2>/dev/null)
  
  if [ "$TABLE_EXISTS" = "false" ]; then
    echo "📦 Initializing database schema..."
    node init-db.js
    echo "✅ Database initialized"
  else
    echo "✅ Database schema already exists"
  fi
fi

echo "🚀 Starting application..."
exec "$@"
