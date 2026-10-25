@echo off
title FormMind AOC-4 System
echo =====================================================
echo  FormMind AOC-4 Filing System - Full Stack Launcher
echo =====================================================
echo.

REM Start backend server in a new window
echo [1/2] Starting Backend Server on port 3001...
start "FormMind SERVER" cmd /k "node \"C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js\" run dev:server"
timeout /t 4 /nobreak > nul

REM Start Vite frontend in a new window
echo [2/2] Starting Frontend (Vite) on port 5173...
start "FormMind CLIENT" cmd /k "node \"C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js\" run dev:client"
timeout /t 3 /nobreak > nul

echo.
echo =====================================================
echo  Both services started! Opening browser...
echo  Dashboard: http://localhost:5173
echo  API:       http://localhost:3001/api/health
echo =====================================================
echo.
start "" "http://localhost:5173"
echo Press any key to close this launcher...
pause > nul
