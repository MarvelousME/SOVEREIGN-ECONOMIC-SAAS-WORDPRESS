@echo off
setlocal
call "%~dp0start-services.bat" %*
exit /b %ERRORLEVEL%
