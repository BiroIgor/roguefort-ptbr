@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Instale o Node.js: https://nodejs.org & pause & exit /b 1)
tasklist | find /i "roguefort.exe" >nul && (echo Feche o Roguefort antes de aplicar a traducao. & pause & exit /b 1)
if not exist tools\node_modules\acorn (pushd tools & call npm install --no-audit --no-fund & popd)
node tools\aplicar.js aplicar || (echo Falhou. O jogo nao foi alterado. & pause & exit /b 1)
echo Traducao aplicada. Pode abrir o jogo.
pause
