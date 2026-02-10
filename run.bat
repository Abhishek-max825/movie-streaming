@echo off
title Movie Streamer
echo ==========================================
echo   Starting Movie Streaming Application
echo ==========================================

cd frontend

IF NOT EXIST "node_modules" (
    echo Node modules not found. Installing dependencies...
    call npm install
)

echo Starting development server...
echo Access the app at http://localhost:3000
npm run dev
pause
