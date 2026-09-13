# PLOROPSIS — Mock Data (Phase 1: Inventory & Consumption)

Generated for early testing of the DoA (Days of Autonomy) Engine and the inventory
schema, before real sensor/scan data exists. Deterministic (seeded) — regenerating
via `generate_mock_data.py` produces the same output.

## Files

### `stations.csv`
Station metadata — one row per station (Maitri, Bharati, Himadri).
| column | meaning |
|---|---|
| station_id | short code used as foreign key everywhere else (MTR/BHR/HDR) |
| region | Antarctica / Arctic — drives the seasonal temperature model |
| latitude, longitude | real approximate coordinates |
| base_headcount_summer/winter | used to simulate seasonal staffing swings |

### `assets.csv`
Asset Registry — non-consumable equipment (generators, vehicles, comms units, etc).
66 rows across 3 stations. Includes status (`Operational` / `Maintenance` /
`Damaged` / `Missing`), inspection dates, and jittered coordinates near each
station (placeholder until the real Drift Mapping System assigns live positions).

### `inventory.csv`
Current snapshot of consumable stock levels — one row per (station, item).
Status (`Normal` / `Low` / `Critical`) is derived from `current_quantity` vs
`min_threshold` — this is what the Ice-Tracker dashboard would render directly.

### `consumption_logs.csv`
**The key file for the DoA Engine.** Daily time series, 120 days, per
station per consumable item (2,880 rows total). Includes `active_headcount`
and `temperature_c` per day so the forecasting logic has real signal to
cross-reference — fuel/propane burn rate is deliberately bumped on colder
days to give the model something non-trivial to pick up on.

## Resource categories covered
Fuel (Diesel, Propane), Medical (Oxygen, Medical Kits), Food (Dry & Frozen
Rations), Water (treatment tablets), Power (spare batteries) — matches the
resource list called out in the DoA Engine spec.

## Known simplifications (flag before using for the real demo)
- Headcount/season logic is a simple day-of-year cutoff, not a real
  expedition calendar (Jan–Feb resupply / Mar–Oct isolation / Nov–Dec air
  drops from the deck) — swap in real dates once the mission calendar is final.
- Consumption noise is uniform random, not based on any real polar station data.
- Asset coordinates are randomly jittered around the station, not real GPS.
