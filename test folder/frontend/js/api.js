// PLOROPSIS — api.js (backend-connected version)
//
// Same public function names as the original mock version (getAssets,
// getAsset, getInventory, getAnalytics, createAsset, deleteAsset,
// addStock, deleteInventory) — dashboard.js / assets.js / inventory.js
// call these exactly as before and need NO changes.
//
// What changed: instead of reading/writing localStorage, these now fetch
// from the FastAPI backend (backend/main.py) and map its field names
// (item_name, current_quantity, min_threshold, station_id...) onto the
// field names the existing UI code expects (item, quantity, threshold,
// station...).

const BACKEND_URL = "http://localhost:8000";

const STATION_NAMES = { MTR: "Maitri", BHR: "Bharati", HDR: "Himadri" };

function formatDate(isoDateStr) {
  if (!isoDateStr) return "TBD";
  const d = new Date(isoDateStr);
  if (isNaN(d)) return isoDateStr;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function mapInventoryStatus(backendStatus) {
  // Backend/CSV uses 'Normal' / 'Low' / 'Critical'.
  // Existing frontend UI expects 'Normal' / 'Low stock' / 'Critical'.
  if (backendStatus === "Low") return "Low stock";
  return backendStatus;
}

// ---------------------------------------------------------------------------
// ASSETS
// ---------------------------------------------------------------------------
async function getAssets() {
  const res = await fetch(`${BACKEND_URL}/api/assets`);
  if (!res.ok) throw new Error(`Failed to fetch assets: ${res.status}`);
  const rows = await res.json();
  return rows.map((a) => ({
    id: a.asset_id,
    name: a.name,
    category: a.category,
    station: STATION_NAMES[a.station_id] || a.station_id,
    status: a.status,
    condition: a.status === "Operational" ? "Good" : (a.status === "Damaged" ? "Poor" : "Fair"),
    nextMaintenance: formatDate(a.next_maintenance_date),
    serialNumber: a.asset_id,
    lastInspection: formatDate(a.last_inspection_date),
  }));
}

async function getAsset(id) {
  const res = await fetch(`${BACKEND_URL}/api/assets/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const a = await res.json();
  return {
    id: a.asset_id,
    name: a.name,
    category: a.category,
    station: STATION_NAMES[a.station_id] || a.station_id,
    status: a.status,
    condition: a.status === "Operational" ? "Good" : (a.status === "Damaged" ? "Poor" : "Fair"),
    nextMaintenance: formatDate(a.next_maintenance_date),
    serialNumber: a.asset_id,
    lastInspection: formatDate(a.last_inspection_date),
  };
}

async function createAsset(payload) {
  // payload from the UI has { name, station, category } where `station`
  // is a display name (e.g. "Maitri") — convert back to the station_id code.
  const stationId = Object.keys(STATION_NAMES).find((k) => STATION_NAMES[k] === payload.station) || payload.station;
  const assetId = `AST-${Date.now().toString().slice(-6)}`;

  const body = {
    asset_id: assetId,
    name: payload.name,
    category: payload.category,
    station_id: stationId,
    status: "Operational",
  };

  const res = await fetch(`${BACKEND_URL}/api/assets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to create asset: ${res.status}`);
  return getAsset(assetId);
}

async function deleteAsset(id) {
  await fetch(`${BACKEND_URL}/api/assets/${encodeURIComponent(id)}`, { method: "DELETE" });
  return getAssets();
}

// ---------------------------------------------------------------------------
// INVENTORY
// ---------------------------------------------------------------------------
async function getInventory() {
  const res = await fetch(`${BACKEND_URL}/api/inventory`);
  if (!res.ok) throw new Error(`Failed to fetch inventory: ${res.status}`);
  const rows = await res.json();
  return rows.map((i) => ({
    id: i.inventory_id,
    item: i.item_name,
    category: i.category,
    station: STATION_NAMES[i.station_id] || i.station_id,
    quantity: Number(i.current_quantity),
    unit: i.unit,
    threshold: Number(i.min_threshold),
    criticalThreshold: Number(i.min_threshold) * 0.5, // backend has no separate critical field yet
    status: mapInventoryStatus(i.status),
    change: 0, // trend requires a time-window query against consumption_logs — see getAnalytics
  }));
}

async function addStock(id, quantity) {
  const res = await fetch(`${BACKEND_URL}/api/inventory/${encodeURIComponent(id)}/add-stock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity_delta: quantity }),
  });
  if (!res.ok) throw new Error(`Failed to update stock: ${res.status}`);
  const inventory = await getInventory();
  return inventory.find((item) => item.id === id);
}

async function deleteInventory(id) {
  await fetch(`${BACKEND_URL}/api/inventory/${encodeURIComponent(id)}`, { method: "DELETE" });
  return getInventory();
}

// ---------------------------------------------------------------------------
// ANALYTICS
// ---------------------------------------------------------------------------
async function getAnalytics() {
  const res = await fetch(`${BACKEND_URL}/api/consumption-logs`);
  if (!res.ok) throw new Error(`Failed to fetch consumption logs: ${res.status}`);
  const logs = await res.json();

  // Aggregate total quantity_used per day across all stations/items, most
  // recent ~7 distinct days, for the dashboard's consumption trend chart.
  const byDate = {};
  logs.forEach((log) => {
    const d = log.log_date;
    byDate[d] = (byDate[d] || 0) + Number(log.quantity_used);
  });
  const sortedDates = Object.keys(byDate).sort().slice(-7);
  const consumption = sortedDates.map((d) => ({
    day: formatDate(d).replace(/ \d{4}$/, ""), // "12 Sep" style, matching the original mock shape
    value: Math.round(byDate[d]),
  }));

  // Rough utilization proxy per station: total consumption in the log
  // window, normalized against the max station total (0-100 scale) — a
  // placeholder until a real utilization metric is defined.
  const byStation = {};
  logs.forEach((log) => {
    byStation[log.station_id] = (byStation[log.station_id] || 0) + Number(log.quantity_used);
  });
  const maxVal = Math.max(...Object.values(byStation), 1);
  const utilization = Object.keys(STATION_NAMES).map((sid) =>
    Math.round(((byStation[sid] || 0) / maxVal) * 100)
  );

  return { consumption, utilization };
}
