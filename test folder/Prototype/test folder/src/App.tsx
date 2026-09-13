import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Command,
  Gauge,
  LayoutDashboard,
  MapPin,
  Menu,
  PackageSearch,
  PanelLeftClose,
  Search,
  Settings,
  ShieldCheck,
  Snowflake,
  Truck,
  Wrench,
  X,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type View = 'dashboard' | 'assets' | 'inventory' | 'analytics'
type AssetStatus = 'Operational' | 'Maintenance' | 'Damaged' | 'Missing'
type StockStatus = 'Normal' | 'Low stock' | 'Critical'

type Asset = {
  id: string
  name: string
  category: string
  station: string
  status: AssetStatus
  condition: string
  lastInspection: string
  nextMaintenance: string
}

type InventoryItem = {
  id: string
  item: string
  category: string
  station: string
  quantity: number
  unit: string
  threshold: number
  status: StockStatus
  change: number
}

const seedAssets: Asset[] = [
  { id: 'GEN-104', name: 'Diesel Generator', category: 'Power', station: 'Maitri', status: 'Operational', condition: 'Good', lastInspection: '02 Sep 2026', nextMaintenance: '20 Sep 2026' },
  { id: 'VEH-022', name: 'Snow Vehicle', category: 'Transport', station: 'Bharati', status: 'Maintenance', condition: 'Fair', lastInspection: '28 Aug 2026', nextMaintenance: '14 Sep 2026' },
  { id: 'COM-018', name: 'Satellite Uplink', category: 'Communication', station: 'Maitri', status: 'Operational', condition: 'Excellent', lastInspection: '06 Sep 2026', nextMaintenance: '06 Dec 2026' },
  { id: 'SCI-207', name: 'Ice Core Freezer', category: 'Scientific', station: 'Bharati', status: 'Damaged', condition: 'Poor', lastInspection: '31 Aug 2026', nextMaintenance: '18 Sep 2026' },
  { id: 'MED-031', name: 'Field Medical Kit', category: 'Medical', station: 'Himadri', status: 'Operational', condition: 'Good', lastInspection: '04 Sep 2026', nextMaintenance: '04 Oct 2026' },
]

const seedInventory: InventoryItem[] = [
  { id: 'INV-001', item: 'Diesel fuel', category: 'Fuel', station: 'Maitri', quantity: 820, unit: 'L', threshold: 500, status: 'Normal', change: 12 },
  { id: 'INV-019', item: 'Medical kits', category: 'Medical', station: 'Bharati', quantity: 12, unit: 'kits', threshold: 20, status: 'Critical', change: -18 },
  { id: 'INV-044', item: 'Lithium batteries', category: 'Power', station: 'Maitri', quantity: 42, unit: 'units', threshold: 50, status: 'Low stock', change: -7 },
  { id: 'INV-073', item: 'Food packs', category: 'Provisions', station: 'Bharati', quantity: 850, unit: 'packs', threshold: 500, status: 'Normal', change: 4 },
  { id: 'INV-091', item: 'Spare filters', category: 'Maintenance', station: 'Himadri', quantity: 18, unit: 'units', threshold: 25, status: 'Low stock', change: -3 },
]

const consumption = [
  { day: '01 Sep', value: 68 }, { day: '02 Sep', value: 61 }, { day: '03 Sep', value: 74 },
  { day: '04 Sep', value: 70 }, { day: '05 Sep', value: 83 }, { day: '06 Sep', value: 78 },
  { day: '07 Sep', value: 91 }, { day: '08 Sep', value: 86 }, { day: '09 Sep', value: 96 },
  { day: '10 Sep', value: 89 }, { day: '11 Sep', value: 102 }, { day: '12 Sep', value: 98 },
]

const stationUsage = [
  { station: 'Maitri', utilization: 82, assets: 412 },
  { station: 'Bharati', utilization: 76, assets: 368 },
  { station: 'Himadri', utilization: 71, assets: 322 },
]

