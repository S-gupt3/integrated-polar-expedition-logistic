function stockStatus(item) { if (item.quantity <= item.threshold) return 'Critical'; if (item.quantity <= item.threshold * 2) return 'Low stock'; return 'Normal'; }

async function initInventory() {
	const tbody = document.getElementById('inventory-tbody');
	if (!tbody) return;
	let inventory = [];
	let doa = [];
	try { [inventory, doa] = await Promise.all([getInventory(), getInventoryWithDoA().catch(() => [])]); }
	catch (error) { tbody.innerHTML = `<tr><td colspan="7" class="loading">Inventory service unavailable — ${error.message}</td></tr>`; return; }

	const rateFor = {};
	doa.forEach((entry) => { rateFor[entry.id || entry.inventory_id] = entry; });
	inventory = inventory.map((item) => {
		const metrics = rateFor[item.id] || {};
		const dailyRate = Number(metrics.daily_rate || 0);
		return { ...item, status: stockStatus(item), dailyRate, daysLeft: metrics.days_remaining, burn: item.quantity > 0 ? -((dailyRate * 7) / item.quantity) * 100 : 0 };
	});

	const render = () => {
		const search = (document.getElementById('inventory-search').value || '').toLowerCase();
		const station = window.currentStation();
		const filtered = inventory.filter((item) => `${item.item} ${item.category} ${item.station}`.toLowerCase().includes(search) && (station === 'all' || item.stationCode === station));
		document.getElementById('inventory-count').textContent = `${filtered.length} of ${inventory.length} consumable records`;
		document.getElementById('inventory-total').textContent = filtered.length;
		document.getElementById('inventory-critical').textContent = filtered.filter((item) => item.status === 'Critical').length;
		document.getElementById('inventory-health').textContent = filtered.length ? `${Math.round((filtered.filter((item) => item.status === 'Normal').length / filtered.length) * 100)}%` : '--';
		tbody.innerHTML = filtered.length ? filtered.map((item) => `<tr><td><div class="asset-name"><span class="inventory-icon">${(item.category || '--').slice(0, 2).toUpperCase()}</span><div><strong>${item.item}</strong><span>${item.category} / ${item.id}</span></div></div></td><td>${item.station}</td><td><strong>${item.quantity.toLocaleString('en-IN')} ${item.unit}</strong></td><td>${item.threshold.toLocaleString('en-IN')} ${item.unit}</td><td>${statusBadge(item.status)}</td><td class="${item.burn < -5 ? 'text-red' : ''}">${item.burn ? `${item.burn.toFixed(1)}% / wk` : 'No usage logged'}</td><td><button class="link-arrow stock-action" data-id="${item.id}">Add stock</button></td></tr>`).join('') : '<tr><td colspan="7" class="loading">No stock records match this view</td></tr>';
		document.querySelectorAll('.stock-action').forEach((button) => button.addEventListener('click', () => { document.getElementById('stock-item').value = button.dataset.id; document.getElementById('stock-modal').showModal(); }));
	};

	window.mountStationTabs(document.getElementById('station-tabs'), render, inventory, 'stationCode');
	document.getElementById('stock-item').innerHTML = inventory.map((item) => `<option value="${item.id}">${item.item} / ${item.station}</option>`).join('');
	document.getElementById('inventory-search').addEventListener('input', render);
	render();

	document.getElementById('open-stock-modal').addEventListener('click', () => document.getElementById('stock-modal').showModal());
	document.getElementById('stock-form').addEventListener('submit', async (event) => {
		event.preventDefault();
		const id = document.getElementById('stock-item').value;
		const delta = Number(document.getElementById('stock-quantity').value);
		try {
			const result = await addStock(id, delta);
			const row = inventory.find((item) => item.id === id);
			if (row) { row.quantity = Number(result.new_quantity); row.status = stockStatus(row); }
			document.getElementById('stock-modal').close();
			document.getElementById('stock-form').reset();
			render();
		} catch (error) { alert(`Could not update stock: ${error.message}`); }
	});
}

initInventory();
