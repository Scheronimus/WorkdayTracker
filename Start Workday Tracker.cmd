@echo off
setlocal
title Workday Tracker
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed or npm is not available.
  echo Install Node.js from https://nodejs.org/ and try again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo.
  echo Preparing Workday Tracker for the first time...
  echo.
  call npm ci
  if errorlevel 1 (
    echo.
    echo Setup failed. Review the message above, then try again.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo Starting Workday Tracker...
echo Your browser will open automatically.
echo Keep this window open while you test the app.
echo Press Ctrl+C here when you are finished.
echo.

call npm start

if errorlevel 1 (
  echo.
  echo The app stopped unexpectedly. Review the message above.
  echo.
  pause
)
