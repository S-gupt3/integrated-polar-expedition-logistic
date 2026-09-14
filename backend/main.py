from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import pymysql
from pymysql.cursors import DictCursor
from datetime import date

app = FastAPI(
    title="Integrated Polar Expedition Logistics API",
    description="Backend services for asset management, consumption logs, inventory tracking, and stations.",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.get("/")
def root():
    return {"status": "online", "system": "Polar Expedition Logistics Subsystem"}


# ---------------------------------------------------------------------------
# STATIONS
# ---------------------------------------------------------------------------
@app.get("/api/stations")
def get_stations():
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM stations;")
        result = cursor.fetchall()
    connection.close()
    return result


@app.get("/api/stations/{station_id}")
def get_single_station(station_id: str):
    # NOTE: station_id is a VARCHAR code (MTR/BHR/HDR), not an int —
    # the original version of this endpoint assumed int and would have
    # never matched anything in the real CSV/DB data.
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM stations WHERE station_id = %s;", (station_id,))
        result = cursor.fetchone()
    connection.close()

    if not result:
        raise HTTPException(status_code=404, detail=f"Station with ID {station_id} not found.")
    return result


# ---------------------------------------------------------------------------
# ASSETS
# ---------------------------------------------------------------------------
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


@app.get("/api/assets")
def get_assets():
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM assets;")
        result = cursor.fetchall()
    connection.close()
    return result


@app.get("/api/assets/{asset_id}")
def get_single_asset(asset_id: str):
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM assets WHERE asset_id = %s;", (asset_id,))
        result = cursor.fetchone()
    connection.close()
    if not result:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found.")
    return result


@app.post("/api/assets")
def create_asset(asset: AssetCreate):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """INSERT INTO assets (asset_id, name, category, station_id, status,
                      last_inspection_date, next_maintenance_date, latitude, longitude)
                      VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)"""
            cursor.execute(sql, (asset.asset_id, asset.name, asset.category, asset.station_id,
                                  asset.status, asset.last_inspection_date, asset.next_maintenance_date,
                                  asset.latitude, asset.longitude))
        connection.commit()
        return {"status": "success", "asset_id": asset.asset_id}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create asset: {str(e)}")
    finally:
        connection.close()


@app.delete("/api/assets/{asset_id}")
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


# ---------------------------------------------------------------------------
# INVENTORY
# ---------------------------------------------------------------------------
class StockUpdate(BaseModel):
    quantity_delta: float  # positive to add stock, negative to remove


@app.get("/api/inventory")
def get_inventory():
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM inventory;")
        result = cursor.fetchall()
    connection.close()
    return result


@app.get("/api/inventory/low-stock")
def get_low_stock():
    # Fixed: original queried a non-existent `quantity` column and took a
    # raw numeric threshold. Real logic: use each item's own min_threshold,
    # and the status column already computed at import time.
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM inventory WHERE status IN ('Low', 'Critical');")
        result = cursor.fetchall()
    connection.close()
    return result


@app.post("/api/inventory/{inventory_id}/add-stock")
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


@app.delete("/api/inventory/{inventory_id}")
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


# ---------------------------------------------------------------------------
# CONSUMPTION LOGS
# ---------------------------------------------------------------------------
class ConsumptionLogCreate(BaseModel):
    log_id: str
    station_id: str
    item_name: str
    log_date: str
    quantity_used: float
    unit: str
    active_headcount: int = None
    temperature_c: float = None


@app.get("/api/consumption-logs")
def get_consumption_logs():
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM consumption_logs ORDER BY log_date DESC LIMIT 500;")
        result = cursor.fetchall()
    connection.close()
    return result


@app.post("/api/consumption-logs")
def create_consumption_log(log: ConsumptionLogCreate):
    # Fixed: original signature (station_id:int, asset_id:int, ...) didn't
    # match the actual consumption_logs schema at all — there's no asset_id
    # column; logs are keyed by item_name, matching Data/consumption_logs.csv.
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


@app.get("/dashboard", response_class=HTMLResponse)
def read_dashboard():
    with open("templates/index.html") as f:
        return f.read()
