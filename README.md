# PLOROPSIS

**Polar Logistics & Operations System for Polar Integrated Support**

> A unified, offline-first command center for India's polar expedition logistics — tracking assets, predicting ice drift, and computing real-time "Days of Autonomy" for research stations **Maitri**, **Bharati**, and **Himadri**.

Built for the **ISEA-46** operation as part of the integrated polar expedition logistics system.

---

## Overview

PLOROPSIS answers one critical operational question at a glance:

> *How many days can each station keep running on what it has left — and where will the ice carry them?*

It combines three specialized modules into a single executable:

| Module | Purpose |
| :--- | :--- |
| `backend/` | Core logistics — stations, assets, inventory, consumption logs |
| `backend03/` | Days of Autonomy (DoA) calculation engine |
| `drift mapping/` | Ice drift prediction and GIS reference data |
| `test folder/frontend/` | Unified web dashboard (the anchor UI) |

All modules are wired into a single FastAPI server, served through one frontend, and packaged as a double-click executable for field deployment.

---

## Features

### Inventory & Asset Management
- Track 66+ station assets (generators, vehicles, comms units, fuel tanks, GPS beacons)
- Monitor 24 resource categories across 3 stations (Diesel, Propane, Medical Oxygen, Rations, etc.)
- Real-time stock adjustments with automatic status recalculation

### Days of Autonomy (DoA) Engine
- Live countdown per resource — *how many days until we run out?*
- Computed from the **actual average of the last 14 days** of consumption logs
- Color-coded status: 🟢 Good / 🟡 Warning / 🔴 Critical
- Based on real `min_threshold` values from inventory data

### Ice Drift Prediction
- Predict station drift over 1–30 days based on ice conditions
- Three ice models: `fast_ice`, `pack_ice`, `open_water`
- Historical drift path visualization (up to 365 days)
- GIS tile integration for map overlays
- Confidence scoring that degrades with forecast horizon

### Unified Dashboard
- Single-page application with modular views (Dashboard, Assets, Inventory, Analytics)
- Auto-refreshing data (3-second polling for live DoA)
- Collapsible station sections for focused views
- Click-through detail views for assets and resources
- Low-bandwidth optimized — works on field hardware

