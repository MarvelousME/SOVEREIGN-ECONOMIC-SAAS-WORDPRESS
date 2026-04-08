@echo off

REM Resolve repo root from this script location.
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "REPO_ROOT=%%~fI"

REM Stack profile selection:
REM   set STACK_PROFILE=local|dev|staging|prod|security
REM Overrides:
REM   set COMPOSE_FILE_PATH=...
REM   set ENV_FILE_PATH=...
if "%STACK_PROFILE%"=="" set "STACK_PROFILE=dev"

if /I "%STACK_PROFILE%"=="local" (
  set "DEFAULT_COMPOSE_FILE=%REPO_ROOT%\docker-compose.local.yml"
  set "DEFAULT_ENV_FILE=%REPO_ROOT%\.env"
) else if /I "%STACK_PROFILE%"=="dev" (
  set "DEFAULT_COMPOSE_FILE=%REPO_ROOT%\docker-compose.dev.yml"
  set "DEFAULT_ENV_FILE=%REPO_ROOT%\.env"
) else if /I "%STACK_PROFILE%"=="staging" (
  set "DEFAULT_COMPOSE_FILE=%REPO_ROOT%\docker-compose.staging.yml"
  set "DEFAULT_ENV_FILE=%REPO_ROOT%\.env.staging"
) else if /I "%STACK_PROFILE%"=="prod" (
  set "DEFAULT_COMPOSE_FILE=%REPO_ROOT%\docker-compose.prod.yml"
  set "DEFAULT_ENV_FILE=%REPO_ROOT%\.env.production"
) else if /I "%STACK_PROFILE%"=="security" (
  set "DEFAULT_COMPOSE_FILE=%REPO_ROOT%\docker-compose.security.yml"
  set "DEFAULT_ENV_FILE=%REPO_ROOT%\.env"
) else (
  echo [ERROR] Unknown STACK_PROFILE: "%STACK_PROFILE%"
  echo [INFO] Valid profiles: local, dev, staging, prod, security
  exit /b 1
)

if not "%COMPOSE_FILE_PATH%"=="" (
  set "COMPOSE_FILE=%COMPOSE_FILE_PATH%"
) else (
  set "COMPOSE_FILE=%DEFAULT_COMPOSE_FILE%"
)

if not "%ENV_FILE_PATH%"=="" (
  set "ENV_FILE=%ENV_FILE_PATH%"
) else (
  set "ENV_FILE=%DEFAULT_ENV_FILE%"
)

if not exist "%ENV_FILE%" (
  echo [WARN] Env file not found for profile "%STACK_PROFILE%": "%ENV_FILE%"
  echo [WARN] Falling back to root ".env".
  set "ENV_FILE=%REPO_ROOT%\.env"
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

echo [INFO] Profile: %STACK_PROFILE%
echo [INFO] Compose: %COMPOSE_FILE%
echo [INFO] Env: %ENV_FILE%
exit /b 0
