const currentPage = document.body.dataset.page || 'dashboard';
const navItems = [{ href: 'index.html', page: 'dashboard', label: 'Dashboard' }, { href: 'assets.html', page: 'assets', label: 'Assets' }, { href: 'inventory.html', page: 'inventory', label: 'Inventory' }, { href: 'analytics.html', page: 'analytics', label: 'Analytics' }, { href: '../../drift_mapping/index.html', page: 'drift', label: 'Drift mapping' }];
document.getElementById('app-shell').innerHTML = `<aside class="sidebar"><div class="brand"><span class="brand-mark">*</span><div><strong>ploropsis</strong><small>NCPOR COMMAND</small></div></div><div class="workspace"><div><span>ACTIVE OPERATION</span><strong>ISEA-46 / Maitri</strong></div><b>></b></div><p class="nav-label">Command center</p><nav>${navItems.map((item) => `<a class="nav-item ${currentPage === item.page ? 'active' : ''}" href="${item.href}">${item.label}</a>`).join('')}</nav><div class="sidebar-footer">Expedition manager / Expedition manager</div></aside><button class="mobile-toggle" aria-label="Open menu">Menu</button>`;
const themeHost = document.querySelector('.header-meta') || document.querySelector('.page-header');
themeHost.insertAdjacentHTML('beforeend', '<button class="theme-toggle" id="theme-toggle" type="button" aria-pressed="false">Emergency mode</button>');
const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('ploropsis-theme') || 'normal';
document.documentElement.dataset.theme = savedTheme;
document.body.dataset.theme = savedTheme;
themeToggle.textContent = savedTheme === 'emergency' ? 'Normal mode' : 'Emergency mode';
themeToggle.setAttribute('aria-pressed', String(savedTheme === 'emergency'));

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

function setupClickMotion() {
	if (document.body.dataset.theme !== 'normal' || window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.dataset.clickMotionReady === 'true') return;
	document.body.dataset.clickMotionReady = 'true';
	document.addEventListener('pointerdown', (event) => {
		if (document.body.dataset.theme !== 'normal') return;
		const target = event.target.closest('button, a, input, select, textarea, .card');
		const ripple = document.createElement('span');
		ripple.className = 'click-ripple';
		ripple.style.left = `${event.clientX}px`;
		ripple.style.top = `${event.clientY}px`;
		document.body.appendChild(ripple);
		if (window.anime) window.anime({ targets: ripple, scale: [1, 3], opacity: [0.65, 0], duration: 280, easing: 'easeOutQuad', complete: () => ripple.remove() });
		else setTimeout(() => ripple.remove(), 280);
		if (target && window.Motion?.animate) window.Motion.animate(target, { scale: [1, 0.97, 1] }, { duration: 0.22, easing: 'ease-out' });
	});
}

function setupNormalMotion() {
	const motionCard = document.querySelector('.drift-launch');
	if (document.body.dataset.theme !== 'normal') return;
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	if (window.anime) {
		const cards = document.querySelectorAll('.card:not([data-anime-ready])');
		window.anime({ targets: cards, opacity: [0, 1], translateY: [18, 0], delay: window.anime.stagger(70), duration: 560, easing: 'easeOutCubic', begin: () => cards.forEach((card) => card.dataset.animeReady = 'true') });
	}
	if (!motionCard || motionCard.dataset.motionReady === 'true') return;
	motionCard.classList.add('motion-card', 'motion-enter');
	motionCard.dataset.motionReady = 'true';
	let pointerId = null;
	let startX = 0;
	let startY = 0;

	const release = () => {
		if (pointerId === null) return;
		motionCard.releasePointerCapture(pointerId);
		pointerId = null;
		motionCard.classList.remove('motion-dragging');
		motionCard.classList.add('motion-settled');
		if (window.anime) {
			window.anime({ targets: motionCard, translateX: 0, translateY: 0, rotate: 0, scale: 1, duration: 420, easing: 'easeOutElastic(1, .65)' });
		} else {
			motionCard.style.transform = '';
		}
	};
	motionCard.addEventListener('pointerdown', (event) => {
		if (document.body.dataset.theme !== 'normal' || event.target.closest('a,button')) return;
		pointerId = event.pointerId;
		startX = event.clientX;
		startY = event.clientY;
		motionCard.setPointerCapture(pointerId);
		motionCard.classList.add('motion-dragging');
	});
	motionCard.addEventListener('pointermove', (event) => {
		if (event.pointerId !== pointerId || document.body.dataset.theme !== 'normal') return;
		const x = Math.max(-12, Math.min(12, event.clientX - startX));
		const y = Math.max(-8, Math.min(8, event.clientY - startY));
		motionCard.style.transform = `translate(${x}px, ${y}px) rotate(${x / 12}deg)`;
	});
	motionCard.addEventListener('pointerup', release);
	motionCard.addEventListener('pointercancel', release);
}
Promise.all([
	loadMotionLibrary('https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js', 'anime'),
	loadMotionLibrary('https://cdn.jsdelivr.net/npm/motion@10.16.2/dist/motion.js', 'Motion'),
]).then(() => {
	setupNormalMotion();
	setupClickMotion();
});
themeToggle.addEventListener('click', () => {
	const nextTheme = document.documentElement.dataset.theme === 'emergency' ? 'normal' : 'emergency';
	document.documentElement.dataset.theme = nextTheme;
	document.body.dataset.theme = nextTheme;
	localStorage.setItem('ploropsis-theme', nextTheme);
	themeToggle.textContent = nextTheme === 'emergency' ? 'Normal mode' : 'Emergency mode';
	themeToggle.setAttribute('aria-pressed', String(nextTheme === 'emergency'));
	if (nextTheme === 'normal') {
		setupNormalMotion();
		setupClickMotion();
	}
});
document.querySelector('.mobile-toggle').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
