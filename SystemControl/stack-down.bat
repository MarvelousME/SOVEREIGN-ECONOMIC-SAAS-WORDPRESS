@echo off
setlocal

if "%~1"=="" (
  echo Usage: stack-down.bat ^<local^|dev^|staging^|prod^|security^> [--volumes]
  exit /b 1
)

set "STACK_PROFILE=%~1"
shift

call "%~dp0down-all.bat" %*
exit /b %errorlevel%
