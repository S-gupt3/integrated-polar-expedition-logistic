const STATION_NAMES = { MTR: 'Maitri', BHR: 'Bharati', HDR: 'Himadri' };

const stationSelect = document.getElementById('drift-station');
const latInput = document.getElementById('drift-lat');
const lonInput = document.getElementById('drift-lon');
const daysSlider = document.getElementById('drift-days');
const dayValue = document.getElementById('drift-day-value');
const sourceNote = document.getElementById('drift-source-note');
const playBtn = document.getElementById('drift-play');
const resetBtn = document.getElementById('drift-reset');
const sparkline = document.getElementById('drift-sparkline');

const statStation = document.getElementById('stat-station');
const statGlacier = document.getElementById('stat-glacier');
const statVelocity = document.getElementById('stat-velocity');
const statBearing = document.getElementById('stat-bearing');
const statDays = document.getElementById('stat-days');
const statDisplacement = document.getElementById('stat-displacement');
const statOrigin = document.getElementById('stat-origin');
const statCorrected = document.getElementById('stat-corrected');
const statConfidence = document.getElementById('stat-confidence');

const map = L.map('drift-map', { zoomControl: true }).setView([-70.77, 11.73], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 12,
    minZoom: 2,
}).addTo(map);

const originMarker = L.circleMarker([0, 0], { radius: 6, color: '#e8935a', fillColor: '#e8935a', fillOpacity: 1 }).addTo(map);
const driftMarker = L.circleMarker([0, 0], { radius: 7, color: '#62b9e8', fillColor: '#62b9e8', fillOpacity: 1 }).addTo(map);
const pathLine = L.polyline([], { color: '#62b9e8', weight: 2, dashArray: '4,5' }).addTo(map);
originMarker.bindTooltip('Last logged position');
driftMarker.bindTooltip('Drift-corrected position');

let stationDefaults = {};
let playing = false;
let playTimer = null;
let userPanned = false;
map.on('dragstart', () => { userPanned = true; });

function drawSparkline(series) {
    const w = 280, h = 80, pad = 4;
    if (!series.length) { sparkline.innerHTML = ''; return; }
    const maxD = Math.max(...series.map((s) => s.displacement_m), 0.0001);
    const stepX = (w - pad * 2) / Math.max(series.length - 1, 1);
    const points = series.map((s, i) => {
        const x = pad + i * stepX;
        const y = h - pad - (s.displacement_m / maxD) * (h - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const areaPoints = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`;
    sparkline.innerHTML = `<polyline points="${areaPoints}" fill="rgba(98,185,232,0.15)" stroke="none"></polyline><polyline points="${points}" fill="none" stroke="#62b9e8" stroke-width="2"></polyline>`;
}

function updateStats(station, lat, lon, days, result) {
    statStation.textContent = STATION_NAMES[station] || station;
    statGlacier.textContent = result.glacier_name;
    statVelocity.textContent = `${result.velocity_m_per_yr_used} m/yr`;
    statBearing.textContent = `${result.bearing_deg}\u00b0`;
    statDays.textContent = `${days} d`;
    statDisplacement.textContent = `${result.displacement_m.toFixed(2)} m`;
    statOrigin.textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    statCorrected.textContent = `${result.corrected_lat.toFixed(4)}, ${result.corrected_lon.toFixed(4)}`;
    statConfidence.textContent = result.confidence.split('(')[0].trim();
}

async function updateView() {
    const station = stationSelect.value;
    const lat = parseFloat(latInput.value);
    const lon = parseFloat(lonInput.value);
    const days = parseInt(daysSlider.value, 10);
    dayValue.textContent = days;

    try {
        const result = await api.correctDrift(station, lat, lon, days);

        originMarker.setLatLng([lat, lon]);
        driftMarker.setLatLng([result.corrected_lat, result.corrected_lon]);
        pathLine.setLatLngs([[lat, lon], [result.corrected_lat, result.corrected_lon]]);

        updateStats(station, lat, lon, days, result);
        if (!userPanned) map.setView([lat, lon], map.getZoom());

        const series = await api.getDriftSeries(station, lat, lon, days, Math.max(1, Math.round(days / 40) || 1));
        drawSparkline(series);
    } catch (error) {
        sourceNote.textContent = `Could not reach the drift API: ${error.message}`;
    }
}

function stopPlaying() {
    playing = false;
    clearInterval(playTimer);
    playBtn.innerHTML = '&#9654; Play drift';
}

stationSelect.addEventListener('change', () => {
    const d = stationDefaults[stationSelect.value];
    if (d) { latInput.value = d.latitude; lonInput.value = d.longitude; }
    userPanned = false;
    updateView();
});
latInput.addEventListener('change', updateView);
lonInput.addEventListener('change', updateView);
daysSlider.addEventListener('input', updateView);

resetBtn.addEventListener('click', () => {
    stopPlaying();
    daysSlider.value = 0;
    updateView();
});

playBtn.addEventListener('click', () => {
    if (playing) { stopPlaying(); return; }
    playing = true;
    playBtn.textContent = '\u23F8 Pause';
    playTimer = setInterval(() => {
        let d = parseInt(daysSlider.value, 10);
        d = (d + 5) % 1826;
        daysSlider.value = d;
        updateView();
    }, 80);
});

async function init() {
    try {
        const stations = await api.getDriftStations();
        stationDefaults = Object.fromEntries(stations.map((s) => [s.station_id, s]));
        const lines = stations.map((s) => `${s.name}: ${s.glacier_profile.glacier_name} \u2014 ${s.glacier_profile.velocity_m_per_yr ?? s.glacier_profile.velocity_max} m/yr`);
        sourceNote.textContent = lines.join(' \u00b7 ');

        const initial = stationDefaults[stationSelect.value];
        latInput.value = initial.latitude;
        lonInput.value = initial.longitude;
    } catch (error) {
        sourceNote.textContent = `Could not reach the drift API: ${error.message}`;
    }
    updateView();
}

init();
