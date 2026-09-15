# Days of Autonomy (DoA) Engine

Owned by the `backend03/` module.

- Live countdown per resource — *how many days until we run out?*
- Computed from the **actual average of the last 14 days** of consumption logs
- Color-coded status: 🟢 Good / 🟡 Warning / 🔴 Critical
- Based on real `min_threshold` values from inventory data

## Endpoints

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/inventory-doa` | `GET` | Inventory with live DoA calculations |
| `/api/assets-registry` | `GET` | Full asset registry with maintenance info |

See [How the Calculations Work](../calculations.md) for the exact DoA formula.
