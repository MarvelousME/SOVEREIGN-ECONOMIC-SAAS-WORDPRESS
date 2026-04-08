@echo off
setlocal

REM Bring up common event and notification path services.
REM Missing services are safely warned/skipped by start-services.bat.
call "%~dp0start-services.bat" nats temporal postgres redis api workflows ubi-engine notifications-service agent-runner
exit /b %errorlevel%
