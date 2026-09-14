async function initDashboard() {
  const [assets, inventory, analytics] = await Promise.all([getAssets(), getInventory(), getAnalytics()]);
  document.getElementById('kpi-total-assets').textContent = '1,248';
  document.getElementById('kpi-operational').textContent = '1,102';
  document.getElementById('kpi-critical-stock').textContent = inventory.filter((item) => item.status === 'Critical').length;
  document.getElementById('kpi-alerts').textContent = '4';
  const alerts = [{ level: 'red', title: 'Medical kits below critical threshold', meta: 'Bharati / 12 kits remaining' }, { level: 'yellow', title: 'Generator GEN-104 due for inspection', meta: 'Maitri / scheduled in 7 days' }, { level: 'yellow', title: 'Shipment SH-204 is delayed', meta: 'Supply route / 18 hours behind plan' }, { level: 'green', title: 'Fuel delivery received', meta: 'Maitri / resolved 2 hours ago' }];
  document.getElementById('alert-list').innerHTML = alerts.map((alert) => `<li><span class="alert-icon ${alert.level}">${iconForStatus(alert.level === 'green' ? 'resolved' : 'alert')}</span><div class="alert-copy"><strong>${alert.title}</strong><small>${alert.meta}</small></div></li>`).join('');
  const emergency = document.body.dataset.theme === 'emergency';
  const chart = emergency ? { blue: '#fff200', gold: '#ffb800', green: '#ff6a00', red: '#ff3b00', surface: '#4a1000', grid: '#ff5a00' } : { blue: '#62b9e8', gold: '#f2bd4b', green: '#43c66e', red: '#d99200', surface: '#102f46', grid: '#2e6385' };
  new Chart(document.getElementById('assetHealthChart'), { type: 'doughnut', data: { labels: ['Operational', 'Maintenance', 'Damaged', 'Missing'], datasets: [{ data: [82, 9, 5, 2], backgroundColor: [chart.blue, chart.gold, chart.green, chart.red], borderWidth: 0 }] }, options: { cutout: '68%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, color: chart.gold, font: { size: 10 } } } } } });
  new Chart(document.getElementById('consumptionChart'), { type: 'line', data: { labels: analytics.consumption.map((point) => point.day), datasets: [{ data: analytics.consumption.map((point) => point.value), borderColor: chart.blue, backgroundColor: chart.surface, fill: true, tension: .35, pointRadius: 2 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: chart.gold }, grid: { display: false } }, y: { ticks: { color: chart.gold }, grid: { color: chart.grid } } } } });
}
initDashboard();