const assetHealth = [
  { name: 'Operational', value: 82, color: '#64c59b' },
  { name: 'Maintenance', value: 9, color: '#efb35a' },
  { name: 'Damaged', value: 5, color: '#e87968' },
  { name: 'Missing', value: 2, color: '#8a9aa2' },
  { name: 'Retired', value: 2, color: '#455a62' },
]

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'assets', label: 'Asset registry', icon: Boxes },
  { id: 'inventory', label: 'Inventory', icon: PackageSearch },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
]

const operations = [
  { id: 'isea-46', label: 'ISEA-46 / Maitri' },
  { id: 'isea-47', label: 'ISEA-47 / Bharati' },
  { id: 'himadri-relief', label: 'Himadri relief ops' },
]

function loadStored<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) as T : fallback
  } catch {
    return fallback
  }
}

function loadOperationStored<T>(operationId: string, type: string, fallback: T): T {
  const stored = loadStored<T | null>(`polar-ops-${operationId}-${type}`, null)
  return stored ?? loadStored(`polar-ops-${type}`, fallback)
}

function App() {
  const [view, setView] = useState<View>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [operationId, setOperationId] = useState(() => loadStored('polar-ops-active-operation', operations[0].id))
  const [assets, setAssets] = useState<Asset[]>(() => loadOperationStored(operationId, 'assets', seedAssets))
  const [inventory, setInventory] = useState<InventoryItem[]>(() => loadOperationStored(operationId, 'inventory', seedInventory))
  const [assetModalOpen, setAssetModalOpen] = useState(false)
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false)

  useEffect(() => { localStorage.setItem('polar-ops-active-operation', operationId) }, [operationId])
  useEffect(() => { localStorage.setItem(`polar-ops-${operationId}-assets`, JSON.stringify(assets)) }, [assets, operationId])
  useEffect(() => { localStorage.setItem(`polar-ops-${operationId}-inventory`, JSON.stringify(inventory)) }, [inventory, operationId])

  const switchOperation = (nextOperationId: string) => {
    setOperationId(nextOperationId)
    setAssets(loadOperationStored(nextOperationId, 'assets', seedAssets))
    setInventory(loadOperationStored(nextOperationId, 'inventory', seedInventory))
    setSelectedAsset(null)
  }

  const addAsset = (asset: Asset) => { setAssets((current) => [asset, ...current]); setAssetModalOpen(false) }
  const deleteAsset = (id: string) => { setAssets((current) => current.filter((asset) => asset.id !== id)); setSelectedAsset(null) }
  const addInventory = (item: InventoryItem) => { setInventory((current) => [item, ...current]); setInventoryModalOpen(false) }
  const deleteInventory = (id: string) => { setInventory((current) => current.filter((item) => item.id !== id)) }

  const pageTitle = view === 'dashboard' ? 'Operations overview' : view === 'assets' ? 'Asset registry' : view === 'inventory' ? 'Inventory control' : 'Decision analytics'
  const pageDescription = view === 'dashboard' ? 'Live readiness picture for the current polar operation.' : view === 'assets' ? 'Track condition, location and lifecycle of every field asset.' : view === 'inventory' ? 'Monitor consumables, thresholds and stock movement across stations.' : 'Understand utilization, consumption and operational pressure by station.'

  const navigate = (nextView: View) => {
    setView(nextView)
    setSearch('')
    setSelectedAsset(null)
    setSidebarOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><Snowflake size={19} strokeWidth={2.3} /></div>
          <div><strong>POLAR OPS</strong><span>NCPOR COMMAND</span></div>
          <button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <label className="workspace-switcher"><div className="station-dot" /><div><span>ACTIVE OPERATION</span><select value={operationId} onChange={(event) => switchOperation(event.target.value)} aria-label="Select active operation">{operations.map((operation) => <option key={operation.id} value={operation.id}>{operation.label}</option>)}</select></div><ChevronRight size={15} /></label>
        <nav className="main-nav" aria-label="Primary navigation">
          <p className="nav-label">Command center</p>
          {navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => navigate(id)}><Icon size={18} /><span>{label}</span>{id === 'dashboard' && <span className="nav-pulse" />}</button>)}
          <p className="nav-label nav-label-spaced">Operations</p>
          <button className="nav-item muted"><Truck size={18} /><span>Logistics</span><span className="coming-soon">Soon</span></button>
          <button className="nav-item muted"><Wrench size={18} /><span>Maintenance</span><span className="coming-soon">Soon</span></button>
          <button className="nav-item muted"><ShieldCheck size={18} /><span>Personnel</span><span className="coming-soon">Soon</span></button>
          <button className="nav-item muted"><AlertTriangle size={18} /><span>Alerts</span><span className="alert-count">4</span></button>
        </nav>
        <div className="sidebar-footer"><button className="nav-item"><Settings size={18} /><span>Settings</span></button><div className="user-chip"><div className="avatar">AR</div><div><strong>Aryan Rao</strong><span>Expedition manager</span></div><ChevronRight size={15} /></div></div>
      </aside>
      {sidebarOpen && <button className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-label="Close navigation overlay" />}
      <main className="main-content">
        <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="breadcrumbs"><span>{operations.find((operation) => operation.id === operationId)?.label.split(' / ')[0]}</span><ChevronRight size={14} /><strong>{pageTitle}</strong></div><div className="topbar-actions"><label className="global-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search command center" /><kbd>⌘ K</kbd></label><button className="icon-button notification-button" aria-label="Notifications"><Bell size={19} /><span /></button><div className="top-avatar">AR</div></div></header>
        <div className="page-wrap">
          <div className="page-heading"><div><div className="eyebrow"><span className="live-dot" /> SYSTEMS NOMINAL <span className="eyebrow-divider">/</span> 13 SEPTEMBER 2026</div><h1>{pageTitle}</h1><p>{pageDescription}</p></div><div className="heading-actions"><button className="secondary-button"><CalendarDays size={16} /> Last 30 days</button><button className="primary-button" onClick={() => navigate(view === 'assets' ? 'assets' : 'inventory')}><Activity size={16} /> Quick action</button></div></div>
          {view === 'dashboard' && <Dashboard navigate={navigate} />}
          {view === 'assets' && <AssetsPage assets={assets} search={search} onSelect={setSelectedAsset} onAdd={() => setAssetModalOpen(true)} />}
          {view === 'inventory' && <InventoryPage inventory={inventory} search={search} onAdd={() => setInventoryModalOpen(true)} onDelete={deleteInventory} />}
          {view === 'analytics' && <AnalyticsPage />}
        </div>
      </main>
      {selectedAsset && <AssetDrawer asset={selectedAsset} onClose={() => setSelectedAsset(null)} onDelete={deleteAsset} />}
      {assetModalOpen && <AssetModal onClose={() => setAssetModalOpen(false)} onSubmit={addAsset} />}
      {inventoryModalOpen && <InventoryModal onClose={() => setInventoryModalOpen(false)} onSubmit={addInventory} />}
    </div>
  )
}

