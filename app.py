"""
PLOROPSIS — Polar Logistics & Operations System for Polar Integrated Support
Unified Application: backend + backend03 + drift mapping
Serves: test folder/frontend/ as the main UI
"""

import os
import sys
import json
import time
import webbrowser
import threading
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
import uvicorn

# Import routers from modules
from backend.router import router as backend_router
from backend03.router import router as doa_router
from drift_mapping.router import router as drift_router

# Path helpers (PyInstaller compatible)
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

# Load config.json
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

# Database connection check
def check_db_on_startup():
    import pymysql
    from pymysql.cursors import DictCursor
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

# FastAPI app
app = FastAPI(
    title="PLOROPSIS — Polar Logistics & Operations System",
    description="Unified command center for polar expedition logistics, asset management, and ice drift prediction.",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers under /api prefix
app.include_router(backend_router, prefix="/api")
app.include_router(doa_router, prefix="/api")
app.include_router(drift_router, prefix="/api")

@app.get("/api/health")
def health():
    return {
        "ok": True,
        "system": "PLOROPSIS",
        "ts": datetime.now(timezone.utc).isoformat(),
        "modules": ["backend", "backend03", "drift_mapping"]
    }
    
# frontend from test folder/frontend/
FRONTEND_DIR = os.path.join(BUNDLE_DIR, "test folder", "frontend")

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    """Serves the favicon.ico from the frontend directory."""
    favicon_path = os.path.join(FRONTEND_DIR, "favicon.ico")
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path, media_type="image/x-icon")
    
    # Fallback to PNG if .ico is missing
    png_path = os.path.join(FRONTEND_DIR, "assets", "icons", "favicon-32x32.png")
    if os.path.exists(png_path):
        return FileResponse(png_path, media_type="image/png")
        
    raise HTTPException(status_code=404, detail="Favicon not found")

@app.get("/", response_class=HTMLResponse)
def index():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read()
    return HTMLResponse(
        content="<h1>PLOROPSIS Frontend not found. Ensure 'test folder/frontend/index.html' exists.</h1>",
        status_code=404
    )

# Serve other HTML pages
@app.get("/{page_name}.html", response_class=HTMLResponse)
def serve_page(page_name: str):
    page_path = os.path.join(FRONTEND_DIR, f"{page_name}.html")
    if os.path.exists(page_path):
        with open(page_path, "r", encoding="utf-8") as f:
            return f.read()
    return HTMLResponse(content=f"<h1>Page {page_name}.html not found</h1>", status_code=404)

# Mount static files (css, js, images, icons)
if os.path.isdir(FRONTEND_DIR):
    app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")
   
    assets_dir = os.path.join(FRONTEND_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

# Startup
def open_browser_delayed():
    time.sleep(1.5)
    webbrowser.open(f"http://localhost:{CONFIG['server_port']}")

if __name__ == "__main__":
    print("=" * 70)
    print("  PLOROPSIS — Polar Logistics & Operations System")
    print("  Polar Expedition Command Center v3.0.0")
    print("=" * 70)

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
