@echo off
setlocal

if "%~1"=="" (
  echo Usage: stack-status.bat ^<local^|dev^|staging^|prod^|security^>
  exit /b 1
)

set "STACK_PROFILE=%~1"
call "%~dp0project-status.bat"
exit /b %errorlevel%
