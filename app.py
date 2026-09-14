"""
Polar Expedition Command Center — Unified Application
Combines: backend/ + backend03/ + drift mapping/
Serves: test folder/ as the frontend
"""

import os
import sys
import json
import time
import webbrowser
import threading
from datetime import datetime, timezone

import pymysql
from pymysql.cursors import DictCursor
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
import uvicorn

def get_base_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

def get_bundle_dir():
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

BASE_DIR = get_base_dir()
BUNDLE_DIR = get_bundle_dir()

CONFIG_PATH = os.path.join(BASE_DIR, "config.json")
DEFAULT_CONFIG = {
    "db_host": "localhost",
    "db_port": 3306,
    "db_user": "python_user",
    "db_password": "1729",
    "db_name": "polar_db",
    "server_port": 5000,
    "auto_open_browser": True
}

def load_config():
    if not os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_CONFIG, f, indent=2)
        return DEFAULT_CONFIG
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

CONFIG = load_config()

# Database connection
def get_db_connection():
    try:
        return pymysql.connect(
            host=CONFIG["db_host"],
            port=CONFIG["db_port"],
            user=CONFIG["db_user"],
            password=CONFIG["db_password"],
            database=CONFIG["db_name"],
            cursorclass=DictCursor
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

def check_db_on_startup():
    try:
        conn = pymysql.connect(
            host=CONFIG["db_host"],
            port=CONFIG["db_port"],
            user=CONFIG["db_user"],
            password=CONFIG["db_password"],
            database=CONFIG["db_name"],
            cursorclass=DictCursor
        )
        conn.close()
        print(f"[OK] Connected to MySQL at {CONFIG['db_host']}:{CONFIG['db_port']}")
        return True
    except Exception as e:
        print(f"[ERROR] Cannot connect to MySQL: {e}")
        print(f"        Config file: {CONFIG_PATH}")
        return False

app = FastAPI(
    title="Polar Expedition Command Center",
    description="Unified backend for logistics, DoA, and drift mapping.",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# We'll add these as we integrate each module
# from backend.main import router as backend_router
# from backend03.app import router as doa_router
# from drift_mapping.engine import router as drift_router

# app.include_router(backend_router, prefix="/api")
# app.include_router(doa_router, prefix="/api")
# app.include_router(drift_router, prefix="/api")

@app.get("/api/health")
def health():
    return {"ok": True, "ts": datetime.now(timezone.utc).isoformat(), "modules": ["backend", "backend03", "drift_mapping"]}

# Front-end
FRONTEND_DIR = os.path.join(BUNDLE_DIR, "test folder")

@app.get("/", response_class=HTMLResponse)
def index():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read()
    return HTMLResponse(content="<h1>Frontend not found. Ensure 'test folder/index.html' exists.</h1>", status_code=404)

# Mount static files (css, js, images) from test folder/
if os.path.isdir(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

# Startup
def open_browser_delayed():
    time.sleep(1.5)
    webbrowser.open(f"http://localhost:{CONFIG['server_port']}")

if __name__ == "__main__":
    print("=" * 60)
    print("  Polar Expedition Command Center — Unified App")
    print("=" * 60)

    if not check_db_on_startup():
        input("\nPress Enter to exit...")
        sys.exit(1)

    if CONFIG.get("auto_open_browser", True):
        threading.Thread(target=open_browser_delayed, daemon=True).start()

    print(f"\n  Frontend:   http://localhost:{CONFIG['server_port']}")
    print(f"  API docs:   http://localhost:{CONFIG['server_port']}/docs")
    print(f"  Config:     {CONFIG_PATH}")
    print("\n  Press Ctrl+C to stop.\n")

    uvicorn.run(app, host="127.0.0.1", port=CONFIG["server_port"], log_level="warning")
