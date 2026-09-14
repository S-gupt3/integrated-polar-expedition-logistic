"""
PLOROPSIS — CSV -> MySQL Importer

Loads Data/stations.csv, assets.csv, inventory.csv, consumption_logs.csv
into the polar_db tables created by schema.sql. Run schema.sql first.

Usage:
    pip install pymysql
    python3 import_csv_to_mysql.py
"""

import csv
import pymysql

DB_CONFIG = {
    "host": "localhost",
    "user": "python_user",
    "password": "1729",
    "database": "polar_db",
    "port": 3306,
}

# Path to the Data folder relative to this script — adjust if you run it
# from somewhere else.
DATA_DIR = "../Data"


def load_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def import_stations(cursor):
    rows = load_csv(f"{DATA_DIR}/stations.csv")
    sql = """INSERT INTO stations (station_id, name, region, latitude, longitude,
              base_headcount_summer, base_headcount_winter)
              VALUES (%s,%s,%s,%s,%s,%s,%s)
              ON DUPLICATE KEY UPDATE name=VALUES(name)"""
    for r in rows:
        cursor.execute(sql, (r["station_id"], r["name"], r["region"], r["latitude"],
                              r["longitude"], r["base_headcount_summer"], r["base_headcount_winter"]))
    print(f"stations: {len(rows)} rows")


def import_assets(cursor):
    rows = load_csv(f"{DATA_DIR}/assets.csv")
    sql = """INSERT INTO assets (asset_id, name, category, station_id, status,
              last_inspection_date, next_maintenance_date, latitude, longitude)
              VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
              ON DUPLICATE KEY UPDATE status=VALUES(status)"""
    for r in rows:
        cursor.execute(sql, (r["asset_id"], r["name"], r["category"], r["station_id"], r["status"],
                              r["last_inspection_date"], r["next_maintenance_date"],
                              r["latitude"], r["longitude"]))
    print(f"assets: {len(rows)} rows")


def import_inventory(cursor):
    rows = load_csv(f"{DATA_DIR}/inventory.csv")
    sql = """INSERT INTO inventory (inventory_id, item_name, category, station_id, unit,
              current_quantity, min_threshold, status, last_updated)
              VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
              ON DUPLICATE KEY UPDATE current_quantity=VALUES(current_quantity)"""
    for r in rows:
        cursor.execute(sql, (r["inventory_id"], r["item_name"], r["category"], r["station_id"],
                              r["unit"], r["current_quantity"], r["min_threshold"],
                              r["status"], r["last_updated"]))
    print(f"inventory: {len(rows)} rows")


def import_consumption_logs(cursor):
    rows = load_csv(f"{DATA_DIR}/consumption_logs.csv")
    sql = """INSERT INTO consumption_logs (log_id, station_id, item_name, log_date,
              quantity_used, unit, active_headcount, temperature_c)
              VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
              ON DUPLICATE KEY UPDATE quantity_used=VALUES(quantity_used)"""
    for r in rows:
        cursor.execute(sql, (r["log_id"], r["station_id"], r["item_name"], r["date"],
                              r["quantity_used"], r["unit"], r["active_headcount"], r["temperature_c"]))
    print(f"consumption_logs: {len(rows)} rows")


def main():
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            import_stations(cursor)
            import_assets(cursor)
            import_inventory(cursor)
            import_consumption_logs(cursor)
        conn.commit()
        print("\nImport complete.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
