async function initInventory() {
  const inventory = await getInventory();
  const render = () => {
    const search = (document.getElementById('inventory-search').value || '').toLowerCase();
    const filtered = inventory.filter((item) => `${item.item} ${item.category} ${item.station}`.toLowerCase().includes(search));
    document.getElementById('inventory-count').textContent = `${filtered.length} consumable records`;
    document.getElementById('inventory-tbody').innerHTML = filtered.map((item) => `<tr class="${item.status === 'Critical' ? 'text-red' : ''}"><td><div class="asset-name"><span class="inventory-icon">+</span><div><strong>${item.item}</strong><span>${item.category} / ${item.id}</span></div></div></td><td>${item.station}</td><td><strong>${item.quantity} ${item.unit}</strong></td><td>${item.threshold} ${item.unit}</td><td>${statusBadge(item.status)}</td><td class="${item.change < 0 ? 'text-red' : 'text-green'}">${item.change > 0 ? '+' : ''}${item.change}%</td><td><button class="link-arrow stock-action" data-id="${item.id}" type="button">Add stock</button> <button class="link-arrow delete-stock" data-id="${item.id}" type="button">Delete</button></td></tr>`).join('');
    document.querySelectorAll('.stock-action').forEach((button) => button.addEventListener('click', () => { document.getElementById('stock-item').value = button.dataset.id; document.getElementById('stock-modal').showModal(); }));
    document.querySelectorAll('.delete-stock').forEach((button) => button.addEventListener('click', async () => { const item = inventory.find((entry) => entry.id === button.dataset.id); if (item && window.confirm(`Delete ${item.item}?`)) { await deleteInventory(item.id); window.location.reload(); } }));
  };
  document.getElementById('inventory-total').textContent = inventory.length;
  document.getElementById('inventory-critical').textContent = inventory.filter((item) => item.status === 'Critical').length;
  document.getElementById('inventory-health').textContent = `${Math.round((inventory.filter((item) => item.status === 'Normal').length / Math.max(inventory.length, 1)) * 100)}%`;
  document.getElementById('stock-item').innerHTML = inventory.map((item) => `<option value="${item.id}">${item.item} / ${item.station}</option>`).join('');
  document.getElementById('inventory-search').addEventListener('input', render);
  render();
  document.getElementById('open-stock-modal').addEventListener('click', () => document.getElementById('stock-modal').showModal());
  document.getElementById('stock-form').addEventListener('submit', async (event) => { event.preventDefault(); await addStock(document.getElementById('stock-item').value, Number(document.getElementById('stock-quantity').value)); document.getElementById('stock-modal').close(); window.location.reload(); });
}
initInventory();
