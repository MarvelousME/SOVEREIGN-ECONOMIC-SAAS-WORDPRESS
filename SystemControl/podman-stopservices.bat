@echo off
setlocal
call "%~dp0stop-services.bat" %*
exit /b %ERRORLEVEL%
