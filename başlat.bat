@echo off
setlocal EnableExtensions
title Guard Bot
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi. Once Node.js kur.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [BILGI] node_modules bulunamadi. Kurulum baslatiliyor...
  call kurulum.bat
  if errorlevel 1 exit /b 1
)

if not exist .env (
  echo [HATA] .env dosyasi yok. Once kurulum.bat dosyasini calistir.
  pause
  exit /b 1
)

echo.
echo [BILGI] Guard Bot baslatiliyor. Durdurmak icin CTRL+C.
echo.
call npm start
if errorlevel 1 (
  echo.
  echo [HATA] Bot kapandi. Yukaridaki hatayi kontrol et.
  pause
)