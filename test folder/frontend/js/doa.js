// js/doa.js — populates doa.html (Days of autonomy)
// Contract: binds to #doa-headline, #doa-limiter, #doa-critical, #doa-tracked,
//           #doa-gauges, #runwayChart, #burnChart, #doa-tbody, and uses
//           mountStationTabs() for the station filter.

const pick = (o, keys) => { for (const k of keys) { const v = o && o[k]; if (v !== undefined && v !== null && v !== '') return v; } return undefined; };
const num  = (o, keys) => { const v = pick(o, keys); return v === undefined ? null : Number(v); };

function normalise(rows) {
    return (rows || []).map((r) => {
        const qty  = num(r, ['quantity', 'current_quantity', 'on_hand', 'qty']);
        const rate = num(r, ['daily_rate', 'consumption_rate', 'avg_daily_use', 'rate']);
        let doa    = num(r, ['days_remaining', 'days_of_availability', 'doa', 'days_left']);
        if ((doa === null || !isFinite(doa)) && qty !== null && rate) {
            doa = rate > 0 ? qty / rate : Infinity;
        }
        const stationRaw = pick(r, ['stationCode', 'station_id', 'station']);
        return {
            id:      pick(r, ['id', 'inventory_id']),
            item:    pick(r, ['item', 'item_name', 'name']) || 'Item',
            unit:    pick(r, ['unit']) || '',
            stationCode: String(stationRaw || 'ALL'),
            station: pick(r, ['station']) || String(stationRaw || '--'),
            qty, rate, doa,
            role: pick(r, ['responsible_role', 'role']) || 'Logistics'
        };
    }).filter((r) => r.qty !== null);
}

const tone = (d) => (!isFinite(d) || d > 14 ? 'good' : d >= 7 ? 'warning' : 'critical');
const fmt  = (d) => (!isFinite(d) ? 'no usage' : d >= 999 ? '999+ d' : Math.round(d) + ' d');
const COLOR = { good: '#43c66e', warning: '#f2bd4b', critical: '#e5484d' };

// Dial SVG — arc length + centre number = days of supply left, full scale 30 d
function gaugeCard(title, sub, d, cls = '') {
    const C   = 2 * Math.PI * 52;
    const pct = !isFinite(d) ? 1 : Math.max(0, Math.min(1, d / 30));
    return `<div class="card gauge ${cls}" title="${title}: ${fmt(d)} of supply left">
        <svg viewBox="0 0 120 120">
            <circle class="gauge-track" cx="60" cy="60" r="52"></circle>
            <circle class="gauge-value ${tone(d)}" cx="60" cy="60" r="52"
                stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}"
                transform="rotate(-90 60 60)"></circle>
        </svg>
        <div class="gauge-copy"><strong>${fmt(d)}</strong><span>${title}</span></div>
        <footer><h3>${sub}</h3><p>days of supply left</p></footer>
    </div>`;
}

function stationGauges(rows) {
    return ['MTR', 'BHR', 'HDR'].map((code) => {
        const list = rows.filter((r) => r.stationCode === code && isFinite(r.doa));
        if (!list.length) return gaugeCard(code, 'no consuming lines', Infinity);
        const worst = list.slice().sort((a, b) => a.doa - b.doa)[0];
        return gaugeCard(code, worst.item, worst.doa);
    }).join('');
}

function fleetGauge(rows) {
    const finite = rows.filter((r) => isFinite(r.doa));
    if (!finite.length) return gaugeCard('Fleet', 'no consuming lines', Infinity);
    const worst = finite.slice().sort((a, b) => a.doa - b.doa)[0];
    return gaugeCard('Fleet', worst.item, worst.doa);
}

