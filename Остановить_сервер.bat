@echo off
chcp 65001 >nul
echo Stopping English Reboot server...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
echo Done.
timeout /t 2 >nul
