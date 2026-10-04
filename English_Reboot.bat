@echo off
chcp 65001 >nul
title English Reboot - Server
cd /d "%~dp0"

echo ============================================
echo   English Reboot - local server
echo   http://localhost:8000
echo   To stop: close this window or Ctrl+C
echo ============================================
echo.

rem --- Find Python (py launcher, then python) ---
set "PYCMD="
where py >nul 2>&1 && set "PYCMD=py -3"
if not defined PYCMD (
    where python >nul 2>&1 && set "PYCMD=python"
)

rem --- If Python found: start it, open browser ---
if defined PYCMD (
    echo Starting Python server...
    start "" http://localhost:8000
    %PYCMD% -m http.server 8000
    goto :eof
)

rem --- No Python: try Node.js (npx serve) ---
where npx >nul 2>&1 && (
    echo Python not found. Trying Node.js...
    start "" http://localhost:8000
    call npx -y serve -l 8000 .
    goto :eof
)

rem --- Nothing found: show help and open as file ---
echo.
echo [!] Python and Node.js not found on this computer.
echo.
echo Two options:
echo   1. Install Python: https://www.python.org/downloads/
echo      (check "Add python.exe to PATH" during install)
echo   2. Continue without server - the app works, but
echo      PWA install and offline mode will be unavailable.
echo.
set /p "CHOICE=Open app without server now? (Y/N): "
if /i "%CHOICE%"=="Y" start "" "index.html"
