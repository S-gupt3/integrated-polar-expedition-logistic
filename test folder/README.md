# Ploropsis Command Center

A static frontend prototype for monitoring polar research operations, assets, inventory, and consumption trends across Maitri, Bharati, and Himadri stations.

## What It Includes

- **Dashboard**: readiness score, operational KPIs, asset health, alerts, station map, and consumption trend.
- **Assets**: searchable asset list and individual asset details.
- **Inventory**: stock levels, thresholds, status badges, search, and add-stock actions.
- **Analytics**: consumption and station utilization views.
- **Mock data layer**: `frontend/js/api.js` provides local in-memory data so the prototype works without a backend.

## Project Structure

```text
index.html              Entry point; redirects to the dashboard
frontend/
  *.html                Dashboard, assets, inventory, and analytics pages
  css/                  Shared layout and component styles
  js/                   Page logic, navigation, utilities, and mock API
```

## Run Locally

The browser may block scripts or navigation when the files are opened directly. Start a local static server from this directory instead.

### Node.js

From the repository root:

```powershell
npx http-server ".\integrated-polar-expedition-logistic\test folder" -p 4173
```

Then open <http://localhost:4173>.

### Python

```powershell
python -m http.server 4173 --directory ".\integrated-polar-expedition-logistic\test folder"
```

Then open <http://localhost:4173>.

## Pages

| Page | URL |
| --- | --- |
| Command center | `/frontend/index.html` |
| Assets | `/frontend/assets.html` |
| Asset details | `/frontend/asset-detail.html?id=GEN-104` |
| Inventory | `/frontend/inventory.html` |
| Analytics | `/frontend/analytics.html` |

The root `index.html` redirects to the command center automatically.

## Notes

- The frontend currently uses mock data and does not persist changes after a page refresh.
- Chart.js and Leaflet are loaded from public CDNs, so charts and maps require an internet connection.
- The map uses OpenStreetMap tiles through Leaflet.
- This folder is a frontend prototype and is separate from the Python backend in `../backend`.
