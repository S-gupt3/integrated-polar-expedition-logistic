@echo off
echo ========================================
echo  Building PLOROPSIS (Windows)
echo ========================================

:: Check PyInstaller
pyinstaller --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing PyInstaller...
    pip install pyinstaller
)

:: Clean previous build
if exist "dist" rmdir /s /q dist
if exist "build" rmdir /s /q build
if exist "PLOROPSIS.spec" del PLOROPSIS.spec

:: Build
pyinstaller --noconsole --name "PLOROPSIS" ^
    --add-data "test folder/frontend;test folder/frontend" ^
    --add-data "test folder/frontend/assets/icons;test folder/frontend/assets/icons" ^
    --add-data "config.json;." ^
    --hidden-import=pymysql ^
    --hidden-import=uvicorn.logging ^
    --hidden-import=uvicorn.loops ^
    --hidden-import=uvicorn.loops.auto ^
    --hidden-import=uvicorn.protocols ^
    --hidden-import=uvicorn.protocols.http.auto ^
    --hidden-import=uvicorn.protocols.websockets.auto ^
    --hidden-import=uvicorn.lifespan ^
    --hidden-import=uvicorn.lifespan.on ^
    --hidden-import=backend.router ^
    --hidden-import=backend03.router ^
    --hidden-import=drift_mapping.router ^
    app.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed.
    pause
    exit /b 1
)

:: Copy config.json next to the exe
copy config.json dist\PLOROPSIS\ >nul 2>&1

echo.
echo ========================================
echo  Build successful!
echo  Output: dist\PLOROPSIS\PLOROPSIS.exe
echo ========================================
pause
