@echo off
setlocal

call "%~dp0_config.bat"
if errorlevel 1 exit /b 1

echo ==============================
echo   UBI Project Status (Podman)
echo ==============================
echo [INFO] Compose file: %COMPOSE_FILE%
echo.

echo [STEP] Runtime and compose provider
call "%~dp0podman-version.bat"
if errorlevel 1 (
  echo [ERROR] Podman/compose not healthy.
  exit /b 1
)
echo.

echo [STEP] Declared services
podman compose -f "%COMPOSE_FILE%" config --services
if errorlevel 1 (
  echo [ERROR] Could not read services from compose file.
  exit /b 1
)
echo.

echo [STEP] Container status
podman compose -f "%COMPOSE_FILE%" ps
if errorlevel 1 (
  echo [WARN] Could not query compose ps.
)
echo.

echo [STEP] Health summary (if healthchecks defined)
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
if errorlevel 1 (
  echo [WARN] Could not query podman ps table.
)
echo.

echo [STEP] Recent logs for core services (tail=40, no follow)
call "%~dp0logs-services.bat" api postgres redis nats temporal --tail 40 --no-follow
if errorlevel 1 (
  echo [WARN] Could not stream one or more core logs.
)
echo.

echo [OK] Project status complete.
exit /b 0
