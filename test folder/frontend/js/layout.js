const currentPage = document.body.dataset.page || 'dashboard';
const STATIONS = [{ code: 'all', name: 'All stations' }, { code: 'MTR', name: 'Maitri' }, { code: 'BHR', name: 'Bharati' }, { code: 'HDR', name: 'Himadri' }];
const navItems = [{ href: 'index.html', page: 'home', label: 'Stations' }, { href: 'dashboard.html', page: 'dashboard', label: 'Dashboard' }, { href: 'assets.html', page: 'assets', label: 'Assets' }, { href: 'inventory.html', page: 'inventory', label: 'Inventory' }, { href: 'analytics.html', page: 'analytics', label: 'Analytics' }, { href: 'drift-mapping.html', page: 'drift', label: 'Drift mapping' }];

let stationCode = localStorage.getItem('ploropsis-station') || 'all';
const stationName = (code) => (STATIONS.find((entry) => entry.code === code) || STATIONS[0]).name;

window.currentStation = () => stationCode;

document.getElementById('app-shell').innerHTML = `<aside class="sidebar"><div class="brand"><span class="brand-mark"><img src="assets/icons/android-chrome-192x192.png" alt="PLOROPSIS"></span><div class="brand-copy"><strong>Ploropsis</strong><small>NCPOR command</small></div><button class="rail-collapse" id="rail-collapse" type="button" aria-label="Collapse navigation">&laquo;</button></div><div class="workspace"><span>Active operation</span><strong>ISEA-46</strong><em id="workspace-station">${stationName(stationCode)}</em></div><p class="nav-label">Modules</p><nav>${navItems.map((item) => `<a class="nav-item ${currentPage === item.page ? 'active' : ''}" href="${item.href}"><i aria-hidden="true"></i><span>${item.label}</span></a>`).join('')}</nav><div class="sidebar-footer"><span>Expedition manager</span><small>Local station link</small></div></aside><div class="sidebar-scrim"></div><button class="mobile-toggle" aria-label="Open menu">Menu</button>`;

if (localStorage.getItem('ploropsis-rail') === 'collapsed') document.body.classList.add('rail-collapsed');

document.getElementById('rail-collapse').addEventListener('click', () => {
	const collapsed = document.body.classList.toggle('rail-collapsed');
	localStorage.setItem('ploropsis-rail', collapsed ? 'collapsed' : 'open');
});

window.mountStationTabs = (host, onChange, rows, key) => {
	if (!host) return;
	const counts = {};
	(rows || []).forEach((row) => { counts[row[key]] = (counts[row[key]] || 0) + 1; });
	host.className = 'station-tabs';
	host.innerHTML = STATIONS.map((station) => {
		const count = station.code === 'all' ? (rows || []).length : (counts[station.code] || 0);
		return `<button type="button" class="station-tab ${station.code === stationCode ? 'active' : ''}" data-code="${station.code}">${station.name}<b>${count}</b></button>`;
	}).join('');
	host.querySelectorAll('.station-tab').forEach((tab) => tab.addEventListener('click', () => {
		stationCode = tab.dataset.code;
		localStorage.setItem('ploropsis-station', stationCode);
		host.querySelectorAll('.station-tab').forEach((other) => other.classList.toggle('active', other === tab));
		const label = document.getElementById('workspace-station');
		if (label) label.textContent = stationName(stationCode);
		onChange();
	}));
};

const pageContent = document.querySelector('.page-content');
const themeToggleMarkup = '<button class="theme-toggle" id="theme-toggle" type="button" aria-pressed="false">Survival mode</button>';
const headerMeta = document.querySelector('.header-meta');
if (headerMeta) headerMeta.insertAdjacentHTML('beforeend', themeToggleMarkup);
else pageContent.querySelector('.page-header').insertAdjacentHTML('beforeend', `<div class="header-meta">${themeToggleMarkup}</div>`);

const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('ploropsis-theme') || 'normal';
document.documentElement.dataset.theme = savedTheme;
document.body.dataset.theme = savedTheme;
themeToggle.textContent = savedTheme === 'emergency' ? 'Command mode' : 'Survival mode';
themeToggle.setAttribute('aria-pressed', String(savedTheme === 'emergency'));

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const survivalMode = () => document.body.dataset.theme === 'emergency';
const motionAllowed = () => !reducedMotion() && !survivalMode();

if (window.Chart) {
	const styles = getComputedStyle(document.documentElement);
	window.Chart.defaults.color = styles.getPropertyValue('--text-3').trim();
	window.Chart.defaults.borderColor = styles.getPropertyValue('--border').trim();
	window.Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
	window.Chart.defaults.font.size = 11;
	window.Chart.defaults.animation.duration = motionAllowed() ? 700 : 0;
}

function loadMotionLibrary(src, globalName) {
	if (window[globalName]) return Promise.resolve();
	return new Promise((resolve) => {
		const script = document.createElement('script');
		script.src = src;
		script.onload = resolve;
		script.onerror = resolve;
		document.head.appendChild(script);
	});
}

function countUp(host) {
	if (!window.anime || !motionAllowed() || host.dataset.counted === '1') return;
	const node = host.firstChild;
	if (!node || node.nodeType !== 3) return;
	const raw = node.nodeValue.trim();
	const plain = raw.replace(/,/g, '');
	if (!/^\d+(\.\d+)?$/.test(plain)) return;
	host.dataset.counted = '1';
	const decimals = (plain.split('.')[1] || '').length;
	const state = { value: 0 };
	window.anime({ targets: state, value: Number(plain), duration: 900, easing: 'easeOutExpo', update: () => { node.nodeValue = state.value.toFixed(decimals); }, complete: () => { node.nodeValue = raw; } });
}

