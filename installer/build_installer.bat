@echo off
cd /d "%~dp0.."
call Windows-Test\build_app.bat
if not exist "dist\PLOROPSIS\PLOROPSIS.exe" (
    echo Build failed, aborting installer step.
    pause
    exit /b 1
)

set ISCC="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if not exist %ISCC% set ISCC="C:\Program Files\Inno Setup 6\ISCC.exe"
if not exist %ISCC% set ISCC="%LocalAppData%\Programs\Inno Setup 7\ISCC.exe"
if not exist %ISCC% set ISCC="%LocalAppData%\Programs\Inno Setup 6\ISCC.exe"
if not exist %ISCC% (
    echo Inno Setup not found. Install it from https://jrsoftware.org/isdl.php
    pause
    exit /b 1
)

%ISCC% installer\setup.iss
echo.
echo Installer built: installer\Output\PLOROPSIS-Setup.exe
pause
