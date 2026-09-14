# Polar Expedition Command Center — DoA & Asset Module

A live "Days of Autonomy" dashboard and asset registry for India's polar research stations — **Maitri**, **Bharati**, and **Himadri**. Built as part of the **PLOROPSIS** command-center project for the ISEA-46 operation.

This module answers one operational question at a glance: *how many days can each station keep running on what it has left?*

---

## What it does

- **Live DoA countdown per resource** — Diesel, Propane, Medical Oxygen, Medical Kits, Dry/Frozen Rations, Water Treatment Tablets, and Spare Batteries, tracked separately for all three stations (24 resource blocks total).
- **Real consumption-driven math** — the daily depletion rate for each resource isn't guessed; it's the actual average of that item's last 14 days of logged usage at that station.
- **Color-coded status** — green / amber / red, driven directly by each item's real `min_threshold` from the inventory data (critical at or below threshold, warning within 2× threshold).
- **Asset Registry** — all 66 tracked station assets (generators, vehicles, comms units, fuel tanks, GPS beacons, etc.) with status, last inspection, next maintenance date, and coordinates.
- **Collapsible station sections** — Bharati / Himadri / Maitri each expand or collapse independently, in both the DoA section and the Asset Registry, so command teams can focus on one station at a time.
- **Click-through detail view** — tap any resource block to see its responsible role (e.g. Station Engineer, Medical Officer); tap any asset block to see its full maintenance record.

---

## Tech stack

- **Backend:** Python (FastAPI) — loads the CSV data, computes live DoA figures, serves a JSON API with automatic OpenAPI docs.
- **Frontend:** Plain HTML/CSS/JS — no framework, so it stays lightweight and fast on low-bandwidth station hardware.
- **Data:** CSV files (`inventory.csv`, `consumption_logs.csv`, `assets.csv`) — real operational data, not mock values.

---

## Project structure

```
backend03/
├── app.py # FastAPI backend — API + DoA calculation engine
├── data/
│ ├── inventory.csv # Current stock per resource per station
│ ├── consumption_logs.csv # Daily usage history (May–Sept 2026)
│ └── assets.csv # Equipment registry with status & maintenance dates
└── static/
└── index.html # Dashboard frontend (served by FastAPI)
```

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
daily_rate     = average(quantity_used) over the last 14 logged days, per item per station
days_remaining = current_quantity / daily_rate

status = critical   if current_quantity <= min_threshold
       = warning     if current_quantity <= min_threshold × 2
       = good        otherwise
```

Kept deliberately simple — basic thresholds over real recent data beat a fragile predictive model for a working demo.

