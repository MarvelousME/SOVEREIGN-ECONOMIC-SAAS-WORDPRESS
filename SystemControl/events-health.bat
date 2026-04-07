@echo off
setlocal enabledelayedexpansion

call "%~dp0_config.bat"
if errorlevel 1 exit /b 1

set "FAILED=0"
set "SERVICES_FILE=%TEMP%\ubi_services_%RANDOM%_%RANDOM%.txt"
set "LOG_SERVICES="
set "HAS_NATS=0"
set "HAS_TEMPORAL=0"
set "HAS_API=0"

echo ==============================
echo   Events/Notifications Health
echo ==============================
echo [INFO] Compose file: %COMPOSE_FILE%
echo.

echo [STEP] Check service presence in compose
podman compose -f "%COMPOSE_FILE%" config --services > "%SERVICES_FILE%"
if errorlevel 1 (
  echo [ERROR] Could not parse compose services.
  exit /b 1
)
type "%SERVICES_FILE%"
echo.
call :addIfPresent nats
call :addIfPresent temporal
call :addIfPresent api
call :addIfPresent notifications-service
call :addIfPresent workflows
call :addIfPresent ubi-engine
echo.

echo [STEP] Container status for event path
if "%LOG_SERVICES%"=="" (
  echo [WARN] None of the event-path services are present in this compose file.
) else (
  call "%~dp0logs-services.bat" %LOG_SERVICES% --tail 20 --no-follow
  if errorlevel 1 (
    echo [WARN] Could not fetch one or more event-path logs.
  )
)
echo.

echo [STEP] HTTP probes (best effort from host)
if "%HAS_NATS%"=="1" (
  call :probe "NATS monitor" "http://localhost:8222/varz"
) else (
  echo [SKIP] NATS probe skipped ^(service not in active compose^).
)
if "%HAS_TEMPORAL%"=="1" (
  call :probe "Temporal UI/health" "http://localhost:8233/"
) else (
  echo [SKIP] Temporal probe skipped ^(service not in active compose^).
)
if "%HAS_API%"=="1" (
  call :probe "API health" "http://localhost:3000/health"
) else (
  echo [SKIP] API probe skipped ^(service not in active compose^).
)
echo.

del "%SERVICES_FILE%" >nul 2>nul

if "!FAILED!"=="1" (
  echo [WARN] One or more checks failed.
  exit /b 1
)

echo [OK] Events/notifications health checks passed.
exit /b 0

:addIfPresent
findstr /i /c:"%~1" "%SERVICES_FILE%" >nul
if errorlevel 1 (
  echo [WARN] Service not present in compose: %~1
) else (
  echo [OK] Service present: %~1
  set "LOG_SERVICES=!LOG_SERVICES! %~1"
  if /I "%~1"=="nats" set "HAS_NATS=1"
  if /I "%~1"=="temporal" set "HAS_TEMPORAL=1"
  if /I "%~1"=="api" set "HAS_API=1"
)
exit /b 0

:probe
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 4 -Uri '%~2'; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }"
if errorlevel 1 (
  echo [WARN] Probe failed: %~1 ^(%~2^)
  set "FAILED=1"
) else (
  echo [OK] Probe passed: %~1 ^(%~2^)
)
exit /b 0
