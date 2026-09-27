@echo off
cd /d "%~dp0"
echo Starting order-system server...
echo After it starts, open your browser at: http://localhost:8080
echo.
call mvn spring-boot:run
pause