function watchCounters() {
	const selector = '.kpi strong, .inventory-summary strong, .readiness-number';
	document.querySelectorAll(selector).forEach(countUp);
	new MutationObserver((records) => records.forEach((record) => {
		const host = record.target.nodeType === 3 ? record.target.parentElement : record.target;
		if (host && host.matches && host.matches(selector)) countUp(host);
	})).observe(document.body, { childList: true, characterData: true, subtree: true });
}

function revealSections() {
	const cards = document.querySelectorAll('.card:not([data-revealed])');
	if (!cards.length) return;
	if (!motionAllowed() || !window.Motion?.animate) { cards.forEach((card) => { card.dataset.revealed = '1'; }); return; }
	cards.forEach((card, index) => {
		card.dataset.revealed = '1';
		const run = () => window.Motion.animate(card, { opacity: [0, 1], transform: ['translateY(12px)', 'none'] }, { duration: .45, delay: Math.min(index, 5) * .045, easing: [.16, 1, .3, 1] });
		if (window.Motion.inView) window.Motion.inView(card, run, { margin: '0px 0px -10% 0px' });
		else run();
	});
}

function animateShell() {
	if (!motionAllowed() || !window.Motion?.animate) return;
	const header = document.querySelector('.page-header');
	if (header) window.Motion.animate(header, { opacity: [0, 1], transform: ['translateY(-8px)', 'none'] }, { duration: .4, easing: [.16, 1, .3, 1] });
	window.Motion.animate('.nav-item', { opacity: [0, 1], transform: ['translateX(-10px)', 'none'] }, { duration: .35, delay: window.Motion.stagger ? window.Motion.stagger(.035) : .1, easing: [.16, 1, .3, 1] });
}

function animateRows() {
	if (!window.anime || !motionAllowed()) return;
	const rows = document.querySelectorAll('tbody tr:not([data-shown])');
	if (!rows.length || rows[0].querySelector('.loading')) return;
	rows.forEach((row) => { row.dataset.shown = '1'; });
	window.anime({ targets: rows, opacity: [0, 1], translateY: [6, 0], delay: window.anime.stagger(18), duration: 340, easing: 'easeOutCubic' });
}

function bootAnimations() { animateShell(); revealSections(); watchCounters(); animateRows(); }

Promise.all([
	loadMotionLibrary('https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js', 'anime'),
	loadMotionLibrary('https://cdn.jsdelivr.net/npm/motion@10.16.2/dist/motion.js', 'Motion'),
]).then(() => {
	bootAnimations();
	new MutationObserver(() => { animateRows(); revealSections(); }).observe(document.body, { childList: true, subtree: true });
});

themeToggle.addEventListener('click', () => {
	const nextTheme = document.documentElement.dataset.theme === 'emergency' ? 'normal' : 'emergency';
	document.documentElement.dataset.theme = nextTheme;
	document.body.dataset.theme = nextTheme;
	localStorage.setItem('ploropsis-theme', nextTheme);
	themeToggle.textContent = nextTheme === 'emergency' ? 'Command mode' : 'Survival mode';
	themeToggle.setAttribute('aria-pressed', String(nextTheme === 'emergency'));
	if (nextTheme === 'normal') bootAnimations();
});

const sidebar = document.querySelector('.sidebar');
document.querySelector('.mobile-toggle').addEventListener('click', () => sidebar.classList.toggle('open'));
document.querySelector('.sidebar-scrim').addEventListener('click', () => sidebar.classList.remove('open'));

/* ============ Animated rail: labels + sliding indicator ============ */
(function () {
	const nav = document.querySelector('.sidebar nav');
	if (!nav) return;

	// Feed the CSS tooltips; kill any native title tooltips
	nav.querySelectorAll('.nav-item').forEach((item) => {
		const label = item.querySelector('span');
		item.dataset.label = label ? label.textContent.trim() : item.textContent.trim();
		item.removeAttribute('title');
	});

	// Glowing pill that slides to hovered / active tile
	const indicator = document.createElement('span');
	indicator.className = 'rail-indicator';
	nav.appendChild(indicator);

	const active = nav.querySelector('.nav-item.active');

	const place = (el, instant) => {
		if (!el) return;
		if (instant) indicator.style.transition = 'none';
		indicator.style.height = el.offsetHeight + 'px';
		indicator.style.transform = `translateY(${el.offsetTop}px)`;
		if (instant) requestAnimationFrame(() => { indicator.style.transition = ''; });
	};

	nav.addEventListener('mouseover', (e) => {
		const item = e.target.closest('.nav-item');
		if (item) place(item);
	});
	nav.addEventListener('mouseleave', () => place(active));

	const refresh = (instant) => place(active, instant);
	window.addEventListener('resize', () => refresh(true));

	// Re-seat the pill after the rail expands/collapses (body class toggles)
	new MutationObserver(() => {
		setTimeout(() => refresh(true), 60);
		setTimeout(() => refresh(true), 340);
	}).observe(document.body, { attributes: true, attributeFilter: ['class'] });

	refresh(true);
	setTimeout(() => refresh(true), 300);
})();
