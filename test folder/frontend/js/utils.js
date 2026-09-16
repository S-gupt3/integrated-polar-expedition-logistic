function statusClass(status) { const value = status.toLowerCase(); if (value === 'operational' || value === 'normal') return 'badge-green'; if (value === 'maintenance' || value === 'low stock') return 'badge-yellow'; if (value === 'damaged' || value === 'critical') return 'badge-red'; return 'badge-gray'; }
function statusBadge(status) { return `<span class="badge ${statusClass(status)}">${status}</span>`; }
function iconForStatus(status) { return status.toLowerCase() === 'resolved' ? '&#10003;' : '&#9888;'; }
function getQueryParam(name) { return new URLSearchParams(window.location.search).get(name); }

window.currentStation = function () {
	const q = new URLSearchParams(window.location.search).get('station');
	if (q === 'all') { localStorage.removeItem('ploropsis-station'); return 'all'; }
	if (q) { localStorage.setItem('ploropsis-station', q); return q; }
	return localStorage.getItem('ploropsis-station') || 'all';
};
window.mountStationTabs = window.mountStationTabs || function (host, render) {
	if (typeof render === 'function') render();
};
