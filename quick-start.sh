#!/bin/bash
# quick-start.sh — Быстрый старт Tetris v2.0

echo "🎮 Tetris Vashchenko Secret v2.0 — Quick Start"
echo "=============================================="
echo ""

# Check Node.js
echo "1️⃣ Проверка Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен! Установи его с https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js установлен: $(node --version)"

# Check PostgreSQL
echo ""
echo "2️⃣ Проверка PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL не установлен! Установи его с https://www.postgresql.org/"
    exit 1
fi
echo "✅ PostgreSQL доступен: $(psql --version)"

# Install dependencies
echo ""
echo "3️⃣ Установка зависимостей..."
cd server
npm install --silent
echo "✅ Зависимости установлены"

# Initialize database
echo ""
echo "4️⃣ Инициализация базы данных..."
npm run init-db --silent
echo "✅ База данных создана"

# Start server
echo ""
echo "5️⃣ Запуск сервера..."
echo "✅ Сервер запущен на http://localhost:3000"
echo ""
echo "🚀 Откройте браузер и перейдите на http://localhost:3000"
echo ""
npm start