async function render() {
    const tbody = document.getElementById('doa-tbody');
    const gauges = document.getElementById('doa-gauges');
    if (!tbody && !gauges) return;  // not the doa page

    let rows;
    try {
        rows = normalise(await getInventoryWithDoA());
    } catch (error) {
        if (gauges) gauges.innerHTML = `<div class="card loading tone-critical">inventory-doa failed: ${error.message}</div>`;
        if (tbody)  tbody.innerHTML  = `<tr><td colspan="6" class="loading tone-critical">Backend unreachable</td></tr>`;
        return;
    }

    const scope = (typeof window.currentStation === 'function') ? window.currentStation() : 'all';
    const visible = scope === 'all' ? rows : rows.filter((r) => r.stationCode === scope);

    // --- KPIs ---
    const finite   = visible.filter((r) => isFinite(r.doa));
    const under14  = finite.filter((r) => r.doa < 14).length;
    const consuming = rows.filter((r) => r.rate !== null && r.rate > 0).length;
    const worst    = finite.length ? finite.slice().sort((a, b) => a.doa - b.doa)[0] : null;

    const set = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
    set('doa-headline', worst ? fmt(worst.doa) : '--');
    set('doa-limiter',  worst ? `${worst.item} · ${worst.station}` : 'No consumable limits current stock');
    set('doa-critical', under14.toLocaleString());
    set('doa-tracked',  consuming.toLocaleString());

    // --- Gauges (always fleet-wide, scoped list drives KPIs only) ---
    if (gauges) {
        gauges.innerHTML = stationGauges(rows) + fleetGauge(rows);
    }

    // --- Shortest runway chart ---
    const runwayCanvas = document.getElementById('runwayChart');
    if (window.Chart && runwayCanvas) {
        if (window.runwayChartInstance) window.runwayChartInstance.destroy();
        const top = finite.slice().sort((a, b) => a.doa - b.doa).slice(0, 10);
        window.runwayChartInstance = new Chart(runwayCanvas, {
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
                    x: { title: { display: true, text: 'days of supply left' }, grid: { color: 'rgba(128,128,128,.15)' } },
                    y: { ticks: { autoSkip: false } }
                }
            }
        });
    }

    // --- Daily burn chart ---
    const burnCanvas = document.getElementById('burnChart');
    if (window.Chart && burnCanvas) {
        if (window.burnChartInstance) window.burnChartInstance.destroy();
        const byStation = {};
        rows.forEach((r) => {
            if (r.rate === null || !isFinite(r.rate)) return;
            byStation[r.stationCode] = (byStation[r.stationCode] || 0) + r.rate;
        });
        const labels = Object.keys(byStation);
        window.burnChartInstance = new Chart(burnCanvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data: labels.map((k) => Math.round(byStation[k] * 10) / 10),
                    backgroundColor: '#62b9e8',
                    borderWidth: 0
                }]
            },
            options: {
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { title: { display: true, text: 'units / day' }, grid: { color: 'rgba(128,128,128,.15)' } }
                }
            }
        });
    }

    // --- Ledger table (scoped, lowest DoA first) ---
    const list = visible.slice().sort((a, b) => {
        if (!isFinite(a.doa) && !isFinite(b.doa)) return 0;
        if (!isFinite(a.doa)) return 1;
        if (!isFinite(b.doa)) return -1;
        return a.doa - b.doa;
    });

    tbody.innerHTML = list.length ? list.map((r) => `
        <tr>
            <td><strong>${r.item}</strong><span class="muted"> · ${r.unit || '--'}</span></td>
            <td>${r.station}</td>
            <td>${r.qty !== null ? r.qty.toLocaleString() : '--'}</td>
            <td>${r.rate !== null && isFinite(r.rate) ? r.rate.toFixed(2) + ' /day' : '--'}</td>
            <td class="tone-${tone(r.doa)}">${fmt(r.doa)}</td>
            <td>${r.role}</td>
        </tr>
    `).join('') : '<tr><td colspan="6" class="loading">No consumables in this scope</td></tr>';
}

async function initDoa() {
    // Let layout.js build the station-tabs host first
    await Promise.resolve();
    const host = document.getElementById('station-tabs');
    let rows = [];
    try { rows = normalise(await getInventoryWithDoA()); } catch (e) { rows = []; }

    if (host && typeof window.mountStationTabs === 'function') {
        window.mountStationTabs(host, render, rows, 'stationCode');
    } else {
        render();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDoa);
} else {
    initDoa();
}
