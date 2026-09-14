"""
DoA (Days of Autonomy) backend for the Polar Expedition Command Center.
Migrated from CSV to MySQL for production readiness.
Computes live DoA projections based on the last 14 days of consumption logs.

Run:
    pip install -r requirements.txt
    uvicorn app:app --reload --port 5000
Then open http://localhost:5000
"""

import os
from collections import defaultdict
from datetime import datetime, timezone
from typing import List, Dict, Any

import pymysql
from pymysql.cursors import DictCursor
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

DB_CONFIG = {
    "host": "localhost",
    "user": "python_user",
    "password": "1729",
    "database": "polar_db",
    "port": 3306,
    "cursorclass": DictCursor
}

def get_db_connection():
    try:
        return pymysql.connect(**DB_CONFIG)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

app = FastAPI(
    title="Polar Expedition Command Center - DoA & Asset Module",
    description="Backend services for Days of Autonomy (DoA) calculation and asset registry (MySQL backed).",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
STATION_NAMES = {"MTR": "Maitri", "BHR": "Bharati", "HDR": "Himadri"}
TRAILING_WINDOW_DAYS = 14

CATEGORY_ROLES = {
    "Fuel": ["Station Engineer", "Generator Technician"],
    "Medical": ["Station Medical Officer", "Paramedic"],
    "Food": ["Mess / Stores Officer"],
    "Water": ["Utilities Technician"],
    "Power": ["Power Systems Technician"],
}

@app.get("/api/inventory")
def get_inventory_with_doa():
    """Fetches inventory and computes Days of Autonomy (DoA) based on 
    the average consumption of the last 14 logged days per item/station."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            
            cursor.execute("SELECT * FROM inventory")
            inventory = cursor.fetchall()
            
            cursor.execute("""
                SELECT station_id, item_name, quantity_used, log_date 
                FROM consumption_logs 
                ORDER BY log_date DESC
            """)
            logs = cursor.fetchall()
    finally:
        conn.close()

    logs_by_key = defaultdict(list)
    for log in logs:
        logs_by_key[(log['station_id'], log['item_name'])].append(float(log['quantity_used']))
        
    daily_rates = {}
    for key, quantities in logs_by_key.items():
        recent_14 = quantities[:TRAILING_WINDOW_DAYS]
        daily_rates[key] = sum(recent_14) / len(recent_14) if recent_14 else 0.0

    result = []
    for item in inventory:
        key = (item['station_id'], item['item_name'])
        daily_rate = daily_rates.get(key, 0.0)
        current_qty = float(item['current_quantity'])
        min_thresh = float(item['min_threshold'])

        rate = daily_rate if daily_rate > 0 else 0.0001
        days_remaining = current_qty / rate
        
        if current_qty <= min_thresh:
            status = "critical"
        elif current_qty <= min_thresh * 2:
            status = "warning"
        else:
            status = "good"
            
        result.append({
            "id": item.get('inventory_id'),
            "inventory_id": item.get('inventory_id'),
            "name": item.get('item_name'),
            "item_name": item.get('item_name'),
            "category": item.get('category'),
            "station_id": item.get('station_id'),
            "station": STATION_NAMES.get(item.get('station_id'), item.get('station_id')),
            "unit": item.get('unit'),
            "current_quantity": current_qty,
            "min_threshold": min_thresh,
            "daily_rate": round(daily_rate, 3),
            "days_remaining": round(days_remaining, 1),
            "status": status,
            "last_updated": item.get('last_updated'),
            "roles": CATEGORY_ROLES.get(item.get('category'), ["Duty Officer"]),
        })
        
    return result

@app.get("/api/assets")
def get_assets():
    """Fetches all tracked assets with their current status and maintenance info."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM assets")
            raw_assets = cursor.fetchall()
    finally:
        conn.close()

    assets = []
    for row in raw_assets:
        assets.append({
            "id": row.get('asset_id'),
            "asset_id": row.get('asset_id'),
            "name": row.get('name'),
            "category": row.get('category'),
            "station_id": row.get('station_id'),
            "station": STATION_NAMES.get(row.get('station_id'), row.get('station_id')),
            "status": row.get('status'),
            "last_inspection_date": str(row.get('last_inspection_date')),
            "next_maintenance_date": str(row.get('next_maintenance_date')),
            "latitude": float(row.get('latitude')) if row.get('latitude') else None,
            "longitude": float(row.get('longitude')) if row.get('longitude') else None,
            "needs_attention": row.get('status') != "Operational",
        })
    return assets

@app.get("/api/health")
def health():
    return {"ok": True, "ts": datetime.now(timezone.utc).isoformat(), "database": "connected"}

@app.get("/", response_class=HTMLResponse)
def index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read()
    return HTMLResponse(
        content="<h1>Dashboard frontend (index.html) not found in static/ directory</h1>", 
        status_code=404
    )
