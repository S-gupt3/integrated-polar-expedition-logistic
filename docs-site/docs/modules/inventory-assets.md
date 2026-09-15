# Inventory & Asset Management

Owned by the `backend/` module.

- Track 66+ station assets (generators, vehicles, comms units, fuel tanks, GPS beacons)
- Monitor 24 resource categories across 3 stations (Diesel, Propane, Medical Oxygen, Rations, etc.)
- Real-time stock adjustments with automatic status recalculation

## Endpoints

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

See [API Reference](../api-reference.md) for the full list across all modules.
