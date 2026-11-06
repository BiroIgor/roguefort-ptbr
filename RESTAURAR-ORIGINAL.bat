@echo off
chcp 65001 >nul
cd /d "%~dp0"
tasklist | find /i "roguefort.exe" >nul && (echo Feche o Roguefort antes de restaurar. & pause & exit /b 1)
node tools\aplicar.js restaurar
pause
