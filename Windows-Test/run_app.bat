@echo off
echo Starting PLOROPSIS (DEV MODE)...

if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat
pip install -r requirements.txt >nul 2>&1

:: Create default config if missing
if not exist "config.json" (
    echo {"db_host":"localhost","db_port":3306,"db_user":"python_user","db_password":"1729","db_name":"polar_db","server_port":5000,"auto_open_browser":true} > config.json
)

python app.py
pause
