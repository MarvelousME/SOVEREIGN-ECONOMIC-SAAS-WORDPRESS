@echo off
setlocal

where podman >nul 2>nul
if errorlevel 1 (
  echo [ERROR] podman CLI not found on PATH.
  exit /b 1
)

echo [INFO] Podman version:
podman --version
if errorlevel 1 (
  echo [ERROR] Failed to read podman version.
  exit /b 1
)

echo.
echo [INFO] Podman compose version:
podman compose version
if errorlevel 1 (
  echo [ERROR] Failed to read podman compose version.
  echo [HINT] Ensure compose support is installed for podman on this machine.
  exit /b 1
)

echo.
echo [OK] Podman + compose are available.
exit /b 0
