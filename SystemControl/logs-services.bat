@echo off
setlocal enabledelayedexpansion
call "%~dp0_config.bat"
if errorlevel 1 exit /b 1

if "%~1"=="" (
  echo Usage: logs-services.bat service1 [service2 ...] [--tail N] [--no-follow]
  echo Example: logs-services.bat api nats --tail 200
  exit /b 1
)

set "TAIL=200"
set "FOLLOW=1"
set "REQUESTED_SERVICES="

:parseArgs
if "%~1"=="" goto runLogs
if /I "%~1"=="--tail" (
  if "%~2"=="" (
    echo [ERROR] --tail requires a number.
    del "%SERVICES_FILE%" >nul 2>nul
    exit /b 1
  )
  set "TAIL=%~2"
  shift
  shift
  goto parseArgs
)
if /I "%~1"=="--no-follow" (
  set "FOLLOW=0"
  shift
  goto parseArgs
)

set "REQUESTED_SERVICES=!REQUESTED_SERVICES! %~1"
shift
goto parseArgs

:runLogs
if "%REQUESTED_SERVICES%"=="" (
  echo [ERROR] No valid services provided.
  exit /b 1
)

echo [INFO] Logs for:%REQUESTED_SERVICES% ^| tail=%TAIL% follow=%FOLLOW%
if "%FOLLOW%"=="1" (
  podman compose -f "%COMPOSE_FILE%" logs -f --tail %TAIL% %REQUESTED_SERVICES%
) else (
  podman compose -f "%COMPOSE_FILE%" logs --tail %TAIL% %REQUESTED_SERVICES%
)
exit /b %errorlevel%
