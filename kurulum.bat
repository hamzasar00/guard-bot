@echo off
setlocal EnableExtensions
title Guard Bot - Kurulum
cd /d "%~dp0"

echo.
echo ==========================================
echo          GUARD BOT KURULUMU
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi.
  echo Node.js 18.17 veya daha yeni bir surum kur:
  echo https://nodejs.org/
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do echo Node.js: %%v

if not exist package.json (
  echo [HATA] package.json bulunamadi. Dosyalari eksik indirmis olabilirsin.
  pause
  exit /b 1
)

if not exist .env (
  copy /Y .env.example .env >nul
  echo [BILGI] .env dosyasi olusturuldu.
  echo [UYARI] .env dosyasina DISCORD_TOKEN ve CLIENT_ID bilgilerini yaz.
) else (
  echo [BILGI] .env zaten mevcut, korunuyor.
)

if not exist data mkdir data

echo.
echo [BILGI] NPM paketleri kuruluyor...
call npm install
if errorlevel 1 (
  echo [HATA] npm install basarisiz oldu.
  pause
  exit /b 1
)

echo.
echo [BASARILI] Kurulum tamamlandi.
echo Simdi .env dosyasini doldurup baslat.bat dosyasini calistirabilirsin.
pause