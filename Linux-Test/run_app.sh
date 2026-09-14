#!/bin/bash
echo "Starting PLOROPSIS (DEV MODE)..."

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1

[ ! -f config.json ] && echo '{"db_host":"localhost","db_port":3306,"db_user":"python_user","db_password":"1729","db_name":"polar_db","server_port":5000,"auto_open_browser":true}' > config.json

python app.py
