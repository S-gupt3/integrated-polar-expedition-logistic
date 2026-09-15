# Architecture

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

## Tech stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | Python 3.10+ / FastAPI |
| **Database** | MySQL 8.0+ (via PyMySQL) |
| **Frontend** | Vanilla HTML/CSS/JS (no framework) |
| **Packaging** | PyInstaller (single executable) |
| **Server** | Uvicorn (ASGI) |

## Project structure

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
