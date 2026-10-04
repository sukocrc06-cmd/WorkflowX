@echo off
title WorkFlowX
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js bulunamadi. https://nodejs.org adresinden LTS surumunu kurup tekrar dene.
  pause
  exit /b 1
)
node tools\serve.js
pause
