@echo off
setlocal
title Workday Tracker - Mobile Testing
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

if not exist "node_modules\qrcode-terminal\" (
  echo.
  echo Preparing mobile testing for the first time...
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

call npm run mobile

if errorlevel 1 (
  echo.
  echo Mobile testing stopped unexpectedly. Review the message above.
  echo.
  pause
)
