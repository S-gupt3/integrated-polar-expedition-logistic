// js/dashboard.js — PLOROPSIS command center (real data, computed readiness, station-scoped)
console.log('[dashboard.js] parsed & executing');

function operationPhase() {
	const m = new Date().getUTCMonth(); // Antarctic field season: Nov–Mar
	return (m >= 10 || m <= 2) ? 'Summer ops' : 'Winter ops';
}

function nextReview() {
	const d = new Date();
	const add = ((8 - d.getUTCDay()) % 7) || 7; // next Monday UTC
	d.setUTCDate(d.getUTCDate() + add);
	return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function refreshHeaderDate() {
	const stamp = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	document.querySelectorAll('.header-meta *').forEach((el) => {
		if (el.children.length) return;
		if (/\d{1,2} [A-Z][a-z]{2} \d{4}/.test(el.textContent)) {
			el.textContent = el.textContent.replace(/\d{1,2} [A-Z][a-z]{2} \d{4}/, stamp);
		}
	});
}

function updateHero(scopeName, t) {
	// Readiness = 55% fleet operational + 45% stock health − 2% per open alert (cap 25%)
	const penalty = Math.min(0.25, t.alertCount * 0.02);
	const readiness = Math.max(0, Math.min(100, Math.round((0.55 * t.opPct + 0.45 * t.stockHealth - penalty) * 100)));

	const num = document.querySelector('.readiness-number');
	if (num) {
		const node = num.firstChild;
		if (node && node.nodeType === 3) node.nodeValue = String(readiness);
		num.title = 'Readiness = 0.55×fleet operational + 0.45×stock health − 2% per open alert (cap 25%)';
	}

	const bar = document.querySelector('.readiness-bar i, .hero-status [class*="bar"] i, .hero-status progress');
	if (bar) {
		if (bar.tagName === 'PROGRESS') bar.value = readiness;
		else bar.style.width = readiness + '%';
	}

	const caption = document.querySelector('.hero-status p');
	if (caption) caption.textContent = `${t.operationalAssets}/${t.totalAssets} assets operational · ${t.criticalCount} critical stock lines · ${t.alertCount} open alerts`;

	document.querySelectorAll('.hero-facts > div, .hero-facts > section').forEach((cell) => {
		const span = cell.querySelector('span');
		const value = cell.querySelector('strong');
		if (!span || !value) return;
		const label = span.textContent.toLowerCase();
		if (label.includes('station')) value.textContent = scopeName;
		else if (label.includes('phase')) value.textContent = operationPhase();
		else if (label.includes('review')) value.textContent = nextReview();
	});
}

function injectScopeBar(scope, assetCount, linkOk) {
	const NAMES = { MTR: 'Maitri', BHR: 'Bharati', HDR: 'Himadri' };
	if (document.getElementById('scope-chip')) return;

	let host = document.querySelector('.header-meta');
	if (!host) {
		const header = document.querySelector('.page-header');
		if (!header) return;
		host = document.createElement('div');
		host.className = 'header-meta';
		header.appendChild(host);
	}

	const chip = document.createElement('div');
	chip.id = 'scope-chip';

	if (!linkOk) {
		chip.className = 'scope-chip down';
		chip.innerHTML = `<i class="scope-led"></i><span>Link down</span><b>backend unreachable</b>`;
	} else if (scope === 'all') {
		chip.className = 'scope-chip all';
		chip.innerHTML = `<i class="scope-led"></i><span>All stations</span><a href="index.html" title="Pick a station">pick</a>`;
	} else {
		chip.className = 'scope-chip';
		chip.innerHTML =
			`<i class="scope-led"></i>` +
			`<span>${NAMES[scope] || scope}</span>` +
			`<b>${assetCount} assets</b>` +
			`<a href="dashboard.html?station=all" title="Clear station scope">all</a>`;
	}

	const toggle = host.querySelector('#theme-toggle');
	if (toggle
