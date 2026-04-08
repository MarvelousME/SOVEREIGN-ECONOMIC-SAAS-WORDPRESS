@echo off
setlocal
call "%~dp0up-all.bat" %*
exit /b %ERRORLEVEL%
