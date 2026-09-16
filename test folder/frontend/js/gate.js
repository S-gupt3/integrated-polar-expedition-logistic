// js/gate.js — live telemetry for the tri-pane station gate
(function () {
	const CODES = ['HDR', 'MTR', 'BHR'];
	const $ = (id) => document.getElementById(id);
	document.querySelectorAll('.pane').forEach((pane) => {
		pane.addEventListener('click', () => {
			localStorage.setItem('ploropsis-station', pane.dataset.station);
		});
	});

	/* UTC wall clock */
	const tickClock = () => {
		const now = new Date();
		const pad = (n) => String(n).padStart(2, '0');
		const el = $('sys-clock');
		if (el) el.textContent = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC`;
	};
	tickClock();
	setInterval(tickClock, 1000);

	const setStat = (code, key, value, tone) => {
		const el = document.getElementById(`st-${code}-${key}`);
		if (!el) return;
		el.textContent = value;
		el.className = 'mono' + (tone ? ` ${tone}` : '');
	};

	const stockState = (item) =>
		item.quantity <= item.threshold ? 'Critical' : item.quantity <= item.threshold * 2 ? 'Low' : 'Normal';

	function stampSync(label) {
		const el = $('gate-sync');
		if (!el) return;
		if (label) { el.textContent = label; return; }
		const now = new Date();
		const pad = (n) => String(n).padStart(2, '0');
		el.textContent = `LAST SYNC ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC`;
	}

	async function refresh() {
		const t0 = performance.now();
		let assets = [];
		let inventory = [];
		try {
			[assets, inventory] = await Promise.all([getAssets(), getInventory()]);
			$('sys-led').className = 'led led-green';
			$('sys-status').textContent = 'LINK OK';
			$('sys-latency').textContent = `${Math.round(performance.now() - t0)} ms`;
		} catch (error) {
			$('sys-led').className = 'led led-red';
			$('sys-status').textContent = 'BACKEND OFFLINE';
			$('sys-latency').textContent = '-- ms';
			CODES.forEach((code) => {
				['assets', 'op', 'crit', 'alerts'].forEach((k) => setStat(code, k, '--'));
				const led = document.getElementById(`led-${code}`);
				if (led) led.className = 'led';
			});
			stampSync('SYNC FAILED');
			return;
		}

		CODES.forEach((code) => {
			const stAssets = assets.filter((a) => a.stationCode === code);
			const stInv = inventory.filter((i) => i.stationCode === code);
			const op = stAssets.filter((a) => a.status === 'Operational').length;
			const crit = stInv.filter((i) => stockState(i) === 'Critical').length;
			const low = stInv.filter((i) => stockState(i) === 'Low').length;
			const alerts = crit + low + stAssets.filter((a) => a.status !== 'Operational').length;

			setStat(code, 'assets', stAssets.length);
			setStat(code, 'op', stAssets.length ? `${Math.round((op / stAssets.length) * 100)}%` : '--',
				stAssets.length && op === stAssets.length ? 'ok' : '');
			setStat(code, 'crit', crit, crit ? 'crit' : 'ok');
			setStat(code, 'alerts', alerts, alerts ? (crit ? 'crit' : 'warn') : 'ok');

			const led = document.getElementById(`led-${code}`);
			if (led) led.className = `led ${crit ? 'led-red' : alerts ? 'led-amber' : 'led-green'}`;
		});

		stampSync();
	}

	refresh();
	setInterval(refresh, 30000); // ops-board behaviour: quiet 30 s poll
})();
