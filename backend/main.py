from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pymysql
from pymysql.cursors import DictCursor

app = FastAPI(
    title="Integrated Polar Expedition Logistics API",
    description="Backend services for asset management, consumption logs, inventory tracking, and stations.",
    version="1.0.0"
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

@app.get("/api/stations")
def get_stations():
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM stations;")
        result = cursor.fetchall()
    connection.close()
    return result

@app.get("/api/assets")
def get_assets():
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM assets;")
        result = cursor.fetchall()
    connection.close()
    return result

@app.get("/api/inventory")
def get_inventory():
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM inventory;")
        result = cursor.fetchall()
    connection.close()
    return result

@app.get("/api/consumption-logs")
def get_consumption_logs():
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM consumption_logs;")
        result = cursor.fetchall()
    connection.close()
    return result

@app.get("/api/stations/{station_id}")
def get_single_station(station_id: int):
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM stations WHERE id = %s;", (station_id,))
        result = cursor.fetchone()
    connection.close()

    if not result:
        raise HTTPException(status_code=404, detail=f"Station with ID {station_id} not found.")
    return result

@app.get("/api/inventory/low-stock")
def get_low_stock(threshold: int = 10):
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM inventory WHERE quantity < %s;", (threshold,))
        result = cursor.fetchall()
    connection.close()
    return result

@app.post("/api/consumption-logs")
def create_consumption_log(station_id: int, asset_id: int, quantity_used: float, log_date: str):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """
            INSERT INTO consumption_logs (station_id, asset_id, quantity_used, log_date)
            VALUES (%s, %s, %s, %s);
            """
            cursor.execute(sql, (station_id, asset_id, quantity_used, log_date))
        connection.commit()
        return {"status": "success", "message": "Log entry recorded successfully."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to record data: {str(e)}")
    finally:
        connection.close()

from fastapi.responses import HTMLResponse

@app.get("/dashboard", response_class=HTMLResponse)
def read_dashboard():
    with open("templates/index.html") as f:
        return f.read()
