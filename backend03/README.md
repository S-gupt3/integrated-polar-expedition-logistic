# Polar Expedition Command Center — DoA & Asset Module (MySQL)

A live "Days of Autonomy" dashboard and asset registry for India's polar research stations — **Maitri**, **Bharati**, and **Himadri**. Built as part of the **PLOROPSIS** command-center project for the ISEA-46 operation.

---

## What it does

- **Live DoA countdown per resource** — Computes `days_remaining` dynamically by dividing current MySQL inventory stock by the average daily consumption over the last 14 logged days.
- **Color-coded status** — Green / Amber / Red, driven directly by each item's `min_threshold` in the database.
- **Asset Registry** — Fetches all tracked station assets with status, last inspection, next maintenance date, and coordinates.
- **Production-Ready** — Migrated from local CSV files to a centralized MySQL database, ensuring data persistence and concurrent access.

---

## Tech stack

- **Backend:** Python (FastAPI) + PyMySQL
- **Database:** MySQL 8.0+ (Database: `polar_db`)
- **Frontend:** Plain HTML/CSS/JS (served statically)

---

## Project structure

```
backend03/
├── app.py # FastAPI backend + DoA calculation engine
├── data/ # (Legacy CSV folder, kept for reference or initial import)
├── static/
│ └── index.html # Dashboard frontend
└── requirements.txt
```

---

## Prerequisites & Setup

1. Ensure your MySQL server is running and the `polar_db` database is created.
2. Populate the database tables (`inventory`, `consumption_logs`, `assets`, `stations`). 
   *(You can reuse the `import_csv_to_mysql.py` script located in the main `backend/` folder to migrate the legacy CSV data into MySQL).*
3. Install dependencies:
   ```bash
   pip install -r requirements.txt

---

## Running it locally

```bash
pip install -r requirements.txt
uvicorn app:app --reload --port 5000
```

Then open **http://localhost:5000** in a browser.

The dashboard polls the backend every 3 seconds, so figures update live without a page refresh.

---

## API endpoints

| Endpoint          | Returns                                                        |
|--------------------|-----------------------------------------------------------------|
| `GET /api/inventory` | All 24 resource items with live `days_remaining` and `status` |
| `GET /api/assets`    | All 66 tracked assets with status and maintenance info        |
| `GET /api/health`    | Simple liveness check                                          |

---

## How the DoA figure is calculated

```
- Fetch current_quantity and min_threshold from the inventory table.
- Fetch recent logs from consumption_logs, grouped by (station_id, item_name).
- Average the quantity_used of the most recent 14 entries to get daily_rate.
- days_remaining = current_quantity / daily_rate
- status is evaluated as critical (≤ threshold), warning (≤ 2× threshold), or good.
```

Kept deliberately simple — basic thresholds over real recent data beat a fragile predictive model for a working demo.

