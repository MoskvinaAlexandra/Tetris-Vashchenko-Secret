@echo off
REM quick-start.bat — Быстрый старт Tetris v2.0 на Windows

echo.
echo 🎮 Tetris Vashchenko Secret v2.0 — Quick Start
echo ============================================
echo.

REM Check Node.js
echo 1️⃣ Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js not found! Download from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo ✅ Node.js installed: %NODE_VER%

REM Check PostgreSQL
echo.
echo 2️⃣ Checking PostgreSQL...
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ PostgreSQL not found! Download from https://www.postgresql.org/
    echo 📖 Default: postgres:postgres@localhost:5432/tetris
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('psql --version') do set PG_VER=%%i
echo ✅ PostgreSQL available: %PG_VER%

REM Install dependencies
echo.
echo 3️⃣ Installing dependencies...
cd server
call npm install > nul 2>&1
echo ✅ Dependencies installed

REM Initialize database
echo.
echo 4️⃣ Initializing database...
call npm run init-db > nul 2>&1
echo ✅ Database created

REM Start server
echo.
echo 5️⃣ Starting server...
echo ✅ Server running on http://localhost:3000
echo.
echo 🚀 Open your browser: http://localhost:3000
echo.
call npm start
pause

