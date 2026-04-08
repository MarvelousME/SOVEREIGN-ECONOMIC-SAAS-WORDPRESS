@echo off
setlocal

REM Stop common event and notification path services.
REM Missing services are safely warned/skipped by stop-services.bat.
call "%~dp0stop-services.bat" agent-runner notifications-service ubi-engine workflows api temporal nats redis postgres
exit /b %errorlevel%
