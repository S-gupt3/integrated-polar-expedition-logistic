"""
DoA (Days of Autonomy) backend for the Polar Expedition Command Center —
driven entirely by the team's real Data/ CSV files (inventory.csv,
consumption_logs.csv, assets.csv). Nothing here is invented: quantities,
thresholds, categories, station IDs and asset details are read straight
from those files. The only computed value is `daily_rate`, which is the
average of each item's most recent 14 days of real consumption logs —
that's the actual "DoA engine" logic (ingest consumption, output a live
days-remaining figure), just running on the team's real numbers instead
of mock data.

Run:
    pip install flask
    python app.py
Then open http://localhost:5000
"""

import csv
import os
from collections import defaultdict
from datetime import datetime, timezone
import time

from flask import Flask, jsonify, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
STATIC_DIR = os.path.join(BASE_DIR, "static")

app = Flask(
    __name__,
    static_folder=STATIC_DIR if os.path.isdir(STATIC_DIR) else BASE_DIR,
    static_url_path="",
)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    return response


STATION_NAMES = {"MTR": "Maitri", "BHR": "Bharati", "HDR": "Himadri"}
TRAILING_WINDOW_DAYS = 14  # how many recent log entries to average for daily_rate

# Role titles by category — the CSVs don't include a personnel roster, so
# these are generic responsibility labels, not real names.
CATEGORY_ROLES = {
    "Fuel": ["Station Engineer", "Generator Technician"],
    "Medical": ["Station Medical Officer", "Paramedic"],
    "Food": ["Mess / Stores Officer"],
    "Water": ["Utilities Technician"],
    "Power": ["Power Systems Technician"],
}


def load_csv(filename):
    path = os.path.join(DATA_DIR, filename)
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


# ---------------------------------------------------------------------------
# Load raw data once at startup
# ---------------------------------------------------------------------------
RAW_INVENTORY = load_csv("inventory.csv")
RAW_LOGS = load_csv("consumption_logs.csv")
RAW_ASSETS = load_csv("assets.csv")


def compute_daily_rates():
    """For each (station_id, item_name), average the most recent
    TRAILING_WINDOW_DAYS log entries' quantity_used. This is the item's
    daily_rate used for the live countdown."""
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

# ---------------------------------------------------------------------------
# Build the live inventory state (mutable — ages forward on each poll)
# ---------------------------------------------------------------------------
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


def compute_status(current_quantity, min_threshold):
    if current_quantity <= min_threshold:
        return "critical"
    if current_quantity <= min_threshold * 2:
        return "warning"
    return "good"


def with_computed_fields(item):
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
            0, item["current_quantity"] - item["daily_rate"] * elapsed_days
        )


@app.route("/api/inventory")
def get_inventory():
    age_stock_forward()
    return jsonify([with_computed_fields(i) for i in INVENTORY])


@app.route("/api/assets")
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
    return jsonify(assets)


@app.route("/api/health")
def health():
    return jsonify({"ok": True, "ts": datetime.now(timezone.utc).isoformat()})


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    app.run(debug=False, port=5000)
