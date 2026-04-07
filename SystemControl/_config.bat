@echo off

REM Resolve repo root from this script location.
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "REPO_ROOT=%%~fI"

REM Allow override: set COMPOSE_FILE_PATH before calling scripts.
if not "%COMPOSE_FILE_PATH%"=="" (
  set "COMPOSE_FILE=%COMPOSE_FILE_PATH%"
) else (
  set "COMPOSE_FILE=%REPO_ROOT%\docker-compose.dev.yml"
)

if not exist "%COMPOSE_FILE%" (
  echo [ERROR] Compose file not found: "%COMPOSE_FILE%"
  exit /b 1
)

where podman >nul 2>nul
if errorlevel 1 (
  echo [ERROR] podman CLI not found on PATH.
  exit /b 1
)

set "DOCKER_COMPOSE_CMD=podman compose -f "%COMPOSE_FILE%""
exit /b 0
