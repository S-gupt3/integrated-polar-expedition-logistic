function statusClass(status) { const value = status.toLowerCase(); if (value === 'operational' || value === 'normal') return 'badge-green'; if (value === 'maintenance' || value === 'low stock') return 'badge-yellow'; if (value === 'damaged' || value === 'critical') return 'badge-red'; return 'badge-gray'; }
function statusBadge(status) { return `<span class="badge ${statusClass(status)}">${status}</span>`; }
function iconForStatus(status) { return status.toLowerCase() === 'resolved' ? '&#10003;' : '&#9888;'; }
function getQueryParam(name) { return new URLSearchParams(window.location.search).get(name); }
