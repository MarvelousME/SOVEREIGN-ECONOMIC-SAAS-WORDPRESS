@echo off
setlocal

REM Forward all args to logs-services.bat
REM Example:
REM   events-notifications-logs.bat --tail 300
REM   events-notifications-logs.bat --no-follow --tail 500
call "%~dp0logs-services.bat" nats temporal api workflows ubi-engine notifications-service agent-runner %*
exit /b %errorlevel%
