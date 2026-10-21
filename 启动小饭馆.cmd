@echo off
setlocal
cd /d "%~dp0"

netstat -ano | findstr /R /C:":3306 .*LISTENING" >nul
if errorlevel 1 (
  echo Starting MySQL...
  start "" /min "D:\22773\Codex\dev\mysql\bin\mysqld.exe" --defaults-file=D:\22773\Codex\dev\mysql\my.ini
  ping -n 8 127.0.0.1 >nul
)
netstat -ano | findstr /R /C:":3306 .*LISTENING" >nul
if errorlevel 1 (
  echo MySQL failed to start. Check D:\22773\Codex\dev\mysql\logs\error.log
  pause
  exit /b 1
)

netstat -ano | findstr /R /C:":8080 .*LISTENING" >nul
if not errorlevel 1 (
  echo order-system is already running.
  start "" "http://localhost:8080/hub.html"
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
echo Starting order-system...
start "order-system" /min "%JAVA%" -jar "%JAR%"
ping -n 14 127.0.0.1 >nul
netstat -ano | findstr /R /C:":8080 .*LISTENING" >nul
if errorlevel 1 (
  echo order-system failed to start. Check the minimized console window.
  pause
  exit /b 1
)
start "" "http://localhost:8080/hub.html"
exit /b 0
