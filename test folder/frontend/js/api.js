// test folder/frontend/js/api.js
/**
 * PLOROPSIS API Client
 * Unified API interface for all backend modules
 */

const API_BASE_URL = "http://127.0.0.1:5000"; // Same origin as frontend

class PLOROPSIS_API {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.endpoints = {
            // Backend module (stations, assets, inventory, consumption)
            stations: '/api/stations',
            station: (id) => `/api/stations/${id}`,
            assets: '/api/assets',
            asset: (id) => `/api/assets/${id}`,
            inventory: '/api/inventory',
            inventoryLowStock: '/api/inventory/low-stock',
            inventoryAddStock: (id) => `/api/inventory/${id}/add-stock`,
            consumptionLogs: '/api/consumption-logs',
            
            // Backend03 module (DoA calculations)
            inventoryDoA: '/api/inventory-doa',
            assetsRegistry: '/api/assets-registry',
            
            // Drift mapping module            
            driftStatus: '/api/drift/status',
            driftStations: '/api/drift/stations',
            driftCorrect: '/api/drift/correct',
            driftSeries: '/api/drift/series',
            driftTiles: (z, x, y) => `/tiles/${z}/${x}/${y}.png`,
            
            // Health check
            health: '/api/health'
        };
    }

    // Generic HTTP methods
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
                throw new Error(error.detail || `HTTP ${response.status}`);
            }
            
            const rawData = await response.json();

            // AUTOMATIC TRANSLATOR: Converts backend database snake_case to frontend camelCase
            const STATION_NAMES = { MTR: 'Maitri', BHR: 'Bharati', HDR: 'Himadri', '1': 'Maitri', '2': 'Bharati', '3': 'Himadri' };

            const mapKeys = (item) => {
                if (!item || typeof item !== 'object') return item;
                if (Array.isArray(item)) return item.map(mapKeys);

                const rawStation = item.station_id !== undefined ? item.station_id : item.station;
                const mapped = {};
                for (const key in item) {
                    let newKey = key;

                    // --- Asset Property Mappings ---
                    if (key === 'asset_id') newKey = 'id';
                    if (key === 'station_id') newKey = 'station';
                    if (key === 'next_maintenance' || key === 'next_maintenance_date') newKey = 'nextMaintenance';
                    if (key === 'last_inspection' || key === 'last_inspection_date') newKey = 'lastInspection';
                    if (key === 'serial_number') newKey = 'serialNumber';

                    // --- Inventory Property Mappings (Fixes your current undefined fields) ---
                    if (key === 'inventory_id') newKey = 'id';
                    if (key === 'item_name') newKey = 'item';
                    if (key === 'quantity_on_hand' || key === 'on_hand' || key === 'current_quantity') newKey = 'quantity';
                    if (key === 'safety_threshold' || key === 'min_threshold') newKey = 'threshold';
                    if (key === 'pct_change' || key === 'consumption_rate') newKey = 'change';
                    if (key === 'log_date') newKey = 'date';

                    mapped[newKey] = mapKeys(item[key]);
                }

                // Keep station mappings clean (e.g. mapping "MTR" or numeric codes nicely)
                if (rawStation !== undefined && rawStation !== null) {
                    mapped.stationCode = String(rawStation);
                    mapped.station = STATION_NAMES[mapped.stationCode] || String(rawStation);
                }

                // Fallbacks to guarantee data displays nicely if fields are blank
                if (mapped.id !== undefined) mapped.id = String(mapped.id);
                if (!mapped.serialNumber && mapped.id) mapped.serialNumber = mapped.id;
                if (mapped.quantity !== undefined) mapped.quantity = Number(mapped.quantity);
                if (mapped.threshold !== undefined) mapped.threshold = Number(mapped.threshold);
                if (mapped.change === undefined) mapped.change = 0; // Default to 0% change if empty
                return mapped;
            };


            return mapKeys(rawData);

        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // Backend module methods
    async getStations() {
        return this.get(this.endpoints.stations);
    }

    async getStation(stationId) {
        return this.get(this.endpoints.station(stationId));
    }

    async getAssets() {
        return this.get(this.endpoints.assets);
    }

    async getAsset(assetId) {
        return this.get(this.endpoints.asset(assetId));
    }

    async createAsset(assetData) {
        return this.post(this.endpoints.assets, assetData);
    }

    async deleteAsset(assetId) {
        return this.delete(this.endpoints.asset(assetId));
    }

    async getInventory() {
        return this.get(this.endpoints.inventory);
    }

    async getLowStockItems() {
        return this.get(this.endpoints.inventoryLowStock);
    }

    async addStock(inventoryId, quantityDelta) {
        return this.post(this.endpoints.inventoryAddStock(inventoryId), { quantity_delta: quantityDelta });
    }

    async updateStock(inventoryId, quantityDelta) {
        return this.post(this.endpoints.inventoryAddStock(inventoryId), { quantity_delta: quantityDelta });
    }

    async deleteInventoryItem(inventoryId) {
        return this.delete(`/api/inventory/${inventoryId}`); 
    }

    async getConsumptionLogs() {
        return this.get(this.endpoints.consumptionLogs);
    }

    async createConsumptionLog(logData) {
        return this.post(this.endpoints.consumptionLogs, logData);
    }

    // Backend03 module methods (DoA)
    async getInventoryWithDoA() {
        return this.get(this.endpoints.inventoryDoA);
    }

    async getAssetsRegistry() {
        return this.get(this.endpoints.assetsRegistry);
    }

    // Drift mapping module methods
    async getDriftStatus() {
        return this.get(this.endpoints.driftStatus);
    }

    async getDriftStations() {
        return this.get(this.endpoints.driftStations);
    }

    async correctDrift(stationId, lat, lon, days = 365) {
        const params = new URLSearchParams({ station_id: stationId, days });
        if (lat !== null && lat !== undefined) params.set('lat', lat);
        if (lon !== null && lon !== undefined) params.set('lon', lon);
        return this.get(`${this.endpoints.driftCorrect}?${params}`);
    }

    async getDriftSeries(stationId, lat, lon, days = 365, step = 5) {
        const params = new URLSearchParams({ station_id: stationId, days, step });
        if (lat !== null && lat !== undefined) params.set('lat', lat);
        if (lon !== null && lon !== undefined) params.set('lon', lon);
        return this.get(`${this.endpoints.driftSeries}?${params}`);
    }

    // Utility methods
    async checkHealth() {
        return this.get(this.endpoints.health);
    }

    /**
     * Poll inventory with DoA every N seconds
     */
    startInventoryPolling(callback, intervalSeconds = 3) {
        const poll = async () => {
            try {
                const data = await this.getInventoryWithDoA();
                callback(data);
            } catch (error) {
                console.error('Inventory polling error:', error);
            }
        };

        poll(); // Initial call
        return setInterval(poll, intervalSeconds * 1000);
    }
}

