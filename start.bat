@echo off
title Liquid Craft Launcher
echo ========================================================
echo   LIQUID CRAFT LAUNCHER (Liquid Glass Edition)
echo   Standalone Desktop Application (Electron)
echo   Mirror: BMCLAPI Non-Mojang Mirror CDN
echo   Integrated: Modrinth v2 API
echo ========================================================
echo.
cd /d "%~dp0"

if exist "node_modules\electron\dist\electron.exe" (
  echo Launching Standalone Desktop Application...
  start "" "node_modules\electron\dist\electron.exe" .
) else (
  echo Launching via Node Web Engine...
  start http://localhost:3918
  node server.js
)
