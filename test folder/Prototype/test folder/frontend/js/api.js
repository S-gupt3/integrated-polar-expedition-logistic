const DEFAULT_ASSETS = [
  { id: 'GEN-104', name: 'Diesel Generator', category: 'Power', station: 'Maitri', status: 'Operational', condition: 'Good', nextMaintenance: '20 Sep 2026', serialNumber: 'POL-GEN-104', lastInspection: '02 Sep 2026' },
  { id: 'VEH-022', name: 'Snow Vehicle', category: 'Transport', station: 'Bharati', status: 'Maintenance', condition: 'Fair', nextMaintenance: '14 Sep 2026', serialNumber: 'POL-VEH-022', lastInspection: '28 Aug 2026' },
  { id: 'COM-018', name: 'Satellite Uplink', category: 'Communication', station: 'Maitri', status: 'Operational', condition: 'Excellent', nextMaintenance: '06 Dec 2026', serialNumber: 'POL-COM-018', lastInspection: '06 Sep 2026' },
  { id: 'SCI-207', name: 'Ice Core Freezer', category: 'Scientific', station: 'Bharati', status: 'Damaged', condition: 'Poor', nextMaintenance: '18 Sep 2026', serialNumber: 'POL-SCI-207', lastInspection: '31 Aug 2026' },
  { id: 'MED-031', name: 'Field Medical Kit', category: 'Medical', station: 'Himadri', status: 'Operational', condition: 'Good', nextMaintenance: '04 Oct 2026', serialNumber: 'POL-MED-031', lastInspection: '04 Sep 2026' }
];
const DEFAULT_INVENTORY = [
  { id: 'INV-001', item: 'Diesel fuel', category: 'Fuel', station: 'Maitri', quantity: 820, unit: 'L', threshold: 500, criticalThreshold: 250, status: 'Normal', change: 12 },
  { id: 'INV-019', item: 'Medical kits', category: 'Medical', station: 'Bharati', quantity: 12, unit: 'kits', threshold: 20, criticalThreshold: 15, status: 'Critical', change: -18 },
  { id: 'INV-044', item: 'Lithium batteries', category: 'Power', station: 'Maitri', quantity: 42, unit: 'units', threshold: 50, criticalThreshold: 25, status: 'Low stock', change: -7 },
  { id: 'INV-073', item: 'Food packs', category: 'Provisions', station: 'Bharati', quantity: 850, unit: 'packs', threshold: 500, criticalThreshold: 250, status: 'Normal', change: 4 },
  { id: 'INV-091', item: 'Spare filters', category: 'Maintenance', station: 'Himadri', quantity: 18, unit: 'units', threshold: 25, criticalThreshold: 10, status: 'Low stock', change: -3 }
];
const MOCK_CONSUMPTION = [{ day: '01 Sep', value: 68 }, { day: '03 Sep', value: 74 }, { day: '05 Sep', value: 83 }, { day: '07 Sep', value: 91 }, { day: '09 Sep', value: 96 }, { day: '11 Sep', value: 102 }, { day: '12 Sep', value: 98 }];

const OPERATIONS = [{ id: 'isea-46', label: 'ISEA-46 / Maitri' }, { id: 'isea-47', label: 'ISEA-47 / Bharati' }, { id: 'himadri-relief', label: 'Himadri relief ops' }];
function getOperationId() { return localStorage.getItem('polar-ops-active-operation') || OPERATIONS[0].id; }
function operationKey(key) { return `polar-ops-${getOperationId()}-${key}`; }
function readRecords(key, fallback) { try { const stored = localStorage.getItem(operationKey(key)); if (stored) return JSON.parse(stored); const legacy = localStorage.getItem(`polar-ops-${key}`); return legacy ? JSON.parse(legacy) : structuredClone(fallback); } catch { return structuredClone(fallback); } }
function writeRecords(key, records) { localStorage.setItem(operationKey(key), JSON.stringify(records)); }
async function getAssets() { return readRecords('assets', DEFAULT_ASSETS); }
async function getAsset(id) { return (await getAssets()).find((asset) => asset.id === id) || null; }
async function getInventory() { return readRecords('inventory', DEFAULT_INVENTORY); }
async function getAnalytics() { return { consumption: structuredClone(MOCK_CONSUMPTION), utilization: [82, 76, 71] }; }
async function createAsset(payload) { const assets = await getAssets(); const asset = { id: `AST-${String(assets.length + 1).padStart(3, '0')}`, status: 'Operational', condition: 'Good', nextMaintenance: 'TBD', lastInspection: 'Not inspected', serialNumber: 'Pending', ...payload }; assets.push(asset); writeRecords('assets', assets); return asset; }
async function deleteAsset(id) { const assets = (await getAssets()).filter((asset) => asset.id !== id); writeRecords('assets', assets); return assets; }
async function addStock(id, quantity) { const inventory = await getInventory(); const item = inventory.find((entry) => entry.id === id); if (item) { item.quantity += quantity; item.status = item.quantity <= item.criticalThreshold ? 'Critical' : item.quantity <= item.threshold ? 'Low stock' : 'Normal'; writeRecords('inventory', inventory); } return item; }
async function deleteInventory(id) { const inventory = (await getInventory()).filter((item) => item.id !== id); writeRecords('inventory', inventory); return inventory; }
