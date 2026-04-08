@echo off
setlocal
call "%~dp0_config.bat"
if errorlevel 1 exit /b 1

set "REMOVE_VOLUMES="
if /I "%~1"=="--volumes" set "REMOVE_VOLUMES=--volumes"

echo [INFO] Shutting down full stack using: %COMPOSE_FILE%
podman compose --env-file "%ENV_FILE%" -f "%COMPOSE_FILE%" down %REMOVE_VOLUMES%

if errorlevel 1 (
  echo [ERROR] Failed to shut down stack.
  exit /b 1
)

echo [OK] Stack is down.
exit /b 0
