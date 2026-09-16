function daysUntil(dateString) { const target = new Date(dateString); if (isNaN(target)) return null; return Math.round((target - new Date()) / 86400000); }

function conditionFor(asset) { if (asset.status === 'Damaged') return 'Needs repair'; if (asset.status === 'Missing') return 'Unaccounted'; const left = daysUntil(asset.nextMaintenance); if (left === null) return 'Nominal'; if (left < 0) return `Overdue ${Math.abs(left)}d`; if (left < 30) return `Service in ${left}d`; return 'Nominal'; }

function maintenanceLabel(asset) { const left = daysUntil(asset.nextMaintenance); if (left === null) return asset.nextMaintenance || 'Scheduled'; const shown = new Date(asset.nextMaintenance).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); return `${shown} (${left < 0 ? `${Math.abs(left)}d overdue` : `${left}d`})`; }

async function initAssets() {
	const tbody = document.getElementById('assets-tbody');
	if (!tbody) return;
	let allAssets = [];
	try { allAssets = await getAssets(); } catch (error) { tbody.innerHTML = `<tr><td colspan="7" class="loading">Asset service unavailable — ${error.message}</td></tr>`; return; }
	allAssets = allAssets.map((asset) => ({ ...asset, condition: conditionFor(asset) }));

	const render = () => {
		const search = (document.getElementById('asset-search').value || '').toLowerCase();
		const status = document.getElementById('asset-status').value;
		const station = window.currentStation();
		const filtered = allAssets.filter((asset) => `${asset.id} ${asset.name} ${asset.category}`.toLowerCase().includes(search) && (station === 'all' || asset.stationCode === station) && (!status || asset.status === status));
		document.getElementById('asset-count').textContent = `${filtered.length} of ${allAssets.length} records in view`;
		tbody.innerHTML = filtered.length ? filtered.map((asset) => `<tr><td><div class="asset-name"><span class="asset-icon">${asset.category.slice(0, 2).toUpperCase()}</span><div><strong>${asset.name}</strong><span>${asset.id}</span></div></div></td><td>${asset.category}</td><td>${asset.station}</td><td>${statusBadge(asset.status)}</td><td>${asset.condition}</td><td>${maintenanceLabel(asset)}</td><td><a class="link-arrow" href="asset-detail.html?id=${encodeURIComponent(asset.id)}">Open</a></td></tr>`).join('') : '<tr><td colspan="7" class="loading">No assets match this view</td></tr>';
	};

	window.mountStationTabs(document.getElementById('station-tabs'), render, allAssets, 'stationCode');
	['asset-search', 'asset-status'].forEach((id) => document.getElementById(id).addEventListener('input', render));
	render();

	const modal = document.getElementById('asset-modal');
	document.getElementById('open-asset-modal').addEventListener('click', () => modal.showModal());
	document.getElementById('add-asset-form').addEventListener('submit', async (event) => {
		event.preventDefault();
		const stationCode = document.getElementById('new-asset-station').value;
		const payload = {
			asset_id: `AST-${String(Date.now()).slice(-6)}`,
			name: document.getElementById('new-asset-name').value,
			category: document.getElementById('new-asset-category').value,
			station_id: stationCode,
			status: 'Operational',
			last_inspection_date: new Date().toISOString().slice(0, 10),
			next_maintenance_date: new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10),
		};
		try {
			await createAsset(payload);
			allAssets = (await getAssets()).map((asset) => ({ ...asset, condition: conditionFor(asset) }));
			modal.close();
			render();
		} catch (error) { alert(`Could not create asset: ${error.message}`); }
	});
}

async function initAssetDetail() {
	const target = document.getElementById('asset-detail');
	if (!target) return;
	const id = getQueryParam('id');
	if (!id) { target.innerHTML = '<div class="card loading">No asset id in the URL</div>'; return; }
	let asset;
	try { asset = await getAsset(id); } catch (error) { target.innerHTML = `<div class="card loading">Could not load ${id} — ${error.message}</div>`; return; }
	asset.condition = conditionFor(asset);
	const coords = asset.latitude && asset.longitude ? `${Number(asset.latitude).toFixed(4)}, ${Number(asset.longitude).toFixed(4)}` : 'Not surveyed';
	target.innerHTML = `<div class="asset-detail-grid"><section class="card detail-hero"><p class="eyebrow">ASSET ${asset.id}</p><h2>${asset.name}</h2><div class="asset-name"><span class="asset-icon">${(asset.category || '--').slice(0, 2).toUpperCase()}</span><div><strong>${asset.category}</strong><span>${asset.station} station</span></div>${statusBadge(asset.status)}</div><div class="detail-facts"><div><span>Station</span><strong>${asset.station}</strong></div><div><span>Condition</span><strong>${asset.condition}</strong></div><div><span>Last inspection</span><strong>${asset.lastInspection || 'No record'}</strong></div><div><span>Next maintenance</span><strong>${maintenanceLabel(asset)}</strong></div><div><span>Recorded position</span><strong>${coords}</strong></div><div><span>Category</span><strong>${asset.category}</strong></div></div><div class="asset-detail-actions"><button class="btn-primary" id="report-damage">Report damage</button><a class="btn-secondary" href="assets.html">Back to registry</a></div></section><section class="card timeline-card"><p class="eyebrow">LIFECYCLE</p><h2>Recorded history</h2><div class="timeline"><div><strong>Next maintenance due</strong><small>${asset.nextMaintenance || 'Not scheduled'}</small></div><div><strong>Last inspection</strong><small>${asset.lastInspection || 'No record'}</small></div><div><strong>Assigned to ${asset.station}</strong><small>Station of record</small></div></div></section></div>`;
	const damageModal = document.getElementById('damage-modal');
	document.getElementById('report-damage').addEventListener('click', () => damageModal.showModal());
	document.getElementById('damage-form').addEventListener('submit', (event) => { event.preventDefault(); damageModal.close(); });
}

if (document.getElementById('assets-tbody')) initAssets(); else initAssetDetail();
