@echo off
setlocal

if "%~1"=="" (
  echo Usage: stack-up.bat ^<local^|dev^|staging^|prod^|security^> [--no-build]
  exit /b 1
)

set "STACK_PROFILE=%~1"
shift

call "%~dp0up-all.bat" %*
exit /b %errorlevel%