function Dashboard({ navigate }: { navigate: (view: View) => void }) {
  return <div className="dashboard-grid">
    <section className="readiness-banner panel"><div className="readiness-copy"><div className="panel-kicker">EXPEDITION READINESS <CircleHelp size={14} /></div><div className="readiness-value">87<span>%</span></div><p>Stable operation with 3 areas requiring attention.</p><div className="progress-track"><div style={{ width: '87%' }} /></div></div><div className="readiness-stats"><div><span>Station</span><strong>Maitri</strong></div><div><span>Active phase</span><strong>Winter ops</strong></div><div><span>Next review</span><strong>18 Sep</strong></div></div><Gauge className="readiness-icon" size={110} /></section>
    <div className="kpi-grid"><Kpi label="Total assets" value="1,248" detail="+3.2% vs last month" trend="up" icon={<Boxes size={18} />} /><Kpi label="Operational assets" value="1,102" detail="88.3% of total fleet" trend="up" icon={<ShieldCheck size={18} />} /><Kpi label="Low stock items" value="18" detail="5 critical thresholds" trend="down" warning icon={<PackageSearch size={18} />} /><Kpi label="In transit" value="14" detail="3 shipments delayed" trend="down" warning icon={<Truck size={18} />} /></div>
    <section className="panel chart-panel asset-health"><PanelHeader title="Asset health" subtitle="Current status across all stations" action="View registry" onClick={() => navigate('assets')} /><div className="donut-wrap"><ResponsiveContainer width="52%" height={190}><PieChart><Pie data={assetHealth} dataKey="value" nameKey="name" innerRadius={57} outerRadius={78} paddingAngle={3} stroke="none">{assetHealth.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie></PieChart></ResponsiveContainer><div className="donut-center"><strong>1,248</strong><span>assets</span></div><div className="legend-list">{assetHealth.slice(0, 4).map((entry) => <div key={entry.name}><span className="legend-swatch" style={{ background: entry.color }} /><span>{entry.name}</span><strong>{entry.value}%</strong></div>)}</div></div></section>
    <section className="panel chart-panel consumption-panel"><PanelHeader title="Inventory consumption" subtitle="Daily usage volume · last 12 days" action="Open analytics" onClick={() => navigate('analytics')} /><div className="chart-key"><span><i className="key-line" /> Actual consumption</span><span className="muted-text">Litres / units</span></div><ResponsiveContainer width="100%" height={185}><AreaChart data={consumption} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}><defs><linearGradient id="consumptionFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#69c9a0" stopOpacity={0.3} /><stop offset="100%" stopColor="#69c9a0" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e4ebe9" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#809096', fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#809096', fontSize: 11 }} /><Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #dbe5e2', boxShadow: '0 8px 24px rgba(27, 54, 61, .1)' }} /><Area type="monotone" dataKey="value" stroke="#319f7b" strokeWidth={2.5} fill="url(#consumptionFill)" /></AreaChart></ResponsiveContainer></section>
    <section className="panel inventory-alerts"><PanelHeader title="Needs attention" subtitle="Priority actions for the command team" action="View inventory" onClick={() => navigate('inventory')} /><div className="attention-list"><Attention severity="critical" title="Medical kits below critical threshold" meta="Bharati · 12 kits remaining" /><Attention severity="warning" title="Generator GEN-104 due for inspection" meta="Maitri · Scheduled in 7 days" /><Attention severity="warning" title="Shipment SH-204 is delayed" meta="Supply route · 18 hours behind plan" /><Attention severity="resolved" title="Fuel delivery received" meta="Maitri · Resolved 2 hours ago" /></div></section>
    <section className="panel station-panel"><PanelHeader title="Station pulse" subtitle="Utilization by research base" action="Compare stations" onClick={() => navigate('analytics')} />{stationUsage.map((station) => <div className="station-row" key={station.station}><div className="station-name"><span className="station-marker"><MapPin size={13} /></span><strong>{station.station}</strong><span>{station.assets} assets</span></div><div className="station-bar"><div style={{ width: `${station.utilization}%` }} /></div><b>{station.utilization}%</b></div>)}</section>
  </div>
}

