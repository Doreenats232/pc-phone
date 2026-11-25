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
cat > "$OUT/Start PC Phone.bat" <<'BAT'
@echo off
title PC Phone
cd /d "%~dp0"
set PC_DATA_DIR=%~dp0data
set HOSTNAME=0.0.0.0
set PORT=3000
echo.
echo  PC PHONE is running. Type this address in the phone app:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do echo     http://%%a:3000
echo.
echo  A page with a QR code opens in your browser: scan it from the phone app.
echo  Everything (apps, files, data) is saved in the "data" folder next to this file.
echo  Keep this window open. Close it to turn the phone off.
echo.
start "" http://localhost:3000/connect
if exist "system\node\node.exe" (system\node\node.exe system\server.js) else (node system\server.js)
pause
BAT
cat > $OUT/data/README.txt <<'TXT'
Your whole phone lives in this folder (database, files, installed apps).
Copy this folder to back it up or move it to another PC.
TXT
echo "Done: $OUT/"
