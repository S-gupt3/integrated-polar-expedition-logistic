async function initDashboard() {
  try {
    // Fetch real data from backend
    let [assets, inventory, analytics] = await Promise.all([getAssets(), getInventory(), getAnalytics()]);
    
    // Station scope: URL param wins, then remembered choice
    const scopeCode = (typeof window.currentStation === 'function')
      ? window.currentStation()
      : (new URLSearchParams(window.location.search).get('station') || 'all');

    if (scopeCode !== 'all') {
      assets = assets.filter((a) => a.stationCode === scopeCode);
      inventory = inventory.filter((i) => i.stationCode === scopeCode);
      injectScopeBar(scopeCode);
    }

    const totalAssets = assets.length;
    const operationalAssets = assets.filter(a => a.status === 'Operational').length;
    const criticalStockCount = inventory.filter(item => item.status === 'Critical').length;
    
    // Alerts = Critical/Low stock items + Damaged/Missing/Maintenance assets
    const alertCount = inventory.filter(i => i.status === 'Critical' || i.status === 'Low').length + 
                       assets.filter(a => a.status === 'Damaged' || a.status === 'Missing' || a.status === 'Maintenance').length;

    document.getElementById('kpi-total-assets').textContent = totalAssets.toLocaleString();
    document.getElementById('kpi-operational').textContent = operationalAssets.toLocaleString();
    document.getElementById('kpi-critical-stock').textContent = criticalStockCount.toLocaleString();
    document.getElementById('kpi-alerts').textContent = alertCount.toLocaleString();

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

    // Real Asset Health Chart Data
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

    if (window.consumptionChartInstance) window.consumptionChartInstance.destroy();
    window.consumptionChartInstance = new Chart(document.getElementById('consumptionChart'), {
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

  } catch (error) {
    console.error("Dashboard initialization failed:", error);
    document.getElementById('kpi-total-assets').textContent = "Error";
  }
}

function injectScopeBar(scope) {
  const NAMES = { MTR: 'Maitri', BHR: 'Bharati', HDR: 'Himadri' };
  const header = document.querySelector('.page-header');
  if (!header || document.getElementById('scope-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'scope-bar';
  bar.innerHTML =
    `Scoped to <strong>${NAMES[scope] || scope}</strong>` +
    ` &nbsp;·&nbsp; <a href="dashboard.html?station=all">show all stations</a>`;
  header.appendChild(bar);
}

initDashboard();
