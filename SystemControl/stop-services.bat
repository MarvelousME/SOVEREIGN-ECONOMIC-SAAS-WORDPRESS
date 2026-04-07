@echo off
setlocal enabledelayedexpansion
call "%~dp0_config.bat"
if errorlevel 1 exit /b 1

if "%~1"=="" (
  echo Usage: stop-services.bat service1 [service2 ...]
  echo Example: stop-services.bat api nats temporal
  exit /b 1
)

echo [INFO] Stopping services: %*
podman compose -f "%COMPOSE_FILE%" stop %*
if errorlevel 1 (
  echo [ERROR] Failed to stop requested services.
  exit /b 1
)

echo [OK] Services stopped.
exit /b 0
