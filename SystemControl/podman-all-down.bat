@echo off
setlocal
call "%~dp0down-all.bat" %*
exit /b %ERRORLEVEL%
