@echo off
title Push Liquid Craft Launcher to GitHub
echo ========================================================
echo   Push Liquid Craft Launcher to GitHub
echo   Target: https://github.com/QNIX-Dev/liquid-craft-launcher
echo ========================================================
echo.
echo 1. Make sure you created the empty repository at:
echo    https://github.com/new  (Name: liquid-craft-launcher)
echo.
set /p confirm="Ready to push? Press Enter or (y): "
echo.
echo Pushing commits to origin main...
git push -u origin main
echo.
pause
