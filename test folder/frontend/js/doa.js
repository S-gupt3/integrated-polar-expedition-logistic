// js/doa.js — self-contained Days-of-Availability panel (backend03 /api/inventory-doa)
(function () {
	const PAGE = document.body.dataset.page;
	if (PAGE !== 'analytics' && PAGE !== 'inventory') return;

	const pick = (o, keys) => { for (const k of keys) { const v = o && o[k]; if (v !== undefined && v !== null && v !== '') return v; } return undefined; };
	const num = (o, keys) => { const v = pick(o, keys); return v === undefined ? null : Number(v); };

	const norm = (rows) => (rows || []).map((r) => {
		const qty = num(r, ['quantity', 'current_quantity', 'on_hand', 'qty']);
		const rate = num(r, ['daily_rate', 'consumption_rate', 'avg_daily_use', 'rate']);
		let doa = num(r, ['days_remaining', 'days_of_availability', 'doa', 'days_left', 'doA']);
		if ((doa === null || !isFinite(doa)) && qty !== null && rate) doa = rate > 0 ? qty / rate : Infinity;
		return {
			id: pick(r, ['id', 'inventory_id']),
			item: pick(r, ['item', 'item_name', 'name']) || 'Item',
			station: pick(r, ['stationCode', 'station_id', 'station']) || '--',
			unit: pick(r, ['unit']) || '',
			qty, rate, doa
		};
	}).filter((r) => r.doa !== null);

	const tone = (d) => (!isFinite(d) || d > 14 ? 'good' : d >= 7 ? 'warning' : 'critical');
	const fmt = (d) => (!isFinite(d) ? 'no usage' : d >= 999 ? '999+ d' : `${Math.round(d)} d`);
	const COLOR = { good: '#43c66e', warning: '#f2bd4b', critical: '#e5484d' };

	const gaugeSVG = (label, sub, d) => {
		const C = 2 * Math.PI * 52;
		const pct = !isFinite(d) ? 1 : Math.max(0, Math.min(1, d / 30));
		return `<div class="card gauge">
			<svg viewBox="0 0 120 120">
				<circle class="gauge-track" cx="60" cy="60" r="52"></circle>
				<circle class="gauge-value ${tone(d)}" cx="60" cy="60" r="52"
					stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 60 60)"></circle>
			</svg>
			<div class="gauge-copy"><strong>${fmt(d)}</strong><span>${label}</span></div>
			<footer><h3>${sub}</h3><p>days of availability</p></footer>
		</div>`;
	};

	async function render() {
		const host = document.getElementById('doa-host');
		if (!host) {
			console.warn('[doa] no #doa-host element in DOM');
			return;
		}

		let raw, rows;
		try {
			raw = await getInventoryWithDoA();
			if (raw && raw[0]) console.log('[doa] sample row keys:', Object.keys(raw[0]));
			rows = norm(raw);
			console.log('[doa] normalised rows:', rows.length);
		} catch (error) {
			host.innerHTML = `<section class="card panel-card"><div class="panel-heading"><div>
				<h2>Consumable runway (DoA)</h2>
				<p class="tone-critical">inventory-doa endpoint failed — ${error.message}</p>
			</div></div></section>`;
			return;
		}

		if (!rows.length) {
			host.innerHTML = `<section class="card panel-card"><div class="panel-heading"><div>
				<h2>Consumable runway (DoA)</h2>
				<p>No usable DoA data yet — ${raw ? raw.length : 0} backend rows, but no rate/quantity pairs to compute runway.</p>
			</div></div></section>`;
			return;
		}

		const finite = rows.filter((r) => isFinite(r.doa));
		const worst = finite.slice().sort((a, b) => a.doa - b.doa)[0];
		const avg = finite.length ? finite.reduce((s, r) => s + r.doa, 0) / finite.length : Infinity;
		const risky = finite.filter((r) => r.doa < 7).length;

		const stationGauges = ['MTR', 'BHR', 'HDR'].map((code) => {
			const list = finite.filter((r) => String(r.station).toUpperCase().startsWith(code));
			const min = list.length ? Math.min(...list.map((r) => r.doa)) : Infinity;
			return gaugeSVG(code, list.length ? `${list.length} lines tracked` : 'no data', min);
		}).join('');

		const top = finite.slice().sort((a, b) => a.doa - b.doa).slice(0, 8);

		host.innerHTML = `
			<section class="doa-summary">
				<article class="card"><span>Lowest runway</span>
					<strong class="tone-${tone(worst ? worst.doa : Infinity)}">${worst ? fmt(worst.doa) : '--'}</strong>
					<small>${worst ? `${worst.item} · ${worst.station}` : 'no consuming items'}</small></article>
				<article class="card"><span>Fleet average</span><strong>${fmt(avg)}</strong>
					<small>across ${finite.length} consuming lines</small></article>
				<article class="card"><span>Under 7 days</span>
					<strong class="tone-${risky ? 'critical' : 'good'}">${risky}</strong>
					<small>items needing replenishment planning</small></article>
			</section>
			<section class="gauge-grid">${stationGauges}${gaugeSVG('Fleet', 'worst line', worst ? worst.doa : Infinity)}</section>
			<section class="card panel-card">
				<div class="panel-heading"><div><h2>Shortest runways</h2><p>Days of availability, lowest first</p></div></div>
				<div class="chart-box"><canvas id="doaChart"></canvas></div>
			</section>`;

		if (window.Chart && top.length) {
			if (window.doaChartInstance) window.doaChartInstance.destroy();
			window.doaChartInstance = new Chart(document.getElementById('doaChart'), {
				type: 'bar',
				data: {
					labels: top.map((r) => `${r.item} · ${r.station}`),
					datasets: [{
						data: top.map((r) => Math.round(r.doa)),
						backgroundColor: top.map((r) => COLOR[tone(r.doa)]),
						borderWidth: 0
					}]
				},
				options: {
					indexAxis: 'y',
					maintainAspectRatio: false,
					plugins: { legend: { display: false } },
					scales: {
						x: { grid: { color: 'rgba(128,128,128,.15)' } },
						y: { ticks: { autoSkip: false } }
					}
				}
			});
		}
	}

	// Inject the mount point after the page header
	function ensureHost() {
		if (document.getElementById('doa-host')) return document.getElementById('doa-host');
		const main = document.querySelector('main.page-content');
		if (!main) return null;
		const host = document.createElement('div');
		host.id = 'doa-host';
		const anchor = main.querySelector('.page-header, header.page-header, header');
		if (anchor && anchor.parentNode === main) anchor.insertAdjacentElement('afterend', host);
		else main.appendChild(host);
		return host;
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => { ensureHost(); render(); });
	} else {
		ensureHost();
		render();
	}
})();