### Distribution-Ready
- **One executable** — `PLOROPSIS.exe` (Windows) or `PLOROPSIS` (Linux)
- **User-editable config** — `config.json` lives next to the exe
- **Auto browser launch** — opens the dashboard on startup
- **Friendly error handling** — clear messages if MySQL isn't reachable

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PLOROPSIS Frontend                        │
│              (test folder/frontend/)                         │
│   index.html • dashboard • assets • inventory • analytics    │
└──────────────────────────┬────────────────────────────────────┘
                            │ HTTP /api/*
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Unified FastAPI Server                      │
│                      (app.py)                                │
├─────────────────┬──────────────────┬─────────────────────────┤
│  /api/stations   │ /api/inventory   │  /api/drift/predict     │
│  /api/assets     │ /api/inventory-  │  /api/drift/history     │
│  /api/consump-   │   doa            │  /api/drift/stations    │
│   tion-logs      │ /api/assets-     │  /api/drift/tiles       │
│                  │   registry       │                         │
└────────┬─────────┴────────┬─────────┴──────────┬──────────────┘
         │                  │                    │
         ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                      MySQL (polar_db)                        │
│   stations • assets • inventory • consumption_logs           │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | Python 3.10+ / FastAPI |
| **Database** | MySQL 8.0+ (via PyMySQL) |
| **Frontend** | Vanilla HTML/CSS/JS (no framework) |
| **Packaging** | PyInstaller (single executable) |
| **Server** | Uvicorn (ASGI) |

---

## Project Structure

```
integrated-polar-expedition-logistic/
│
├── app.py                      # Unified entry point (PLOROPSIS)
├── config.json                 # User-editable DB/server settings
├── requirements.txt            # Python dependencies
│
├── backend/                    # Core logistics module
│   ├── router.py               #   → FastAPI router (stations, assets, inventory)
│   ├── main.py                 #   → Standalone version (legacy)
│   ├── schema.sql              #   → Database schema
│   └── import_csv_to_mysql.py  #   → CSV → MySQL migration tool
│
├── backend03/                  # DoA calculation engine
│   ├── router.py               #   → FastAPI router (inventory-doa, assets-registry)
│   └── app.py                  #   → Standalone version (legacy)
│
├── drift mapping/               # Ice drift prediction module
│   ├── router.py                #   → FastAPI router (drift endpoints)
│   ├── ice_drift_engine.py      #   → Core drift calculations
│   └── gis_real_reference_data.py
│
├── test folder/                 # Frontend anchor
│   └── frontend/
│       ├── index.html          #   → Main dashboard
│       ├── analytics.html      #   → Analytics view
│       ├── assets.html         #   → Asset registry view
│       ├── inventory.html      #   → Inventory view
│       ├── css/                #   → Stylesheets
│       └── js/
│           ├── api.js          #   → Unified API client (PLOROPSIS_API)
│           ├── dashboard.js    #   → Dashboard logic
│           ├── inventory.js    #   → Inventory view logic
│           └── ...
│
├── Data/                        # Source CSVs (for initial import)
│   ├── stations.csv
│   ├── assets.csv
│   ├── inventory.csv
│   └── consumption_logs.csv
│
├── build_app.bat                # Build Windows executable
├── build_app.sh                 # Build Linux binary
├── run_app.bat                  # Dev mode (Windows)
└── run_app.sh                   # Dev mode (Linux)
```

---

## Quick Start

### Prerequisites
- **Python 3.10+**
- **MySQL 8.0+** running with a database named `polar_db`
- **Git** (for cloning)

### 1. Clone the Repository

```bash
git clone https://github.com/S-gupt3/integrated-polar-expedition-logistic.git
cd integrated-polar-expedition-logistic
```

### 2. Set Up the Database

```bash
# Create the database and user
mysql -u root -p
```

```sql
CREATE DATABASE polar_db;
CREATE USER 'python_user'@'localhost' IDENTIFIED BY '1729';
GRANT ALL PRIVILEGES ON polar_db.* TO 'python_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

```bash
# Import the schema
mysql -u python_user -p polar_db < backend/schema.sql

# Import CSV data (optional but recommended)
python backend/import_csv_to_mysql.py
```

> **Security note:** the sample credentials above (`python_user` / `1729`) are placeholders for local development only. Use a strong, unique password — and keep it out of version control — for any shared or field-deployed instance.

### 3. Run in Development Mode

**Windows:**
```bat
run_app.bat
```

**Linux:**
```bash
chmod +x run_app.sh
./run_app.sh
```

The server starts on `http://localhost:5000` and auto-opens the browser.

### 4. Build the Executable

**Windows:**
```bat
build_app.bat
```

**Linux:**
```bash
chmod +x build_app.sh
./build_app.sh
```

The executable appears in `dist/PLOROPSIS/`. Zip the entire folder and distribute.

---

## Configuration

PLOROPSIS reads its settings from `config.json` (auto-created on first run if missing):

```json
{
  "db_host": "localhost",
  "db_port": 3306,
  "db_user": "python_user",
  "db_password": "1729",
  "db_name": "polar_db",
  "server_port": 5000,
  "auto_open_browser": true
}
```

| Field | Description |
| :--- | :--- |
| `db_host` | MySQL server hostname |
| `db_port` | MySQL port (default 3306) |
| `db_user` | Database username |
| `db_password` | Database password |
| `db_name` | Database name |
| `server_port` | Port for the PLOROPSIS web server |
| `auto_open_browser` | Auto-launch browser on startup |

**Note:** In the packaged executable, `config.json` lives **next to the `.exe`** — users can edit it without rebuilding.

---

## API Reference

All endpoints are prefixed with `/api/`. Interactive docs at `http://localhost:5000/docs`.

### Backend Module

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/stations` | `GET` | List all stations |
| `/api/stations/{id}` | `GET` | Get single station |
| `/api/assets` | `GET` | List all assets |
| `/api/assets` | `POST` | Create a new asset |
| `/api/assets/{id}` | `GET` | Get single asset |
| `/api/assets/{id}` | `DELETE` | Delete an asset |
| `/api/inventory` | `GET` | List all inventory items |
| `/api/inventory/low-stock` | `GET` | Get low/critical stock items |
| `/api/inventory/{id}/add-stock` | `POST` | Adjust stock level |
| `/api/inventory/{id}` | `DELETE` | Remove inventory item |
| `/api/consumption-logs` | `GET` | List recent consumption logs |
| `/api/consumption-logs` | `POST` | Record new consumption |

### DoA Module (backend03)

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/inventory-doa` | `GET` | Inventory with live DoA calculations |
| `/api/assets-registry` | `GET` | Full asset registry with maintenance info |

### Drift Module

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/drift/status` | `GET` | Drift module health check |
| `/api/drift/stations` | `GET` | List stations with base coordinates |
| `/api/drift/predict/{station_id}?days=7&ice_condition=pack_ice` | `GET` | Predict ice drift |
| `/api/drift/history/{station_id}?days=30` | `GET` | Historical drift path |
| `/api/drift/tiles` | `POST` | Get GIS map tile data |

### System

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/health` | `GET` | System health check |

---

## How DoA Is Calculated

```
daily_rate     = average(quantity_used) over last 14 logged days, per item per station
days_remaining = current_quantity / daily_rate

status = critical   if current_quantity ≤ min_threshold
       = warning    if current_quantity ≤ min_threshold × 2
       = good       otherwise
```

This is a **live projection** — `days_remaining` is computed on every request from the current database state. Stock only changes when new consumption logs are recorded (no artificial in-memory depletion).

---

## How Drift Prediction Works

The drift engine uses a simplified ice dynamics model:

```
drift_distance  = base_rate × days × random_variation
drift_direction = station-specific bias + random_variation
new_position    = current_position + (distance × direction)
confidence      = max(0.5, 1.0 - days / 30)
```

| Ice Condition | Base Drift Rate |
| :--- | :--- |
| `fast_ice` | 0.5 km/day (stable, attached to coast) |
| `pack_ice` | 3.5 km/day (moving with currents/wind) |
| `open_water` | 8.0 km/day (maximum drift) |

> **Note:** This is a demonstration model. For production, integrate with NSIDC satellite data and ECMWF weather forecasts.

---

## Frontend Usage

The frontend (`test folder/frontend/`) uses the `PLOROPSIS_API` class defined in `js/api.js`:

```javascript
// Example: Get inventory with DoA
const inventory = await api.getInventoryWithDoA();

// Example: Predict drift for Maitri over 7 days
const drift = await api.predictDrift('MTR', 7, 'pack_ice');

// Example: Start live polling
const interval = api.startInventoryPolling((data) => {
    updateDashboard(data);
}, 3); // poll every 3 seconds
```

---

## Troubleshooting

### "Cannot connect to MySQL"
- Verify MySQL is running: `mysql -u python_user -p`
- Check `config.json` credentials
- Ensure `polar_db` exists and schema is imported

### Frontend not loading
- Verify `test folder/frontend/index.html` exists
- Check browser console for 404 errors
- Ensure the exe was built with the correct `--add-data` paths

### Build fails with "hidden import" errors
- The build scripts include all necessary hidden imports for `uvicorn` and `pymysql`
- If adding new modules, update `build_app.bat` / `build_app.sh` with `--hidden-import=<module>`

### Port 5000 already in use
- Edit `config.json` and change `server_port` to another value (e.g., `5001`)
- Restart the application

---

## Distribution Checklist

When shipping PLOROPSIS to a field station:

- [ ] Build the executable (`build_app.bat` / `build_app.sh`)
- [ ] Verify `dist/PLOROPSIS/` contains:
  - `PLOROPSIS.exe` (or `PLOROPSIS` binary)
  - `config.json`
  - `_internal/` folder (PyInstaller dependencies)
- [ ] Zip the entire `dist/PLOROPSIS/` folder
- [ ] Recipient must have:
  - MySQL 8.0+ installed
  - `polar_db` database created with schema imported
  - (Optional) Python 3.10+ if they need to edit `config.json` beyond basics
- [ ] Recipient double-clicks `PLOROPSIS.exe` → browser opens → ready to use

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow
- Use `run_app.bat` / `run_app.sh` for fast iteration
- Test API changes at `http://localhost:5000/docs`
- Rebuild the executable only when ready to distribute

---

## License

...

---

<div align="center">

**PLOROPSIS** — *Keeping India's polar stations supplied, safe, and one step ahead of the ice.*

Built for the heroes at Maitri, Bharati, and Himadri

</div>
