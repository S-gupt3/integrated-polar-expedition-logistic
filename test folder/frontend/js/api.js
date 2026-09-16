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
            
            return await response.json();
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

    async deleteInventoryItem(inventoryId) {
        return this.delete(this.endpoints.inventory);
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
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
}
