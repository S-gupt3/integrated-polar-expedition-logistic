function stockStatus(item) {
	if (item.quantity <= item.threshold) return 'Critical';
	if (item.quantity <= item.threshold * 2) return 'Low stock';
	return 'Normal';
}

async function initInventory() {
	const tbody = document.getElementById('inventory-tbody');
	if (!tbody) return;
	
	let inventory = [];
	let doa = [];
	
	try {
		[inventory, doa] = await Promise.all([
			getInventory(),
			getInventoryWithDoA().catch(() => [])
		]);
	} catch (error) {
		tbody.innerHTML = `<tr><td colspan="7" class="loading">Inventory service unavailable — ${error.message}</td></tr>`;
		return;
	}

	const rateFor = {};
	doa.forEach((entry) => {
		rateFor[entry.id || entry.inventory_id] = entry;
	});
	
	inventory = inventory.map((item) => {
		const metrics = rateFor[item.id] || {};
		const dailyRate = Number(metrics.daily_rate || 0);
		return {
			...item,
			status: stockStatus(item),
			dailyRate,
			daysLeft: metrics.days_remaining,
			burn: item.quantity > 0 ? -((dailyRate * 7) / item.quantity) * 100 : 0
		};
	});

	const render = () => {
		const search = (document.getElementById('inventory-search').value || '').toLowerCase();
		const station = window.currentStation();
		const filtered = inventory.filter((item) =>
			`${item.item} ${item.category} ${item.station}`.toLowerCase().includes(search) &&
			(station === 'all' || item.stationCode === station)
		);
		
		document.getElementById('inventory-count').textContent = `${filtered.length} of ${inventory.length} consumable records`;
		document.getElementById('inventory-total').textContent = filtered.length;
		document.getElementById('inventory-critical').textContent = filtered.filter((item) => item.status === 'Critical').length;
		document.getElementById('inventory-health').textContent = filtered.length
			? `${Math.round((filtered.filter((item) => item.status === 'Normal').length / filtered.length) * 100)}%`
			: '--';
			
		tbody.innerHTML = filtered.length
			? filtered.map((item) => `
				<tr>
					<td>
						<div class="asset-name">
							<span class="inventory-icon">${(item.category || '--').slice(0, 2).toUpperCase()}</span>
							<div>
								<strong>${item.item}</strong>
								<span>${item.category} / ${item.id}</span>
							</div>
						</div>
					</td>
					<td>${item.station}</td>
					<td><strong>${item.quantity.toLocaleString('en-IN')} ${item.unit}</strong></td>
					<td>${item.threshold.toLocaleString('en-IN')} ${item.unit}</td>
					<td>${statusBadge(item.status)}</td>
					<td class="${item.burn < -5 ? 'text-red' : ''}">${item.burn ? `${item.burn.toFixed(1)}% / wk` : 'No usage logged'}</td>
					<td>
						<button class="link-arrow stock-action" data-id="${item.id}" data-action="add">+ Add</button>
						<button class="link-arrow text-yellow stock-action" data-id="${item.id}" data-action="reduce" style="margin-left: 8px;">- Reduce</button>
						<button class="link-arrow text-red delete-action" data-id="${item.id}" style="margin-left: 8px;">Remove</button>
					</td>
				</tr>
			`).join('')
			: '<tr><td colspan="7" class="loading">No stock records match this view</td></tr>';

		// 1. Handle Add / Reduce Stock Modal
		document.querySelectorAll('.stock-action').forEach((button) => {
			button.addEventListener('click', () => {
				const id = button.dataset.id;
				const action = button.dataset.action;
				
				document.getElementById('stock-item').value = id;
				document.getElementById('stock-action-type').value = action;
				document.getElementById('stock-modal-title').textContent = action === 'add' ? 'Add Stock' : 'Reduce Stock';
				
				const qtyInput = document.getElementById('stock-quantity');
				qtyInput.min = '1';
				qtyInput.placeholder = action === 'add' ? 'Amount to add' : 'Amount to reduce';
				
				document.getElementById('stock-modal').showModal();
			});
		});

		// 2. Handle Remove/Delete Item
		document.querySelectorAll('.delete-action').forEach((button) => {
			button.addEventListener('click', async () => {
				const id = button.dataset.id;
				const itemName = inventory.find(i => i.id === id)?.item || 'This item';
				
				if (confirm(`Are you sure you want to permanently remove "${itemName}" from inventory? This cannot be undone.`)) {
					try {
						await deleteInventoryItem(id); // Calls the fixed API method
						inventory = inventory.filter(item => item.id !== id);
						render();
					} catch (error) {
						alert(`Could not delete item: ${error.message}`);
					}
				}
			});
		});
	};

	window.mountStationTabs(document.getElementById('station-tabs'), render, inventory, 'stationCode');
	
	document.getElementById('stock-item').innerHTML = inventory.map((item) =>
		`<option value="${item.id}">${item.item} / ${item.station}</option>`
	).join('');
	
	document.getElementById('inventory-search').addEventListener('input', render);
	render();

	// 3. Open modal for adding stock (default action from header button)
	document.getElementById('open-stock-modal').addEventListener('click', () => {
		document.getElementById('stock-action-type').value = 'add';
		document.getElementById('stock-modal-title').textContent = 'Add Stock';
		document.getElementById('stock-quantity').placeholder = 'Amount to add';
		document.getElementById('stock-modal').showModal();
	});

	// 4. Handle Form Submission (Add or Reduce)
	document.getElementById('stock-form').addEventListener('submit', async (event) => {
		event.preventDefault();
		const id = document.getElementById('stock-item').value;
		const action = document.getElementById('stock-action-type').value;
		let delta = Number(document.getElementById('stock-quantity').value);
		
		// Force negative delta if the action is "reduce"
		if (action === 'reduce') {
			delta = -Math.abs(delta);
		} else {
			delta = Math.abs(delta);
		}

		try {
			// Uses updateStock if you added it to api.js, otherwise falls back to addStock
			const result = await (typeof updateStock === 'function' ? updateStock(id, delta) : addStock(id, delta));
			
			const row = inventory.find((item) => item.id === id);
			if (row) {
				row.quantity = Number(result.new_quantity);
				row.status = stockStatus(row); // Recalculate Normal/Low/Critical status
			}
			
			document.getElementById('stock-modal').close();
			document.getElementById('stock-form').reset();
			render();
		} catch (error) {
			alert(`Could not update stock: ${error.message}`);
		}
	});
}

initInventory();
