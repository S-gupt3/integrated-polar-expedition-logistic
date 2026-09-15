# Ice Drift Prediction

Owned by the `drift mapping/` module. This is Versus's module — GIS reference data, drift math, and offline mapping.

- Predict station drift over 1–30 days based on ice conditions
- Three ice models: `fast_ice`, `pack_ice`, `open_water`
- Historical drift path visualization (up to 365 days)
- GIS tile integration for map overlays
- Confidence scoring that degrades with forecast horizon

## Endpoints

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/drift/status` | `GET` | Drift module health check |
| `/api/drift/stations` | `GET` | List stations with base coordinates |
| `/api/drift/predict/{station_id}?days=7&ice_condition=pack_ice` | `GET` | Predict ice drift |
| `/api/drift/history/{station_id}?days=30` | `GET` | Historical drift path |
| `/api/drift/tiles` | `POST` | Get GIS map tile data |

See [How the Calculations Work](../calculations.md) for the drift model's formula and per-condition drift rates.
