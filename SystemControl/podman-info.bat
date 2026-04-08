@echo off
setlocal

call "%~dp0_config.bat"
if errorlevel 1 exit /b 1

echo [INFO] Podman version:
podman --version
if errorlevel 1 (
  echo [ERROR] Failed to read podman version.
  exit /b 1
)

echo.
echo [INFO] Podman system info (host + store + connection):
podman info --format "Host={{.Host.OS}}/{{.Host.Arch}}  Rootless={{.Host.Security.Rootless}}  Store={{.Store.GraphDriverName}}  Connection={{.Host.RemoteSocket.Path}}"
if errorlevel 1 (
  echo [WARN] Could not read formatted podman info. Falling back to plain summary.
  podman info
)

echo.
echo [INFO] Compose provider version:
podman compose version
if errorlevel 1 (
  echo [WARN] podman compose version check failed.
)

echo.
echo [INFO] Compose services declared in: %COMPOSE_FILE%
podman compose --env-file "%ENV_FILE%" -f "%COMPOSE_FILE%" config --services
if errorlevel 1 (
  echo [ERROR] Failed to parse compose services from %COMPOSE_FILE%.
  exit /b 1
)

echo.
echo [INFO] Running/stopped containers for active compose file:
podman compose --env-file "%ENV_FILE%" -f "%COMPOSE_FILE%" ps
if errorlevel 1 (
  echo [WARN] Could not query compose ps for %COMPOSE_FILE%.
)

echo.
echo [OK] Podman info summary complete.
exit /b 0
