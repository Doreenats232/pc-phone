#!/usr/bin/env bash
# Builds the one-folder PC package: PCPhone/  (Start PC Phone.bat + system/ + data/)
# Usage: scripts/pack-pc.sh [windows]   ("windows" bundles node.exe so nothing needs installing)
set -e
cd "$(dirname "$0")/.."
npm run build
OUT=PCPhone
rm -rf $OUT && mkdir -p $OUT/system $OUT/data
cp -r .next/standalone/. $OUT/system/
mkdir -p $OUT/system/.next && cp -r .next/static $OUT/system/.next/static
[ -d public ] && cp -r public $OUT/system/public
if [ "$1" = "windows" ]; then
  V=22.11.0
  curl -fsSL https://nodejs.org/dist/v$V/node-v$V-win-x64.zip -o /tmp/node.zip
  unzip -q /tmp/node.zip -d /tmp && mkdir -p $OUT/system/node && cp /tmp/node-v$V-win-x64/node.exe $OUT/system/node/
fi
if [ "$1" = "windows" ]; then
  curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe -o $OUT/system/cloudflared.exe
fi
cat > "$OUT/Start PC Phone.bat" <<'BAT'
@echo off
title PC Phone
cd /d "%~dp0"
set PC_DATA_DIR=%~dp0data
set HOSTNAME=0.0.0.0
set PORT=3000
if not exist "system\.next" (
  echo  Download is incomplete: the system\.next folder is missing. Re-download the zip.
  pause
  exit /b 1
)
echo.
echo  PC PHONE is running. Type this address in the phone app:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do for /f "tokens=*" %%b in ("%%a") do echo %%b| findstr /b "169.254" >nul || echo     http://%%b:3000
echo.
echo  A page with a QR code opens in your browser: scan it from the phone app.
echo  Everything (apps, files, data) is saved in the "data" folder next to this file.
echo  Keep this window open. Close it to turn the phone off.
echo.
taskkill /im cloudflared.exe /f >nul 2>&1
del /q "data\tunnel.log" 2>nul
if exist "system\cloudflared.exe" (
  if not exist "data\remote.choice" (
    echo  Use your phone from anywhere, not just home Wi-Fi?
    echo  ^(You must set a PIN in the phone's Settings first.^)
    choice /c YN /m " Allow access from anywhere"
    if errorlevel 2 (echo N> "data\remote.choice") else (echo Y> "data\remote.choice")
    echo  ^(To be asked again, delete data\remote.choice^)
  )
  findstr /b "Y" "data\remote.choice" >nul && start "PC Phone tunnel" /min "system\cloudflared.exe" tunnel --no-autoupdate --url http://localhost:3000 --logfile "%~dp0data\tunnel.log"
)
start "" http://localhost:3000/connect
if exist "system\node\node.exe" (system\node\node.exe system\server.js) else (node system\server.js)
taskkill /im cloudflared.exe /f >nul 2>&1
pause
BAT
cat > $OUT/data/README.txt <<'TXT'
Your whole phone lives in this folder (database, files, installed apps).
Copy this folder to back it up or move it to another PC.
TXT
echo "Done: $OUT/"
