@echo off
cd /d "%~dp0"
netstat -ano | findstr /R /C:":8080 .*LISTENING" >nul
if not errorlevel 1 (
  echo order-system is already running.
  start "" "http://localhost:8080/hub.html"
  pause
  exit /b 0
)
set "JAR=target\order-system-0.0.1-SNAPSHOT.jar"
if not exist "%JAR%" (
  echo Build not found. Run: mvn package
  pause
  exit /b 1
)
set "JAVA=java"
if defined JAVA_HOME if exist "%JAVA_HOME%\bin\java.exe" set "JAVA=%JAVA_HOME%\bin\java.exe"
echo Starting order-system server...
echo Open your browser at: http://localhost:8080
echo Press Ctrl+C to stop the server.
echo.
"%JAVA%" -jar "%JAR%"
pause
