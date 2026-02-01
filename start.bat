@echo off
echo ========================================
echo   PDF System - Quick Start
echo ========================================
echo.

echo [1/3] Checking environment...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)
echo [OK] Node.js installed

echo.
echo [2/3] Checking dependencies...
if not exist node_modules (
    echo [WARNING] Dependencies not found. Installing...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)
echo [OK] Dependencies ready

echo.
echo [3/3] Starting services...
echo.
echo [START] Starting backend service...
start "Backend Service" cmd /k "cd server && npm run dev"

timeout /t 3 /nobreak >nul

echo [START] Starting admin frontend...
start "Admin Frontend" cmd /k "cd admin && npm run dev"

timeout /t 3 /nobreak >nul

echo [START] Starting viewer frontend...
start "Viewer Frontend" cmd /k "cd viewer && npm run dev"

echo.
echo ========================================
echo   [SUCCESS] All services started!
echo ========================================
echo.
echo Admin Frontend: http://localhost:5173
echo Viewer Frontend: http://localhost:5174
echo Backend API: http://localhost:3001
echo Default Password: Admin123
echo.
echo Press any key to close this window...
pause >nul