// Export singleton instance
const api = new PLOROPSIS_API();

// Make available globally
if (typeof window !== 'undefined') {
    window.PLOROPSIS_API = PLOROPSIS_API;
    window.api = api;

    window.getStations = () => api.getStations();
    window.getStation = (id) => api.getStation(id);
    window.getAssets = () => api.getAssets();
    window.getAsset = (id) => api.getAsset(id);
    window.createAsset = (data) => api.createAsset(data);
    window.deleteAsset = (id) => api.deleteAsset(id);
    window.getInventory = () => api.getInventory();
    window.getLowStockItems = () => api.getLowStockItems();
    window.addStock = (id, delta) => api.addStock(id, delta);
    window.deleteInventoryItem = (id) => api.deleteInventoryItem(id);
    window.getConsumptionLogs = () => api.getConsumptionLogs();
    window.createConsumptionLog = (data) => api.createConsumptionLog(data);
    window.getInventoryWithDoA = () => api.getInventoryWithDoA();
    window.getAssetsRegistry = () => api.getAssetsRegistry();
    window.getDriftStatus = () => api.getDriftStatus();
    window.getDriftStations = () => api.getDriftStations();
    window.correctDrift = (id, lat, lon, days) => api.correctDrift(id, lat, lon, days);
    window.getDriftSeries = (id, lat, lon, days, step) => api.getDriftSeries(id, lat, lon, days, step);
    window.checkHealth = () => api.checkHealth();
    window.updateStock = (id, delta) => api.updateStock(id, delta);
    window.deleteInventoryItem = (id) => api.deleteInventoryItem(id);
    window.getAnalytics = async function () {
	    try {
		    const logs = await api.getConsumptionLogs().catch(() => []);

		// ---- consumption timeline: latest 7 logged days, all stations summed ----
		    const byDay = {};
		    logs.forEach((log) => {
			    const day = log.date || log.log_date;
			    if (!day) return;
			    byDay[day] = (byDay[day] || 0) + (parseFloat(log.quantity_used) || 0);
		    });
		    const days = Object.keys(byDay).sort();
		    const consumption = days.slice(-7).map((day) => ({ day, value: Math.round(byDay[day]) }));

		// ---- station utilisation: units consumed per person over that 7-day window ----
		    const windowDays = new Set(days.slice(-7));
		    const per = {};
		    logs.forEach((log) => {
			    const day = log.date || log.log_date;
			    if (!day || !windowDays.has(day)) return;
			    const code = log.stationCode || String(log.station_id || log.station || 'ALL');
			    const qty = parseFloat(log.quantity_used) || 0;
			    const head = parseInt(log.active_headcount, 10) || 0;
			    if (!per[code]) per[code] = { qty: 0, head: 0 };
			    per[code].qty += qty;
			    if (head) per[code].head = Math.max(per[code].head, head);
		    });

		    const intensity = {};
		    Object.keys(per).forEach((code) => {
			    intensity[code] = per[code].qty / (per[code].head || 1);
		    });
		    const peak = Math.max(...Object.values(intensity), 0.0001);

		// keep the [Maitri, Bharati, Himadri] array shape analytics.js expects
		    const utilization = ['MTR', 'BHR', 'HDR'].map((code) =>
			    intensity[code] === undefined ? 0 : Math.round((intensity[code] / peak) * 100)
		    );

		    return {
			    utilization,
			    utilizationSource: Object.keys(intensity).length ? 'consumption logs · per-capita · 7d' : 'none',
			    consumption,
			    consumptionSource: consumption.length ? 'consumption logs' : 'none'
		    };
	    } catch (err) {
		    console.error('Analytics builder failed:', err);
		    return { utilization: [0, 0, 0], utilizationSource: 'none', consumption: [], consumptionSource: 'none' };
	    }
    };
}


// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
}
