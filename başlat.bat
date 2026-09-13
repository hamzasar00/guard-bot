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

:BOT_LOOP
echo.
echo [BILGI] Guard Bot baslatiliyor. Durdurmak icin pencereyi kapat.
echo.
call npm start
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if "%EXIT_CODE%"=="0" (
  echo [UYARI] Bot islemi sonlandirdi.
) else (
  echo [HATA] Bot %EXIT_CODE% koduyla kapandi.
)
echo [BILGI] 10 saniye icinde yeniden baslatilacak...
timeout /t 10 /nobreak >nul
goto BOT_LOOP
