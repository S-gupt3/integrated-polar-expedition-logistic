# Frontend Usage

The frontend (`test folder/frontend/`) uses the `PLOROPSIS_API` class defined in `js/api.js`:

```javascript
// Example: Get inventory with DoA
const inventory = await api.getInventoryWithDoA();

// Example: Predict drift for Maitri over 7 days
const drift = await api.predictDrift('MTR', 7, 'pack_ice');

// Example: Start live polling
const interval = api.startInventoryPolling((data) => {
    updateDashboard(data);
}, 3); // poll every 3 seconds
```
