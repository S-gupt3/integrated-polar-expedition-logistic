# backend03/router.py
from fastapi import APIRouter, HTTPException
from collections import defaultdict
from datetime import datetime, timezone
import pymysql
from pymysql.cursors import DictCursor
import os
import json

router = APIRouter()

def get_config():
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config.json")
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            return json.load(f)
    return {
        "db_host": "localhost",
        "db_port": 3306,
        "db_user": "python_user",
        "db_password": "1729",
        "db_name": "polar_db"
    }

def get_db_connection():
    config = get_config()
    try:
        return pymysql.connect(
            host=config["db_host"],
            port=config["db_port"],
            user=config["db_user"],
            password=config["db_password"],
            database=config["db_name"],
            cursorclass=DictCursor
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

STATION_NAMES = {"MTR": "Maitri", "BHR": "Bharati", "HDR": "Himadri"}
TRAILING_WINDOW_DAYS = 14

CATEGORY_ROLES = {
    "Fuel": ["Station Engineer", "Generator Technician"],
    "Medical": ["Station Medical Officer", "Paramedic"],
    "Food": ["Mess / Stores Officer"],
    "Water": ["Utilities Technician"],
    "Power": ["Power Systems Technician"],
}

@router.get("/inventory-doa")
def get_inventory_with_doa():
    """Fetches inventory and computes Days of Autonomy (DoA)"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM inventory")
            inventory = cursor.fetchall()
            cursor.execute("""
                SELECT station_id, item_name, quantity_used, log_date
                FROM consumption_logs ORDER BY log_date DESC
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
            "inventory_id": item.get('inventory_id'),
            "name": item.get('item_name'),
            "category": item.get('category'),
            "station_id": item.get('station_id'),
            "station": STATION_NAMES.get(item.get('station_id'), item.get('station_id')),
            "unit": item.get('unit'),
            "current_quantity": current_qty,
            "min_threshold": min_thresh,
            "daily_rate": round(daily_rate, 3),
            "days_remaining": round(days_remaining, 1),
            "status": status,
            "last_updated": str(item.get('last_updated')),
            "roles": CATEGORY_ROLES.get(item.get('category'), ["Duty Officer"]),
        })
    return result

@router.get("/assets-registry")
def get_assets_registry():
    """Fetches all tracked assets with maintenance info"""
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
