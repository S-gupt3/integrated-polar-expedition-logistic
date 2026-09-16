# backend/router.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pymysql
from pymysql.cursors import DictCursor
from datetime import date
import os
import json

router = APIRouter()

# Load config from root config.json
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

@router.get("/stations")
def get_stations():
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM stations;")
        result = cursor.fetchall()
    connection.close()
    return result

# Stations
@router.get("/stations/{station_id}")
def get_single_station(station_id: str):
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM stations WHERE station_id = %s;", (station_id,))
        result = cursor.fetchone()
    connection.close()
    if not result:
        raise HTTPException(status_code=404, detail=f"Station with ID {station_id} not found.")
    return result

# Assets
class AssetCreate(BaseModel):
    asset_id: str
    name: str
    category: str
    station_id: str
    status: str = "Operational"
    last_inspection_date: str = None
    next_maintenance_date: str = None
    latitude: float = None
    longitude: float = None

@router.get("/assets")
def get_assets():
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM assets;")
        result = cursor.fetchall()
    connection.close()
    return result

@router.get("/assets/{asset_id}")
def get_single_asset(asset_id: str):
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM assets WHERE asset_id = %s;", (asset_id,))
        result = cursor.fetchone()
    connection.close()
    if not result:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found.")
    return result

@router.post("/inventory/{inventory_id}/add-stock")
def add_stock(inventory_id: str, update: StockUpdate):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT current_quantity, min_threshold FROM inventory WHERE inventory_id = %s;", (inventory_id,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail=f"Inventory item {inventory_id} not found.")
            
            new_qty = float(row["current_quantity"]) + update.quantity_delta
            
            # PREVENT NEGATIVE STOCK
            if new_qty < 0:
                raise HTTPException(status_code=400, detail="Reduction amount exceeds current stock. Quantity cannot be negative.")
                
            min_threshold = float(row["min_threshold"])
            new_status = "Critical" if new_qty < min_threshold * 1.2 else (
                "Low" if new_qty < min_threshold * 2.5 else "Normal")
            
            cursor.execute(
                "UPDATE inventory SET current_quantity = %s, status = %s, last_updated = %s WHERE inventory_id = %s;",
                (new_qty, new_status, date.today().isoformat(), inventory_id)
            )
            connection.commit()
            return {"status": "success", "inventory_id": inventory_id, "new_quantity": new_qty, "new_status": new_status}
    except HTTPException:
        raise
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update stock: {str(e)}")
    finally:
        connection.close()

@router.delete("/assets/{asset_id}")
def delete_asset(asset_id: str):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM assets WHERE asset_id = %s;", (asset_id,))
        connection.commit()
        return {"status": "success", "deleted": asset_id}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to delete asset: {str(e)}")
    finally:
        connection.close()

# Inventory
class StockUpdate(BaseModel):
    quantity_delta: float

@router.get("/inventory")
def get_inventory():
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM inventory;")
        result = cursor.fetchall()
    connection.close()
    return result

@router.get("/inventory/low-stock")
def get_low_stock():
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM inventory WHERE status IN ('Low', 'Critical');")
        result = cursor.fetchall()
    connection.close()
    return result

@router.post("/inventory/{inventory_id}/add-stock")
def add_stock(inventory_id: str, update: StockUpdate):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT current_quantity, min_threshold FROM inventory WHERE inventory_id = %s;",
                            (inventory_id,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail=f"Inventory item {inventory_id} not found.")

            new_qty = float(row["current_quantity"]) + update.quantity_delta
            min_threshold = float(row["min_threshold"])
            new_status = "Critical" if new_qty < min_threshold * 1.2 else (
                "Low" if new_qty < min_threshold * 2.5 else "Normal")

            cursor.execute(
                "UPDATE inventory SET current_quantity = %s, status = %s, last_updated = %s WHERE inventory_id = %s;",
                (new_qty, new_status, date.today().isoformat(), inventory_id)
            )
        connection.commit()
        return {"status": "success", "inventory_id": inventory_id, "new_quantity": new_qty, "new_status": new_status}
    except HTTPException:
        raise
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update stock: {str(e)}")
    finally:
        connection.close()

@router.delete("/inventory/{inventory_id}")
def delete_inventory_item(inventory_id: str):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM inventory WHERE inventory_id = %s;", (inventory_id,))
        connection.commit()
        return {"status": "success", "deleted": inventory_id}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to delete inventory item: {str(e)}")
    finally:
        connection.close()

# Consumption Logs
class ConsumptionLogCreate(BaseModel):
    log_id: str
    station_id: str
    item_name: str
    log_date: str
    quantity_used: float
    unit: str
    active_headcount: int = None
    temperature_c: float = None

@router.get("/consumption-logs")
def get_consumption_logs():
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM consumption_logs ORDER BY log_date DESC LIMIT 500;")
        result = cursor.fetchall()
    connection.close()
    return result

@router.post("/consumption-logs")
def create_consumption_log(log: ConsumptionLogCreate):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """INSERT INTO consumption_logs
                     (log_id, station_id, item_name, log_date, quantity_used, unit, active_headcount, temperature_c)
                     VALUES (%s,%s,%s,%s,%s,%s,%s,%s)"""
            cursor.execute(sql, (log.log_id, log.station_id, log.item_name, log.log_date,
                                  log.quantity_used, log.unit, log.active_headcount, log.temperature_c))
        connection.commit()
        return {"status": "success", "message": "Log entry recorded successfully."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to record data: {str(e)}")
    finally:
        connection.close()
