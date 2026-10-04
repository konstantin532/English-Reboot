@echo off
chcp 65001 >nul
title English Reboot - Server
cd /d "%~dp0"

rem English Reboot - local server on http://localhost:8000
rem The server (scripts\serve.py) opens the browser itself once it is ready.
rem To stop: close this window or press Ctrl+C.

rem --- Find Python (py launcher first: "python" may be a Microsoft Store stub) ---
set "PYCMD="
where py >nul 2>&1 && set "PYCMD=py -3"
if not defined PYCMD (
    where python >nul 2>&1 && set "PYCMD=python"
)

if defined PYCMD (
    %PYCMD% scripts\serve.py --open
    if not errorlevel 1 goto :eof
    echo.
    echo [!] Python failed to start the server. Trying Node.js...
)

rem --- Fallback: Node.js ---
where node >nul 2>&1 && (
    start "" cmd /c "timeout /t 2 >nul & start "" http://localhost:8000/"
    node scripts\serve.mjs 8000
    goto :eof
)

rem --- Nothing found ---
echo.
echo [!] Python and Node.js not found on this computer.
echo.
echo   1. Install Python: https://www.python.org/downloads/
echo      (check "Add python.exe to PATH" during install)
echo   2. Or open index.html directly - the app works,
echo      but PWA install and offline mode are unavailable.
echo.
set /p "CHOICE=Open app without server now? (Y/N): "
if /i "%CHOICE%"=="Y" start "" "index.html"
