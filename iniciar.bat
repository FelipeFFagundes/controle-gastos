@echo off
title Controle de Gastos - Servidor
cd /d "%~dp0"
echo ===================================================
echo     Iniciando seu Aplicativo de Controle de Gastos
echo ===================================================
echo.

if not exist node_modules (
  echo Instalando dependencias do servidor...
  call npm install
)

if not exist client\dist\index.html (
  echo Compilando a interface pela primeira vez...
  call npm run build
)

echo Abrindo o navegador em http://localhost:5000 ...
start http://localhost:5000
echo.
echo Servidor em execucao. Para fechar, feche esta janela.
echo.
node server/index.js
pause
