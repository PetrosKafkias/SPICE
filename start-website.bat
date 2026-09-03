@echo off
setlocal
cd /d "%~dp0"

set "NODE_EXE=C:\Users\Petros Kafkias\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "DEV_SERVER=%CD%\server\dev.mjs"

echo Starting SPICE website...
echo.
echo Keep this window open while you view the website.
echo Website URL: http://127.0.0.1:5173
echo.

if exist "%NODE_EXE%" (
  "%NODE_EXE%" "%DEV_SERVER%"
) else (
  node "%DEV_SERVER%"
)

echo.
echo Server stopped. Press any key to close this window.
pause >nul