function Kpi({ label, value, detail, trend, warning, icon }: { label: string; value: string; detail: string; trend: 'up' | 'down'; warning?: boolean; icon: React.ReactNode }) { return <article className={`kpi-card ${warning ? 'kpi-warning' : ''}`}><div className="kpi-top"><span className="kpi-icon">{icon}</span><span className={`trend ${trend}`}>{trend === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{trend === 'up' ? '3.2%' : 'Needs review'}</span></div><span className="kpi-label">{label}</span><strong className="kpi-value">{value}</strong><span className="kpi-detail">{detail}</span></article> }
function PanelHeader({ title, subtitle, action, onClick }: { title: string; subtitle: string; action?: string; onClick?: () => void }) { return <div className="panel-header"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button className="text-button" onClick={onClick}>{action}<ChevronRight size={14} /></button>}</div> }
function Attention({ severity, title, meta }: { severity: 'critical' | 'warning' | 'resolved'; title: string; meta: string }) { return <div className="attention-item"><span className={`severity-icon ${severity}`}>{severity === 'resolved' ? <ShieldCheck size={15} /> : <AlertTriangle size={15} />}</span><div><strong>{title}</strong><span>{meta}</span></div><ChevronRight size={15} /></div> }

function AssetsPage({ assets, search, onSelect, onAdd }: { assets: Asset[]; search: string; onSelect: (asset: Asset) => void; onAdd: () => void }) {
  const [status, setStatus] = useState('All statuses')
  const filtered = useMemo(() => assets.filter((asset) => `${asset.id} ${asset.name} ${asset.category} ${asset.station}`.toLowerCase().includes(search.toLowerCase()) && (status === 'All statuses' || asset.status === status)), [assets, search, status])
  return <div className="module-stack"><div className="module-toolbar"><div className="filter-pills"><button className={status === 'All statuses' ? 'selected' : ''} onClick={() => setStatus('All statuses')}>All assets <span>{assets.length}</span></button>{(['Operational', 'Maintenance', 'Damaged'] as const).map((item) => <button key={item} className={status === item ? 'selected' : ''} onClick={() => setStatus(item)}>{item} <span>{assets.filter((asset) => asset.status === item).length}</span></button>)}</div><button className="primary-button" onClick={onAdd}><Boxes size={16} /> Register asset</button></div><section className="panel table-panel"><div className="table-heading"><div><h2>Asset registry</h2><p>{filtered.length} records matching current view</p></div><button className="icon-button"><Settings size={17} /></button></div><div className="table-scroll"><table><thead><tr><th>Asset</th><th>Category</th><th>Station</th><th>Status</th><th>Condition</th><th>Next maintenance</th><th /></tr></thead><tbody>{filtered.map((asset) => <tr key={asset.id} onClick={() => onSelect(asset)}><td><div className="asset-cell"><span className="asset-thumb"><Wrench size={16} /></span><div><strong>{asset.name}</strong><span>{asset.id}</span></div></div></td><td>{asset.category}</td><td><span className="location-cell"><MapPin size={14} />{asset.station}</span></td><td><StatusBadge status={asset.status} /></td><td>{asset.condition}</td><td>{asset.nextMaintenance}</td><td><ChevronRight size={16} className="row-arrow" /></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state"><PackageSearch size={26} /><strong>No assets found</strong><span>Try changing your search or filters.</span></div>}</div></section></div>
}

function InventoryPage({ inventory, search, onAdd, onDelete }: { inventory: InventoryItem[]; search: string; onAdd: () => void; onDelete: (id: string) => void }) {
  const filtered = inventory.filter((item) => `${item.item} ${item.category} ${item.station}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="module-stack"><div className="inventory-summary"><div><span>Stock health</span><strong>{Math.round((inventory.filter((item) => item.status === 'Normal').length / Math.max(inventory.length, 1)) * 100)}%</strong><small>of tracked inventory is above threshold</small></div><div><span>Critical items</span><strong className="text-critical">{inventory.filter((item) => item.status === 'Critical').length}</strong><small>require immediate replenishment</small></div><div><span>Tracked items</span><strong>{inventory.length}</strong><small className="positive">Stored locally in this browser</small></div></div><section className="panel table-panel"><div className="table-heading"><div><h2>Inventory control</h2><p>Consumables and operational stock across stations</p></div><button className="primary-button" onClick={onAdd}><Activity size={16} /> Add item</button></div><div className="table-scroll"><table><thead><tr><th>Item</th><th>Station</th><th>On hand</th><th>Threshold</th><th>Status</th><th>30 day change</th><th /></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><div className="asset-cell"><span className="inventory-thumb"><PackageSearch size={16} /></span><div><strong>{item.item}</strong><span>{item.category} · {item.id}</span></div></div></td><td><span className="location-cell"><MapPin size={14} />{item.station}</span></td><td><strong>{item.quantity.toLocaleString()} {item.unit}</strong></td><td>{item.threshold} {item.unit}</td><td><StatusBadge status={item.status} /></td><td className={item.change < 0 ? 'text-critical' : 'positive'}>{item.change > 0 ? '+' : ''}{item.change}%</td><td><button className="icon-button table-delete" onClick={() => window.confirm(`Delete ${item.item}?`) && onDelete(item.id)} aria-label={`Delete ${item.item}`}><X size={15} /></button></td></tr>)}</tbody></table></div></section></div>
}

function StatusBadge({ status }: { status: AssetStatus | StockStatus }) { const key = status.toLowerCase().replace(' ', '-'); return <span className={`status-badge ${key}`}><i />{status}</span> }
function AnalyticsPage() { return <div className="analytics-grid"><section className="panel analytics-main"><PanelHeader title="Station utilization" subtitle="How intensively each station's assets are being used" /><ResponsiveContainer width="100%" height={250}><BarChart data={stationUsage} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 5 }}><CartesianGrid horizontal={false} stroke="#e7eeeb" /><XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#809096', fontSize: 11 }} /><YAxis type="category" dataKey="station" axisLine={false} tickLine={false} tick={{ fill: '#40555b', fontSize: 12, fontWeight: 600 }} width={58} /><Tooltip cursor={{ fill: '#f1f6f4' }} contentStyle={{ borderRadius: 8, border: '1px solid #dbe5e2' }} /><Bar dataKey="utilization" fill="#319f7b" radius={[0, 5, 5, 0]} barSize={23} /></BarChart></ResponsiveContainer><div className="chart-footnote"><span><i className="key-line" /> Asset utilization</span><strong>Average 76.3%</strong></div></section><section className="panel analytics-score"><div className="panel-kicker">OPERATIONAL HEALTH SCORE</div><div className="score-ring"><div><strong>87</strong><span>/ 100</span></div></div><p>Readiness is holding steady, with inventory resilience as the main opportunity.</p><div className="score-breakdown"><div><span>Asset availability</span><strong>92%</strong></div><div><span>Stock resilience</span><strong>74%</strong></div><div><span>Route reliability</span><strong>85%</strong></div></div></section><section className="panel analytics-trend"><PanelHeader title="Consumption pressure" subtitle="Daily inventory usage, normalized across stations" /><ResponsiveContainer width="100%" height={210}><AreaChart data={consumption}><defs><linearGradient id="analyticsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e5a54b" stopOpacity={0.26} /><stop offset="100%" stopColor="#e5a54b" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e7eeeb" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#809096', fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#809096', fontSize: 11 }} /><Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #dbe5e2' }} /><Area type="monotone" dataKey="value" stroke="#d39032" fill="url(#analyticsFill)" strokeWidth={2.5} /></AreaChart></ResponsiveContainer></section><section className="panel insights-panel"><PanelHeader title="Key signals" subtitle="Derived from the current operating picture" /><div className="signal-card"><span className="signal-icon amber"><Activity size={17} /></span><div><strong>Consumption is trending up</strong><p>Daily usage is 14% higher than the 30-day baseline.</p></div></div><div className="signal-card"><span className="signal-icon green"><ShieldCheck size={17} /></span><div><strong>Maitri fleet is highly available</strong><p>92% of assets are operational and inspection-compliant.</p></div></div></section></div> }
function AssetDrawer({ asset, onClose, onDelete }: { asset: Asset; onClose: () => void; onDelete: (id: string) => void }) { return <><button className="drawer-overlay" onClick={onClose} aria-label="Close asset details" /><aside className="asset-drawer"><div className="drawer-header"><div><span className="eyebrow">ASSET DETAIL</span><h2>{asset.id}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close asset details"><X size={19} /></button></div><div className="drawer-hero"><span className="large-asset-icon"><Wrench size={27} /></span><div><h3>{asset.name}</h3><span>{asset.category} equipment</span></div><StatusBadge status={asset.status} /></div><div className="detail-grid"><div><span>Location</span><strong><MapPin size={14} /> {asset.station} Station</strong></div><div><span>Condition</span><strong>{asset.condition}</strong></div><div><span>Last inspection</span><strong>{asset.lastInspection}</strong></div><div><span>Next maintenance</span><strong>{asset.nextMaintenance}</strong></div></div><div className="drawer-section"><div className="panel-kicker">RECENT LIFECYCLE</div><div className="timeline"><div><i /><span><strong>Inspection completed</strong><small>{asset.lastInspection}</small></span></div><div><i /><span><strong>Assigned to {asset.station}</strong><small>21 Aug 2026</small></span></div><div><i /><span><strong>Maintenance completed</strong><small>14 Jul 2026</small></span></div><div><i /><span><strong>Received at station</strong><small>03 May 2026</small></span></div></div></div><button className="primary-button drawer-action"><ClipboardList size={16} /> View full asset history</button><button className="danger-button drawer-action" onClick={() => window.confirm(`Delete ${asset.name}?`) && onDelete(asset.id)}><X size={16} /> Delete asset</button></aside></> }

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal-panel" role="dialog" aria-modal="true" aria-label={title}><div className="modal-header"><div><span className="eyebrow">LOCAL RECORD</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div>{children}</section></div> }

function AssetModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (asset: Asset) => void }) {
  const [form, setForm] = useState({ id: '', name: '', category: 'Power', station: 'Maitri', status: 'Operational' as AssetStatus, condition: 'Good', nextMaintenance: '' })
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }))
  return <Modal title="Register an asset" onClose={onClose}><form className="record-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ ...form, lastInspection: 'Not yet inspected' }) }}><label>Asset ID<input required value={form.id} onChange={(event) => update('id', event.target.value.toUpperCase())} placeholder="GEN-105" /></label><label>Asset name<input required value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Satellite uplink" /></label><div className="form-grid"><label>Category<select value={form.category} onChange={(event) => update('category', event.target.value)}><option>Power</option><option>Transport</option><option>Communication</option><option>Scientific</option><option>Medical</option></select></label><label>Station<select value={form.station} onChange={(event) => update('station', event.target.value)}><option>Maitri</option><option>Bharati</option><option>Himadri</option></select></label></div><div className="form-grid"><label>Status<select value={form.status} onChange={(event) => update('status', event.target.value)}><option>Operational</option><option>Maintenance</option><option>Damaged</option><option>Missing</option></select></label><label>Condition<input required value={form.condition} onChange={(event) => update('condition', event.target.value)} /></label></div><label>Next maintenance<input required type="date" value={form.nextMaintenance} onChange={(event) => update('nextMaintenance', event.target.value)} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit"><Boxes size={16} /> Save asset</button></div></form></Modal>
}

function InventoryModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (item: InventoryItem) => void }) {
  const [form, setForm] = useState({ id: '', item: '', category: 'Fuel', station: 'Maitri', quantity: '0', unit: 'units', threshold: '0', change: '0' })
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }))
  return <Modal title="Add inventory item" onClose={onClose}><form className="record-form" onSubmit={(event) => { event.preventDefault(); const quantity = Number(form.quantity); const threshold = Number(form.threshold); onSubmit({ id: form.id, item: form.item, category: form.category, station: form.station, quantity, unit: form.unit, threshold, status: quantity <= threshold * .6 ? 'Critical' : quantity <= threshold ? 'Low stock' : 'Normal', change: Number(form.change) }) }}><label>Item ID<input required value={form.id} onChange={(event) => update('id', event.target.value.toUpperCase())} placeholder="INV-100" /></label><label>Item name<input required value={form.item} onChange={(event) => update('item', event.target.value)} placeholder="Emergency batteries" /></label><div className="form-grid"><label>Category<input required value={form.category} onChange={(event) => update('category', event.target.value)} /></label><label>Station<select value={form.station} onChange={(event) => update('station', event.target.value)}><option>Maitri</option><option>Bharati</option><option>Himadri</option></select></label></div><div className="form-grid"><label>Quantity<input required min="0" type="number" value={form.quantity} onChange={(event) => update('quantity', event.target.value)} /></label><label>Unit<input required value={form.unit} onChange={(event) => update('unit', event.target.value)} /></label></div><div className="form-grid"><label>Threshold<input required min="0" type="number" value={form.threshold} onChange={(event) => update('threshold', event.target.value)} /></label><label>30 day change %<input required type="number" value={form.change} onChange={(event) => update('change', event.target.value)} /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit"><Activity size={16} /> Save item</button></div></form></Modal>
}

export default App
