@echo off
title Controle de Gastos - Servidor
echo ===================================================
echo     Iniciando seu Aplicativo de Controle de Gastos
echo ===================================================
echo.
echo Abrindo o navegador em http://localhost:5000 ...
start http://localhost:5000
echo.
echo Servidor em execucao. Para fechar, feche esta janela.
echo.
cd /d "%~dp0"
node server/index.js
pause
