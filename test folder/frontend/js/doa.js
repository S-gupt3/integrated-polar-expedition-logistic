const DOA_CATEGORIES = ['Fuel', 'Food', 'Medical', 'Water'];
const DOA_BANDS = [{ limit: 14, tone: 'critical' }, { limit: 45, tone: 'warning' }, { limit: Infinity, tone: 'good' }];

function toneFor(days) { return DOA_BANDS.find((band) => days < band.limit).tone; }

function gaugeMarkup(label, days, detail) {
	const capped = Math.max(0, Math.min(120, days));
	const sweep = (capped / 120) * 260;
	const radius = 52;
	const circumference = 2 * Math.PI * radius;
	const arc = (sweep / 360) * circumference;
	const track = (260 / 360) * circumference;
	return `<article class="gauge card"><svg viewBox="0 0 140 140" role="img" aria-label="${label}: ${Math.round(days)} days"><circle class="gauge-track" cx="70" cy="70" r="${radius}" stroke-dasharray="${track} ${circumference}" transform="rotate(140 70 70)"></circle><circle class="gauge-value ${toneFor(days)}" cx="70" cy="70" r="${radius}" stroke-dasharray="${arc} ${circumference}" transform="rotate(140 70 70)"></circle></svg><div class="gauge-copy"><strong>${days >= 120 ? '120+' : Math.round(days)}</strong><span>days</span></div><footer><h3>${label}</h3><p>${detail}</p></footer></article>`;
}

async function initDoA() {
	const host = document.getElementById('doa-gauges');
	if (!host) return;
	let items = [];
	try { items = await getInventoryWithDoA(); }
	catch (error) { host.innerHTML = `<div class="card loading">DoA engine unavailable — ${error.message}</div>`; return; }
	items = items.map((item) => ({ ...item, label: item.name || item.item, days: Number(item.days_remaining), rate: Number(item.daily_rate) }));

	let burnChart = null;
	let runwayChart = null;

	const render = () => {
		const station = window.currentStation();
		const scoped = items.filter((item) => station === 'all' || item.stationCode === station);
		if (!scoped.length) { host.innerHTML = '<div class="card loading">No consumables recorded for this station</div>'; return; }

		host.innerHTML = DOA_CATEGORIES.map((category) => {
			const group = scoped.filter((item) => item.category === category);
			if (!group.length) return gaugeMarkup(category, 0, 'No stock recorded');
			const weakest = group.reduce((worst, item) => (item.days < worst.days ? item : worst));
			return gaugeMarkup(category, weakest.days, `Limited by ${weakest.label}`);
		}).join('');

		const overall = scoped.reduce((worst, item) => (item.days < worst.days ? item : worst));
		document.getElementById('doa-headline').textContent = overall.days >= 120 ? '120+' : Math.round(overall.days);
		document.getElementById('doa-limiter').textContent = `${overall.label} at ${overall.station} is the binding constraint`;
		document.getElementById('doa-critical').textContent = scoped.filter((item) => item.days < 14).length;
		document.getElementById('doa-tracked').textContent = scoped.length;

		const runway = [...scoped].sort((a, b) => a.days - b.days).slice(0, 12);
		const runwayColours = runway.map((item) => (item.days < 14 ? '#eb5757' : item.days < 45 ? '#f2c94c' : '#4cb782'));
		if (runwayChart) runwayChart.destroy();
		runwayChart = new Chart(document.getElementById('runwayChart'), {
			type: 'bar',
			data: { labels: runway.map((item) => item.label), datasets: [{ data: runway.map((item) => Math.min(item.days, 200)), backgroundColor: runwayColours, borderRadius: 3, barThickness: 14 }] },
			options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${Math.round(context.raw)} days remaining` } } }, scales: { x: { title: { display: true, text: 'Days remaining' } } } },
		});

		const burn = [...scoped].filter((item) => item.rate > 0).sort((a, b) => b.rate - a.rate).slice(0, 8);
		if (burnChart) burnChart.destroy();
		burnChart = new Chart(document.getElementById('burnChart'), {
			type: 'bar',
			data: { labels: burn.map((item) => item.label), datasets: [{ data: burn.map((item) => item.rate), backgroundColor: '#5e6ad2', borderRadius: 3 }] },
			options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${context.raw} ${burn[context.dataIndex].unit} per day` } } }, scales: { y: { title: { display: true, text: 'Daily consumption' } } } },
		});

		document.getElementById('doa-tbody').innerHTML = [...scoped].sort((a, b) => a.days - b.days).map((item) => `<tr><td><div class="asset-name"><span class="inventory-icon">${(item.category || '--').slice(0, 2).toUpperCase()}</span><div><strong>${item.label}</strong><span>${item.category} / ${item.id}</span></div></div></td><td>${item.station}</td><td>${Number(item.current_quantity).toLocaleString('en-IN')} ${item.unit}</td><td>${item.rate ? `${item.rate} ${item.unit}/day` : 'No usage logged'}</td><td><strong class="tone-${toneFor(item.days)}">${item.days >= 999 ? 'No burn' : `${Math.round(item.days)} d`}</strong></td><td>${item.roles ? item.roles.join(', ') : 'Duty officer'}</td></tr>`).join('');
	};

	window.mountStationTabs(document.getElementById('station-tabs'), render, items, 'stationCode');
	render();
}

initDoA();
