@echo off
echo.
echo ============================================
echo   VYBEON Local Development Startup
echo ============================================
echo.

REM Kill any existing process on port 4010
echo [0/4] Stopping any existing API on port 4010...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":4010 "') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo       Waiting 2s for port to free...
timeout /t 2 /nobreak >nul

REM Step 1: Start Postgres + Redis via Docker
echo [1/4] Starting PostgreSQL + Redis...
docker compose -f infra/docker-compose.yml up -d postgres redis
if %errorlevel% neq 0 (
    echo ERROR: Docker failed. Is Docker Desktop running?
    pause
    exit /b 1
)
echo       Waiting 5s for DB to be ready...
timeout /t 5 /nobreak >nul

REM Step 2: Install deps if needed
echo [2/4] Checking dependencies...
if not exist node_modules (
    echo       Installing root dependencies...
    call npm install
)

REM Step 3: Run Prisma generate + migrate
echo [3/4] Running Prisma migrate...
cd apps\api
call npx prisma generate
if %errorlevel% neq 0 (
    echo ERROR: prisma generate failed.
    cd ..\..
    pause
    exit /b 1
)
call npx prisma migrate dev --name add-party-connections-remove-stories
if %errorlevel% neq 0 (
    echo WARNING: migrate dev failed - trying db push as fallback...
    call npx prisma db push
)
cd ..\..

REM Step 4: Launch API in new terminal
echo [4/4] Starting API server on port 4010...
start "VYBEON API" cmd /k "cd /d %~dp0apps\api && npm run dev"

echo.
echo ============================================
echo   API starting at http://192.168.31.200:4010
echo ============================================
echo.
echo   Now open another terminal and run:
echo     cd apps\mobile
echo     npx expo start
echo.
echo   Then in Expo:
echo     Press 'a' to open on Android emulator
echo     OR scan the QR code with Expo Go app
echo.
pause
