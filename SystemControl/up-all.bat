@echo off
setlocal
call "%~dp0_config.bat"
if errorlevel 1 exit /b 1

if /I "%~1"=="--no-build" (
  echo [INFO] Starting full stack without build using: %COMPOSE_FILE%
  podman compose --env-file "%ENV_FILE%" -f "%COMPOSE_FILE%" up -d
) else (
  echo [INFO] Building and starting full stack using: %COMPOSE_FILE%
  podman compose --env-file "%ENV_FILE%" -f "%COMPOSE_FILE%" up -d --build
)

if errorlevel 1 (
  echo [ERROR] Failed to start stack.
  exit /b 1
)

echo [OK] Stack is up.
exit /b 0
