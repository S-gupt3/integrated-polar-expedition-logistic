"""
DoA (Days of Autonomy) backend for the Polar Expedition Command Center —
driven entirely by the team's real Data/ CSV files (inventory.csv,
consumption_logs.csv, assets.csv). 

Rewritten from Flask to FastAPI to match the main backend architecture.

Run:
    pip install fastapi uvicorn
    uvicorn app:app --reload --port 5000
Then open http://localhost:5000
"""

import csv
import os
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import List, Dict, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
STATIC_DIR = os.path.join(BASE_DIR, "static")

app = FastAPI(
    title="Polar Expedition Command Center - DoA & Asset Module",
    description="Backend services for Days of Autonomy (DoA) calculation and asset registry.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATION_NAMES = {"MTR": "Maitri", "BHR": "Bharati", "HDR": "Himadri"}
TRAILING_WINDOW_DAYS = 14

CATEGORY_ROLES = {
    "Fuel": ["Station Engineer", "Generator Technician"],
    "Medical": ["Station Medical Officer", "Paramedic"],
    "Food": ["Mess / Stores Officer"],
    "Water": ["Utilities Technician"],
    "Power": ["Power Systems Technician"],
}

def load_csv(filename: str) -> List[Dict[str, str]]:
    path = os.path.join(DATA_DIR, filename)
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

RAW_INVENTORY = load_csv("inventory.csv")
RAW_LOGS = load_csv("consumption_logs.csv")
RAW_ASSETS = load_csv("assets.csv")

def compute_daily_rates() -> Dict[tuple, float]:
    """For each (station_id, item_name), average the most recent
    TRAILING_WINDOW_DAYS log entries' quantity_used."""
    by_key = defaultdict(list)
    for row in RAW_LOGS:
        key = (row["station_id"], row["item_name"])
        by_key[key].append(row)

    rates = {}
    for key, rows in by_key.items():
        rows.sort(key=lambda r: r["date"])
        recent = rows[-TRAILING_WINDOW_DAYS:]
        total = sum(float(r["quantity_used"]) for r in recent)
        rates[key] = total / len(recent) if recent else 0.0
    return rates

DAILY_RATES = compute_daily_rates()

INVENTORY = []
for row in RAW_INVENTORY:
    key = (row["station_id"], row["item_name"])
    INVENTORY.append({
        "id": row["inventory_id"],
        "name": row["item_name"],
        "category": row["category"],
        "station_id": row["station_id"],
        "station": STATION_NAMES.get(row["station_id"], row["station_id"]),
        "unit": row["unit"],
        "current_quantity": float(row["current_quantity"]),
        "min_threshold": float(row["min_threshold"]),
        "daily_rate": round(DAILY_RATES.get(key, 0.0), 3),
        "last_updated_source": row["last_updated"],
        "roles": CATEGORY_ROLES.get(row["category"], ["Duty Officer"]),
    })

_last_tick = time.time()

def compute_status(current_quantity: float, min_threshold: float) -> str:
    if current_quantity <= min_threshold:
        return "critical"
    if current_quantity <= min_threshold * 2:
        return "warning"
    return "good"

def with_computed_fields(item: Dict[str, Any]) -> Dict[str, Any]:
    daily_rate = item["daily_rate"] or 0.0001
    days_remaining = item["current_quantity"] / daily_rate
    status = compute_status(item["current_quantity"], item["min_threshold"])
    return {**item, "days_remaining": round(days_remaining, 1), "status": status}

def age_stock_forward():
    """Ages every item's current_quantity down using its real computed
    daily_rate, scaled to however much time has actually passed since the
    last poll — so the dashboard shows a genuine live countdown."""
    global _last_tick
    now = time.time()
    elapsed_days = (now - _last_tick) / 86400
    _last_tick = now
    for item in INVENTORY:
        item["current_quantity"] = max(
            0.0, item["current_quantity"] - item["daily_rate"] * elapsed_days
        )

@app.get("/api/inventory")
def get_inventory():
    age_stock_forward()
    return [with_computed_fields(i) for i in INVENTORY]

@app.get("/api/assets")
def get_assets():
    """Assets don't get consumed, so there's no countdown here — just the
    real status/maintenance data from assets.csv, as-is."""
    assets = []
    for row in RAW_ASSETS:
        assets.append({
            "id": row["asset_id"],
            "name": row["name"],
            "category": row["category"],
            "station_id": row["station_id"],
            "station": STATION_NAMES.get(row["station_id"], row["station_id"]),
            "status": row["status"],
            "last_inspection_date": row["last_inspection_date"],
            "next_maintenance_date": row["next_maintenance_date"],
            "latitude": float(row["latitude"]),
            "longitude": float(row["longitude"]),
            "needs_attention": row["status"] != "Operational",
        })
    return assets

@app.get("/api/health")
def health():
    return {"ok": True, "ts": datetime.now(timezone.utc).isoformat()}

@app.get("/", response_class=HTMLResponse)
def index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read()
    return HTMLResponse(content="<h1>Dashboard frontend (index.html) not found in static/ directory</h1>", status_code=404)
