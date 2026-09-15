# Configuration

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

!!! info
    In the packaged executable, `config.json` lives **next to the `.exe`** — users can edit it without rebuilding.
