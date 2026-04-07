@echo off
setlocal enabledelayedexpansion
call "%~dp0_config.bat"
if errorlevel 1 exit /b 1

if "%~1"=="" (
  echo Usage: start-services.bat service1 [service2 ...]
  echo Example: start-services.bat api nats temporal
  exit /b 1
)

echo [INFO] Starting services: %*
podman compose -f "%COMPOSE_FILE%" up -d %*
if errorlevel 1 (
  echo [ERROR] Failed to start requested services.
  exit /b 1
)

echo [OK] Services started.
exit /b 0
