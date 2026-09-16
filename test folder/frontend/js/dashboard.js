// js/dashboard.js — PLOROPSIS command center (real data, computed readiness, station-scoped)

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
	// Readiness = 55% fleet operational + 45% stock health − 2% per open alert (capped 25%)
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
	if (caption) {
		caption.textContent = `${t.operationalAssets}/${t.totalAssets} assets operational · ${t.criticalCount} critical stock lines · ${t.alertCount} open alerts`;
	}

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

async function initDashboard() {
  try {
    // Fetch real data from backend
    let [assets, inventory, analytics] = await Promise.all([getAssets(), getInventory(), getAnalytics()]);

    // ---- Resolve station scope: URL param wins, then stored choice, then all ----
    const urlParam = new URLSearchParams(window.location.search).get('station');
    let stored = localStorage.getItem('ploropsis-station');
    let scopeCode;

    if (urlParam === 'all') {
      localStorage.removeItem('ploropsis-station');
      stored = null;
      scopeCode = 'all';
    } else if (urlParam) {
      scopeCode = urlParam;
      localStorage.setItem('ploropsis-station', urlParam);
      stored = urlParam;
    } else {
      scopeCode = stored || 'all';
    }

    const NAMES = { MTR: 'Maitri', BHR: 'Bharati', HDR: 'Himadri' };
    const scopeName = scopeCode === 'all' ? 'All stations' : (NAMES[scopeCode] || scopeCode);

    if (scopeCode !== 'all') {
      assets = assets.filter((a) => a.stationCode === scopeCode);
      inventory = inventory.filter((i) => i.stationCode === scopeCode);
    }

    // Integrated scope chip in the header row
    injectScopeBar(scopeCode, assets.length);

    // ---- KPIs ----
    const totalAssets = assets.length;
    const operationalAssets = assets.filter(a => a.status === 'Operational').length;
    const criticalCount = inventory.filter(item => item.status === 'Critical').length;
    const lowCount = inventory.filter(item => item.status === 'Low').length;

    const alertCount = (criticalCount + lowCount) +
                       assets.filter(a => a.status === 'Damaged' || a.status === 'Missing' || a.status === 'Maintenance').length;

    document.getElementById('kpi-total-assets').textContent = totalAssets.toLocaleString();
    document.getElementById('kpi-operational').textContent = operationalAssets.toLocaleString();
    document.getElementById('kpi-critical-stock').textContent = criticalCount.toLocaleString();
    document.getElementById('kpi-alerts').textContent = alertCount.toLocaleString();

    // ---- Honest sub-labels (no fake deltas) ----
    const smalls = document.querySelectorAll('.kpi small');
    const opPct = totalAssets ? operationalAssets / totalAssets : 0;
    const stockHealth = inventory.length ? inventory.filter(i => i.quantity > i.threshold).length / inventory.length : 0;
    if (smalls[0]) smalls[0].textContent = scopeCode === 'all' ? 'across 3 stations' : `${scopeName} fleet`;
    if (smalls[1]) smalls[1].textContent = `${Math.round(opPct * 100)}% of total fleet`;

    // ---- Computed readiness hero ----
    updateHero(scopeName, { totalAssets, operationalAssets, criticalCount, alertCount, opPct, stockHealth });

    // ---- Live header date + functional subtitle ----
    refreshHeaderDate();
    const now = new Date();
    const hhmm = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
    const sub = document.querySelector('.page-subtitle');
    if (sub) sub.textContent = `${totalAssets} assets · ${inventory.length} stock lines · scope ${scopeName.toLowerCase()} · synced ${hhmm} UTC`;

    // ---- Dynamic alert feed ----
    const realAlerts = [];

    inventory.filter(item => item.status === 'Critical' || item.status === 'Low').forEach(item => {
      realAlerts.push({
        level: item.status === 'Critical' ? 'red' : 'yellow',
        title: `${item.item} stock is ${item.status.toLowerCase()}`,
        meta: `${item.station} / ${item.quantity} ${item.unit} remaining (Threshold: ${item.threshold})`
      });
    });

    assets.filter(a => a.status === 'Maintenance' || a.status === 'Damaged' || a.status === 'Missing').forEach(a => {
      realAlerts.push({
        level: a.status === 'Damaged' || a.status === 'Missing' ? 'red' : 'yellow',
        title: `${a.name} requires attention`,
        meta: `${a.station} / Status: ${a.status}`
      });
    });

    const alertListEl = document.getElementById('alert-list');
    alertListEl.innerHTML = realAlerts.length ?
      realAlerts.slice(0, 5).map(alert =>
        `<li>
          <span class="alert-icon ${alert.level}"></span>
          <div class="alert-copy">
            <strong>${alert.title}</strong>
            <small>${alert.meta}</small>
          </div>
        </li>`
      ).join('') :
      '<li class="loading">No critical alerts at this time</li>';

    // ---- Asset health doughnut (real counts) ----
    const healthCounts = {
      Operational: assets.filter(a => a.status === 'Operational').length,
      Maintenance: assets.filter(a => a.status === 'Maintenance').length,
      Damaged: assets.filter(a => a.status === 'Damaged').length,
      Missing: assets.filter(a => a.status === 'Missing').length
    };

    const emergency = document.body.dataset.theme === 'emergency';
    const chartColors = emergency
      ? { blue: '#fff200', gold: '#ffb800', green: '#ff6a00', red: '#ff3b00', surface: '#4a1000', grid: '#ff5a00' }
      : { blue: '#62b9e8', gold: '#f2bd4b', green: '#43c66e', red: '#d99200', surface: '#102f46', grid: '#2e6385' };

    if (window.assetHealthChartInstance) window.assetHealthChartInstance.destroy();
    window.assetHealthChartInstance = new Chart(document.getElementById('assetHealthChart'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(healthCounts),
        datasets: [{
          data: Object.values(healthCounts),
          backgroundColor: [chartColors.blue, chartColors.gold, chartColors.green, chartColors.red],
          borderWidth: 0
        }]
      },
      options: {
        cutout: '68%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 8, color: chartColors.gold, font: { size: 10 } } }
        }
      }
    });

    // ---- Consumption trend (live logs only; honest empty state) ----
    const consumCanvas = document.getElementById('consumptionChart');
    if (window.consumptionChartInstance) window.consumptionChartInstance.destroy();

    if (analytics.consumption && analytics.consumption.length) {
      if (consumCanvas) consumCanvas.style.display = '';
      window.consumptionChartInstance = new Chart(consumCanvas, {
        type: 'line',
        data: {
          labels: analytics.consumption.map(point => point.day),
          datasets: [{
            data: analytics.consumption.map(point => point.value),
            borderColor: chartColors.blue,
            backgroundColor: chartColors.surface,
            fill: true,
            tension: 0.35,
            pointRadius: 2
          }]
        },
        options: {
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: chartColors.gold }, grid: { display: false } },
            y: { ticks: { color: chartColors.gold }, grid: { color: chartColors.grid } }
          }
        }
      });
    } else if (consumCanvas) {
      consumCanvas.style.display = 'none';
      const panel = consumCanvas.closest('.panel-card, .card');
      const note = panel ? panel.querySelector('p') : null;
      if (note) note.textContent = 'No consumption logs recorded yet.';
    }

  } catch (error) {
    console.error("Dashboard initialization failed:", error);
    document.getElementById('kpi-total-assets').textContent = "Error";
  }
}

function injectScopeBar(scope, assetCount) {
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
  chip.className = 'scope-chip' + (scope === 'all' ? ' all' : '');

  if (scope === 'all') {
    chip.innerHTML =
      `<i class="scope-led"></i>` +
      `<span>All stations</span>` +
      `<a href="index.html" title="Pick a station">pick</a>`;
  } else {
    chip.innerHTML =
      `<i class="scope-led"></i>` +
      `<span>${NAMES[scope] || scope}</span>` +
      `<b>${assetCount} assets</b>` +
      `<a href="dashboard.html?station=all" title="Clear station scope">all</a>`;
  }

  const toggle = host.querySelector
