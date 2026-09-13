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
  CircleCheck,
  ClipboardList,
  Command,
  Gauge,
  LayoutDashboard,
  MapPin,
  Menu,
  Plus,
  PackageSearch,
  PanelLeftClose,
  Search,
  Settings,
  ShieldCheck,
  Snowflake,
  Truck,
  Users,
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

type View = 'dashboard' | 'assets' | 'inventory' | 'logistics' | 'maintenance' | 'personnel' | 'alerts' | 'analytics'
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

type WorkflowStatus = 'Planned' | 'In progress' | 'Completed' | 'Delayed'
type Expenditure = { id: string; purpose: string; amount: number; owner: string; status: WorkflowStatus; explanation: string }
type Person = { id: string; name: string; role: string; station: string; status: 'Available' | 'Deployed' }
type Shipment = { id: string; route: string; cargo: string; eta: string; status: WorkflowStatus; explanation: string }
type Deployment = { id: string; assetId: string; destination: string; assignee: string; status: WorkflowStatus }
type ConsumptionLog = { id: string; item: string; quantity: number; station: string; reason: string; date: string }
type AlertRecord = { id: string; title: string; severity: 'Info' | 'Warning' | 'Critical'; explanation: string; resolved: boolean }
type LogisticsRecord = { id: string; type: 'Shipment' | 'Receipt' | 'Transfer'; reference: string; origin: string; destination: string; status: WorkflowStatus; owner: string; explanation: string }
type MaintenanceRecord = { id: string; assetId: string; work: string; priority: 'Routine' | 'Priority' | 'Urgent'; status: 'Scheduled' | 'In progress' | 'Completed' | 'Blocked'; due: string; technician: string; explanation: string }
type OperationalModel = {
  expenditures: Expenditure[]
  people: Person[]
  assets: Asset[]
  inventory: InventoryItem[]
  shipments: Shipment[]
  deployments: Deployment[]
  consumption: ConsumptionLog[]
  alerts: AlertRecord[]
  logistics: LogisticsRecord[]
  maintenance: MaintenanceRecord[]
}

const assets: Asset[] = [
  { id: 'GEN-104', name: 'Diesel Generator', category: 'Power', station: 'Maitri', status: 'Operational', condition: 'Good', lastInspection: '02 Sep 2026', nextMaintenance: '20 Sep 2026' },
  { id: 'VEH-022', name: 'Snow Vehicle', category: 'Transport', station: 'Bharati', status: 'Maintenance', condition: 'Fair', lastInspection: '28 Aug 2026', nextMaintenance: '14 Sep 2026' },
  { id: 'COM-018', name: 'Satellite Uplink', category: 'Communication', station: 'Maitri', status: 'Operational', condition: 'Excellent', lastInspection: '06 Sep 2026', nextMaintenance: '06 Dec 2026' },
  { id: 'SCI-207', name: 'Ice Core Freezer', category: 'Scientific', station: 'Bharati', status: 'Damaged', condition: 'Poor', lastInspection: '31 Aug 2026', nextMaintenance: '18 Sep 2026' },
  { id: 'MED-031', name: 'Field Medical Kit', category: 'Medical', station: 'Himadri', status: 'Operational', condition: 'Good', lastInspection: '04 Sep 2026', nextMaintenance: '04 Oct 2026' },
]

const inventory: InventoryItem[] = [
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
  { id: 'logistics', label: 'Logistics', icon: Truck },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'personnel', label: 'Personnel', icon: Users },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
]

const seedOperationalModel: OperationalModel = {
  expenditures: [{ id: 'EXP-026', purpose: 'Winter fuel reserve', amount: 18400, owner: 'A. Rao', status: 'Completed', explanation: 'Approved against the winter operations budget to protect the Maitri power reserve.' }],
  people: [{ id: 'PER-014', name: 'Leena Bose', role: 'Field scientist', station: 'Bharati', status: 'Deployed' }, { id: 'PER-021', name: 'Milan Das', role: 'Logistics lead', station: 'Maitri', status: 'Available' }],
  assets,
  inventory,
  shipments: [{ id: 'SH-204', route: 'Cape Town to Maitri', cargo: 'Medical kits + filters', eta: '18 Sep 2026', status: 'Delayed', explanation: 'Weather window reduced the next transfer opportunity by 18 hours.' }],
  deployments: [{ id: 'DEP-008', assetId: 'GEN-104', destination: 'Maitri power shed', assignee: 'Milan Das', status: 'In progress' }],
  consumption: [{ id: 'CON-118', item: 'Diesel fuel', quantity: 42, station: 'Maitri', reason: 'Generator load test', date: '13 Sep 2026' }],
  alerts: [{ id: 'ALT-041', title: 'Medical kits below critical threshold', severity: 'Critical', explanation: 'Bharati has 12 kits against a threshold of 20. Link a shipment or approve replenishment.', resolved: false }],
  logistics: [{ id: 'LOG-031', type: 'Shipment', reference: 'SH-204', origin: 'Cape Town', destination: 'Maitri', status: 'Delayed', owner: 'Milan Das', explanation: 'Weather window reduced the next transfer opportunity by 18 hours.' }],
  maintenance: [{ id: 'WO-118', assetId: 'VEH-022', work: 'Track inspection and hydraulic service', priority: 'Priority', status: 'In progress', due: '14 Sep 2026', technician: 'R. Menon', explanation: 'Snow vehicle is required for the next Bharati field sortie.' }],
}

function loadOperationalModel(): OperationalModel {
  try {
    const saved = localStorage.getItem('ploropsis-operational-model')
    return saved ? JSON.parse(saved) as OperationalModel : seedOperationalModel
  } catch {
    return seedOperationalModel
  }
}

function App() {
  const [view, setView] = useState<View>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [model, setModel] = useState<OperationalModel>(loadOperationalModel)

  useEffect(() => { localStorage.setItem('ploropsis-operational-model', JSON.stringify(model)) }, [model])

  const pageTitle = view === 'dashboard' ? 'Operations overview' : view === 'assets' ? 'Asset registry' : view === 'inventory' ? 'Inventory control' : view === 'logistics' ? 'Logistics control' : view === 'maintenance' ? 'Maintenance control' : view === 'personnel' ? 'Personnel readiness' : view === 'alerts' ? 'Alert center' : 'Decision analytics'
  const pageDescription = view === 'dashboard' ? 'Live readiness picture for the current polar operation.' : view === 'assets' ? 'Track condition, location and lifecycle of every field asset.' : view === 'inventory' ? 'Monitor consumables, thresholds and stock movement across stations.' : view === 'logistics' ? 'Coordinate movement, receipt and handover of expedition cargo.' : view === 'maintenance' ? 'Keep equipment serviceable with accountable work orders.' : view === 'personnel' ? 'See who is available, deployed and responsible for the next action.' : view === 'alerts' ? 'Explain operational risk and close the loop on response.' : 'Understand utilization, consumption and operational pressure by station.'

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
          <div><strong>ploropsis</strong><span>NCPOR COMMAND</span></div>
          <button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <div className="workspace-switcher"><div className="station-dot" /><div><span>ACTIVE OPERATION</span><strong>ISEA-46 / Maitri</strong></div><ChevronRight size={15} /></div>
        <nav className="main-nav" aria-label="Primary navigation">
          <p className="nav-label">Command center</p>
          {navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => navigate(id)}><Icon size={18} /><span>{label}</span>{id === 'dashboard' && <span className="nav-pulse" />}</button>)}
        </nav>
        <div className="sidebar-footer"><button className="nav-item"><Settings size={18} /><span>Settings</span></button><div className="user-chip"><div className="avatar">EM</div><div><strong>Expedition manager</strong><span>Operations team</span></div><ChevronRight size={15} /></div></div>
      </aside>
      {sidebarOpen && <button className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-label="Close navigation overlay" />}
      <main className="main-content">
        <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="breadcrumbs"><span>ISEA-46</span><ChevronRight size={14} /><strong>{pageTitle}</strong></div><div className="topbar-actions"><label className="global-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search command center" /><kbd>⌘ K</kbd></label><button className="icon-button notification-button" aria-label="Notifications"><Bell size={19} /><span /></button><div className="top-avatar">AR</div></div></header>
        <div className="page-wrap">
          <div className="page-heading"><div><div className="eyebrow"><span className="live-dot" /> SYSTEMS NOMINAL <span className="eyebrow-divider">/</span> 13 SEPTEMBER 2026</div><h1>{pageTitle}</h1><p>{pageDescription}</p></div><div className="heading-actions"><button className="secondary-button"><CalendarDays size={16} /> Last 30 days</button><button className="primary-button" onClick={() => navigate(view === 'assets' ? 'assets' : 'inventory')}><Activity size={16} /> Quick action</button></div></div>
          {view === 'dashboard' && <Dashboard navigate={navigate} />}
          {view === 'assets' && <AssetsPage search={search} onSelect={setSelectedAsset} />}
          {view === 'inventory' && <InventoryPage search={search} />}
          {view === 'logistics' && <LogisticsPage model={model} setModel={setModel} />}
          {view === 'maintenance' && <MaintenancePage model={model} setModel={setModel} />}
          {view === 'personnel' && <PersonnelPage model={model} />}
          {view === 'alerts' && <AlertsPage model={model} setModel={setModel} />}
          {view === 'analytics' && <AnalyticsPage />}
        </div>
      </main>
      {selectedAsset && <AssetDrawer asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}
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

function LogisticsPage({ model, setModel }: { model: OperationalModel; setModel: React.Dispatch<React.SetStateAction<OperationalModel>> }) {
  const [reference, setReference] = useState('')
  const [explanation, setExplanation] = useState('')
  const [type, setType] = useState<LogisticsRecord['type']>('Shipment')
  const addRecord = () => {
    const label = reference.trim() || `${type} request`
    setModel((current) => ({ ...current, logistics: [...current.logistics, { id: `LOG-${String(current.logistics.length + 32).padStart(3, '0')}`, type, reference: label, origin: 'Cape Town', destination: 'Maitri', status: type === 'Receipt' ? 'Completed' : 'Planned', owner: 'Expedition manager', explanation: explanation.trim() || 'Record created for operational coordination.' }] }))
    setReference('')
    setExplanation('')
  }
  return <div className="module-stack"><div className="inventory-summary"><div><span>Active movements</span><strong>{model.logistics.filter((item) => item.status !== 'Completed').length}</strong><small>shipments, transfers and receipts in motion</small></div><div><span>Delayed</span><strong className="text-critical">{model.logistics.filter((item) => item.status === 'Delayed').length}</strong><small>need a route decision</small></div><div><span>Completed</span><strong>{model.logistics.filter((item) => item.status === 'Completed').length}</strong><small>handoffs recorded this operation</small></div></div><section className="panel table-panel"><div className="table-heading"><div><h2>Movement register</h2><p>Every cargo handoff has an owner, status and explanation.</p></div><div className="inline-actions"><select className="compact-select" value={type} onChange={(event) => setType(event.target.value as LogisticsRecord['type'])}><option>Shipment</option><option>Receipt</option><option>Transfer</option></select><button className="primary-button" onClick={addRecord}><Plus size={16} /> Add movement</button></div></div><div className="table-scroll"><table><thead><tr><th>Reference</th><th>Type</th><th>Route</th><th>Status</th><th>Owner</th><th>Explanation</th></tr></thead><tbody>{model.logistics.map((item) => <tr key={item.id}><td><strong>{item.reference}</strong><span className="table-subtext">{item.id}</span></td><td>{item.type}</td><td>{item.origin} → {item.destination}</td><td><WorkflowBadge status={item.status} /></td><td>{item.owner}</td><td className="table-explanation">{item.explanation}</td></tr>)}</tbody></table></div></section><section className="panel inline-form-panel"><div><div className="panel-kicker">RECORD CONTEXT</div><h2>Explain the next movement</h2><p>Capture why the cargo is moving, who owns it, and what happens on arrival.</p></div><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Reference or cargo name" /><input value={explanation} onChange={(event) => setExplanation(event.target.value)} placeholder="Route decision or handoff note" /><button className="secondary-button" onClick={addRecord}><Plus size={15} /> Save movement</button></section></div>
}

function MaintenancePage({ model, setModel }: { model: OperationalModel; setModel: React.Dispatch<React.SetStateAction<OperationalModel>> }) {
  const [work, setWork] = useState('')
  const [priority, setPriority] = useState<MaintenanceRecord['priority']>('Routine')
  const addWorkOrder = () => { setModel((current) => ({ ...current, maintenance: [...current.maintenance, { id: `WO-${String(current.maintenance.length + 119).padStart(3, '0')}`, assetId: current.assets[0]?.id || 'Unassigned', work: work.trim() || 'Scheduled inspection', priority, status: 'Scheduled', due: '20 Sep 2026', technician: 'Maintenance team', explanation: 'Service request created from the maintenance control view.' }] })); setWork('') }
  const updateStatus = (id: string, status: MaintenanceRecord['status']) => setModel((current) => ({ ...current, maintenance: current.maintenance.map((item) => item.id === id ? { ...item, status } : item) }))
  return <div className="module-stack"><div className="inventory-summary"><div><span>Open work orders</span><strong>{model.maintenance.filter((item) => item.status !== 'Completed').length}</strong><small>requiring technician attention</small></div><div><span>Urgent</span><strong className="text-critical">{model.maintenance.filter((item) => item.priority === 'Urgent').length}</strong><small>priority service requests</small></div><div><span>Serviceable fleet</span><strong>{Math.round((model.assets.filter((asset) => asset.status === 'Operational').length / Math.max(model.assets.length, 1)) * 100)}%</strong><small>assets currently operational</small></div></div><section className="panel table-panel"><div className="table-heading"><div><h2>Maintenance work orders</h2><p>Schedule, assign, execute and close equipment service.</p></div><div className="inline-actions"><select className="compact-select" value={priority} onChange={(event) => setPriority(event.target.value as MaintenanceRecord['priority'])}><option>Routine</option><option>Priority</option><option>Urgent</option></select><button className="primary-button" onClick={addWorkOrder}><Plus size={16} /> New work order</button></div></div><div className="table-scroll"><table><thead><tr><th>Work order</th><th>Asset</th><th>Priority</th><th>Due</th><th>Technician</th><th>Status</th><th /></tr></thead><tbody>{model.maintenance.map((item) => <tr key={item.id}><td><strong>{item.work}</strong><span className="table-subtext">{item.id} · {item.explanation}</span></td><td>{item.assetId}</td><td><span className={`priority-label ${item.priority.toLowerCase()}`}>{item.priority}</span></td><td>{item.due}</td><td>{item.technician}</td><td><WorkflowBadge status={item.status === 'Blocked' ? 'Delayed' : item.status === 'Scheduled' ? 'Planned' : item.status} /></td><td><button className="text-button" onClick={() => updateStatus(item.id, item.status === 'Completed' ? 'Scheduled' : 'Completed')}>{item.status === 'Completed' ? 'Reopen' : 'Complete'}</button></td></tr>)}</tbody></table></div></section><section className="panel inline-form-panel"><div><div className="panel-kicker">SERVICE REQUEST</div><h2>What needs attention?</h2><p>Create a traceable work order before equipment becomes unavailable.</p></div><input value={work} onChange={(event) => setWork(event.target.value)} placeholder="Inspection, repair or service task" /><button className="secondary-button" onClick={addWorkOrder}><Plus size={15} /> Save work order</button></section></div>
}

function PersonnelPage({ model }: { model: OperationalModel }) { return <div className="module-stack"><section className="panel table-panel"><div className="table-heading"><div><h2>Personnel readiness</h2><p>Accountability for field work, logistics and equipment.</p></div><span className="workflow-count">{model.people.filter((person) => person.status === 'Available').length} available</span></div><div className="table-scroll"><table><thead><tr><th>Person</th><th>Role</th><th>Station</th><th>Status</th><th>Linked responsibilities</th></tr></thead><tbody>{model.people.map((person) => <tr key={person.id}><td><strong>{person.name}</strong><span className="table-subtext">{person.id}</span></td><td>{person.role}</td><td>{person.station}</td><td><span className={`status-badge ${person.status === 'Available' ? 'operational' : 'maintenance'}`}><i />{person.status}</span></td><td>{model.deployments.filter((deployment) => deployment.assignee === person.name).length} equipment deployment(s)</td></tr>)}</tbody></table></div></section></div> }

function AlertsPage({ model, setModel }: { model: OperationalModel; setModel: React.Dispatch<React.SetStateAction<OperationalModel>> }) { const unresolved = model.alerts.filter((alert) => !alert.resolved); const resolve = (id: string) => setModel((current) => ({ ...current, alerts: current.alerts.map((alert) => alert.id === id ? { ...alert, resolved: !alert.resolved } : alert) })); return <div className="module-stack"><section className="panel table-panel"><div className="table-heading"><div><h2>Alert center</h2><p>{unresolved.length} open alert(s) with an explanation and response state.</p></div><button className="primary-button" onClick={() => setModel((current) => ({ ...current, alerts: [...current.alerts, { id: `ALT-${String(current.alerts.length + 42).padStart(3, '0')}`, title: 'Operator review required', severity: 'Info', explanation: 'Created manually for follow-up during the next command review.', resolved: false }] }))}><Plus size={16} /> Generate alert</button></div><div className="attention-list alert-list">{model.alerts.map((alert) => <div className="attention-item" key={alert.id}><span className={`severity-icon ${alert.resolved ? 'resolved' : alert.severity.toLowerCase()}`}><AlertTriangle size={15} /></span><div><strong>{alert.title}</strong><span>{alert.explanation}</span></div><button className="text-button" onClick={() => resolve(alert.id)}>{alert.resolved ? 'Reopen' : 'Resolve'}</button></div>)}</div></section></div> }

function WorkflowBadge({ status }: { status: WorkflowStatus }) { const key = status.toLowerCase().replace(' ', '-'); return <span className={`status-badge ${key}`}><i />{status}</span> }

function ExpeditionPortfolio({ model, setModel }: { model: OperationalModel; setModel: React.Dispatch<React.SetStateAction<OperationalModel>> }) {
  const [purpose, setPurpose] = useState('')
  const [amount, setAmount] = useState('')
  const [owner, setOwner] = useState('Expedition manager')
  const [status, setStatus] = useState<WorkflowStatus>('In progress')
  const [explanation, setExplanation] = useState('')
  const addExpedition = () => {
    const nextId = `EXP-${String(model.expenditures.length + 27).padStart(3, '0')}`
    setModel((current) => ({ ...current, expenditures: [...current.expenditures, { id: nextId, purpose: purpose.trim() || 'New expedition requirement', amount: Number(amount) || 0, owner: owner.trim() || 'Expedition manager', status, explanation: explanation.trim() || 'No additional explanation provided.' }] }))
    setPurpose('')
    setAmount('')
    setExplanation('')
  }
  const removeExpedition = (id: string) => setModel((current) => ({ ...current, expenditures: current.expenditures.filter((item) => item.id !== id) }))
  return <section className="panel expedition-portfolio"><div className="panel-header"><div><div className="panel-kicker">EXPEDITION PORTFOLIO</div><h2>Current expedition expenditures</h2><p>Add or remove the expenditure records that are active for this operation.</p></div><span className="workflow-count">{model.expenditures.length} tracked</span></div><div className="expedition-list">{model.expenditures.map((item) => <article className="expedition-card" key={item.id}><div className="expedition-card-top"><span className="record-id">{item.id}</span><WorkflowBadge status={item.status} /><button className="icon-button" onClick={() => removeExpedition(item.id)} aria-label={`Remove ${item.purpose}`}><X size={15} /></button></div><h3>{item.purpose}</h3><div className="expedition-meta"><span>{item.owner}</span><strong>{item.amount ? `₹${item.amount.toLocaleString()}` : 'Amount pending'}</strong></div><p>{item.explanation}</p></article>)}</div><div className="expedition-form"><input value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="Expedition expenditure" /><input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount" /><input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Owner" /><select value={status} onChange={(event) => setStatus(event.target.value as WorkflowStatus)}><option>Planned</option><option>In progress</option><option>Completed</option><option>Delayed</option></select><input value={explanation} onChange={(event) => setExplanation(event.target.value)} placeholder="Why is this expenditure needed?" /><button className="primary-button" onClick={addExpedition}><Plus size={16} /> Add expedition</button></div></section>
}

function OperationsPage({ model, setModel }: { model: OperationalModel; setModel: React.Dispatch<React.SetStateAction<OperationalModel>> }) {
  const [activeStep, setActiveStep] = useState(0)
  const [name, setName] = useState('')
  const [explanation, setExplanation] = useState('')
  const steps = [
    { label: 'Create expenditure', detail: 'Authorize the cost before stock or transport is committed.', icon: CoinsIcon, collection: 'expenditures' },
    { label: 'Add person and asset', detail: 'Create the accountable people and equipment records.', icon: Users, collection: 'people' },
    { label: 'Add inventory', detail: 'Register stock with a threshold so shortages can become alerts.', icon: PackageSearch, collection: 'inventory' },
    { label: 'Create shipment', detail: 'Define cargo, route and expected arrival.', icon: Truck, collection: 'shipments' },
    { label: 'Track shipment', detail: 'Keep route status and delay reasoning visible.', icon: MapPin, collection: 'shipments' },
    { label: 'Receive cargo', detail: 'Turn an arriving shipment into available station stock.', icon: ClipboardCheckIcon, collection: 'shipments' },
    { label: 'Deploy equipment', detail: 'Assign an asset and a person to an operational destination.', icon: Wrench, collection: 'deployments' },
    { label: 'Consume supplies', detail: 'Record usage with a reason for traceability.', icon: Activity, collection: 'consumption' },
    { label: 'Generate alert', detail: 'Explain the risk and make the follow-up explicit.', icon: AlertTriangle, collection: 'alerts' },
    { label: 'View dashboard', detail: 'Read readiness, attention items and station pulse.', icon: LayoutDashboard, collection: 'dashboard' },
    { label: 'View analytics', detail: 'Compare utilization, consumption and route pressure.', icon: BarChart3, collection: 'analytics' },
  ] as const
  const current = steps[activeStep]
  const recordCount = current.collection === 'dashboard' || current.collection === 'analytics' ? 1 : model[current.collection].length

  const commitStep = () => {
    const label = name.trim() || current.label
    const note = explanation.trim() || current.detail
    const id = `${current.collection.slice(0, 3).toUpperCase()}-${String(recordCount + 1).padStart(3, '0')}`
    setModel((existing) => {
      if (current.collection === 'expenditures') return { ...existing, expenditures: [...existing.expenditures, { id, purpose: label, amount: 0, owner: 'Expedition manager', status: 'Planned', explanation: note }] }
      if (current.collection === 'people') return { ...existing, people: [...existing.people, { id, name: label, role: 'Expedition team', station: 'Maitri', status: 'Available' }], assets: [...existing.assets, { id: `AST-${String(existing.assets.length + 1).padStart(3, '0')}`, name: `${label} field kit`, category: 'Field equipment', station: 'Maitri', status: 'Operational', condition: 'Good', lastInspection: 'Not yet inspected', nextMaintenance: 'To be scheduled' }] }
      if (current.collection === 'inventory') return { ...existing, inventory: [...existing.inventory, { id, item: label, category: 'General', station: 'Maitri', quantity: 0, unit: 'units', threshold: 0, status: 'Critical', change: 0 }] }
      if (current.collection === 'shipments') {
        const shipment = { id, route: 'To Maitri', cargo: label, eta: 'To be confirmed', status: activeStep === 5 ? 'Completed' as WorkflowStatus : activeStep === 4 ? 'In progress' as WorkflowStatus : 'Planned' as WorkflowStatus, explanation: note }
        return activeStep === 5
          ? { ...existing, shipments: [...existing.shipments, shipment], inventory: [...existing.inventory, { id: `INV-${String(existing.inventory.length + 1).padStart(3, '0')}`, item: label, category: 'Received cargo', station: 'Maitri', quantity: 1, unit: 'consignment', threshold: 1, status: 'Normal', change: 0 }] }
          : { ...existing, shipments: [...existing.shipments, shipment] }
      }
      if (current.collection === 'deployments') return { ...existing, deployments: [...existing.deployments, { id, assetId: 'GEN-104', destination: label, assignee: 'Expedition manager', status: 'Planned' }] }
      if (current.collection === 'consumption') return { ...existing, consumption: [...existing.consumption, { id, item: label, quantity: 1, station: 'Maitri', reason: note, date: '13 Sep 2026' }] }
      if (current.collection === 'alerts') return { ...existing, alerts: [...existing.alerts, { id, title: label, severity: 'Warning', explanation: note, resolved: false }] }
      return existing
    })
    setName('')
    setExplanation('')
  }

  return <div className="operations-layout"><ExpeditionPortfolio model={model} setModel={setModel} />
    <div className="workflow-detail-grid"><section className="panel workflow-explainer"><div className="panel-kicker">STEP {activeStep + 1} · {current.collection.toUpperCase()}</div><h2>{current.label}</h2><p className="workflow-lead">{current.detail}</p><div className="explanation-columns"><div><strong>What it creates</strong><span>{current.collection === 'dashboard' || current.collection === 'analytics' ? 'A live view of the operational model.' : `A new ${current.collection.slice(0, -1)} record in the shared model.`}</span></div><div><strong>Why it matters</strong><span>{current.collection === 'alerts' ? 'Operators can act before a small variance becomes a field disruption.' : 'Downstream teams get context instead of an isolated transaction.'}</span></div><div><strong>Current records</strong><span>{recordCount} tracked in this operation.</span></div></div>{current.collection !== 'dashboard' && current.collection !== 'analytics' && <div className="workflow-form"><label>Record name or cargo<input value={name} onChange={(event) => setName(event.target.value)} placeholder={current.label} /></label><label>Explanation / reason<textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} placeholder="Explain the decision, impact, or next action..." rows={3} /></label><button className="primary-button" onClick={commitStep}><Plus size={16} /> Add to model</button></div>}</section><section className="panel workflow-ledger"><div className="panel-header"><div><div className="panel-kicker">LIVE LEDGER</div><h2>{current.collection === 'dashboard' ? 'Dashboard ready' : current.collection === 'analytics' ? 'Analytics ready' : 'Recent records'}</h2></div><ClipboardList size={18} /></div>{current.collection === 'dashboard' || current.collection === 'analytics' ? <div className="workflow-view-card"><Gauge size={28} /><strong>Open {current.label.toLowerCase()}</strong><span>Use the command center navigation to see the model summarized in context.</span></div> : <div className="workflow-records">{getWorkflowRecords(model, current.collection).slice(-4).reverse().map((record) => <div className="workflow-record" key={record.id}><span className="record-icon"><CircleCheck size={14} /></span><div><strong>{record.title}</strong><span>{record.meta}</span></div></div>)}</div>}</section></div>
  </div>
}

function getWorkflowRecords(model: OperationalModel, collection: string): { id: string; title: string; meta: string }[] {
  if (collection === 'expenditures') return model.expenditures.map((item) => ({ id: item.id, title: item.purpose, meta: `${item.status} · ${item.explanation}` }))
  if (collection === 'people') return model.people.map((item) => ({ id: item.id, title: item.name, meta: `${item.role} · ${item.station}` }))
  if (collection === 'inventory') return model.inventory.map((item) => ({ id: item.id, title: item.item, meta: `${item.quantity} ${item.unit} · ${item.status}` }))
  if (collection === 'shipments') return model.shipments.map((item) => ({ id: item.id, title: item.cargo, meta: `${item.status} · ${item.route}` }))
  if (collection === 'deployments') return model.deployments.map((item) => ({ id: item.id, title: item.destination, meta: `${item.assetId} · ${item.assignee}` }))
  if (collection === 'consumption') return model.consumption.map((item) => ({ id: item.id, title: item.item, meta: `${item.quantity} used · ${item.reason}` }))
  return model.alerts.map((item) => ({ id: item.id, title: item.title, meta: `${item.severity} · ${item.explanation}` }))
}

function CoinsIcon({ size = 18 }: { size?: number }) { return <span className="coin-icon" style={{ width: size, height: size }}>$</span> }
function ClipboardCheckIcon({ size = 18 }: { size?: number }) { return <span className="clipboard-check-icon"><ClipboardList size={size} /><CircleCheck size={size / 2} /></span> }

function Kpi({ label, value, detail, trend, warning, icon }: { label: string; value: string; detail: string; trend: 'up' | 'down'; warning?: boolean; icon: React.ReactNode }) { return <article className={`kpi-card ${warning ? 'kpi-warning' : ''}`}><div className="kpi-top"><span className="kpi-icon">{icon}</span><span className={`trend ${trend}`}>{trend === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{trend === 'up' ? '3.2%' : 'Needs review'}</span></div><span className="kpi-label">{label}</span><strong className="kpi-value">{value}</strong><span className="kpi-detail">{detail}</span></article> }
function PanelHeader({ title, subtitle, action, onClick }: { title: string; subtitle: string; action?: string; onClick?: () => void }) { return <div className="panel-header"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button className="text-button" onClick={onClick}>{action}<ChevronRight size={14} /></button>}</div> }
function Attention({ severity, title, meta }: { severity: 'critical' | 'warning' | 'resolved'; title: string; meta: string }) { return <div className="attention-item"><span className={`severity-icon ${severity}`}>{severity === 'resolved' ? <ShieldCheck size={15} /> : <AlertTriangle size={15} />}</span><div><strong>{title}</strong><span>{meta}</span></div><ChevronRight size={15} /></div> }

function AssetsPage({ search, onSelect }: { search: string; onSelect: (asset: Asset) => void }) {
  const [status, setStatus] = useState('All statuses')
  const filtered = useMemo(() => assets.filter((asset) => `${asset.id} ${asset.name} ${asset.category} ${asset.station}`.toLowerCase().includes(search.toLowerCase()) && (status === 'All statuses' || asset.status === status)), [search, status])
  return <div className="module-stack"><div className="module-toolbar"><div className="filter-pills"><button className={status === 'All statuses' ? 'selected' : ''} onClick={() => setStatus('All statuses')}>All assets <span>1,248</span></button>{(['Operational', 'Maintenance', 'Damaged'] as const).map((item) => <button key={item} className={status === item ? 'selected' : ''} onClick={() => setStatus(item)}>{item} <span>{item === 'Operational' ? '1,102' : item === 'Maintenance' ? '72' : '26'}</span></button>)}</div><button className="primary-button"><Boxes size={16} /> Register asset</button></div><section className="panel table-panel"><div className="table-heading"><div><h2>Asset registry</h2><p>{filtered.length} records matching current view</p></div><button className="icon-button"><Settings size={17} /></button></div><div className="table-scroll"><table><thead><tr><th>Asset</th><th>Category</th><th>Station</th><th>Status</th><th>Condition</th><th>Next maintenance</th><th /></tr></thead><tbody>{filtered.map((asset) => <tr key={asset.id} onClick={() => onSelect(asset)}><td><div className="asset-cell"><span className="asset-thumb"><Wrench size={16} /></span><div><strong>{asset.name}</strong><span>{asset.id}</span></div></div></td><td>{asset.category}</td><td><span className="location-cell"><MapPin size={14} />{asset.station}</span></td><td><StatusBadge status={asset.status} /></td><td>{asset.condition}</td><td>{asset.nextMaintenance}</td><td><ChevronRight size={16} className="row-arrow" /></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state"><PackageSearch size={26} /><strong>No assets found</strong><span>Try changing your search or filters.</span></div>}</div></section></div>
}

function InventoryPage({ search }: { search: string }) {
  const filtered = inventory.filter((item) => `${item.item} ${item.category} ${item.station}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="module-stack"><div className="inventory-summary"><div><span>Stock health</span><strong>82%</strong><small>of tracked inventory is above threshold</small></div><div><span>Critical items</span><strong className="text-critical">4</strong><small>require immediate replenishment</small></div><div><span>Consumption this month</span><strong>1,847</strong><small className="positive">↓ 6.4% vs August</small></div></div><section className="panel table-panel"><div className="table-heading"><div><h2>Inventory control</h2><p>Consumables and operational stock across stations</p></div><button className="primary-button"><Activity size={16} /> Record movement</button></div><div className="table-scroll"><table><thead><tr><th>Item</th><th>Station</th><th>On hand</th><th>Threshold</th><th>Status</th><th>30 day change</th><th /></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><div className="asset-cell"><span className="inventory-thumb"><PackageSearch size={16} /></span><div><strong>{item.item}</strong><span>{item.category} · {item.id}</span></div></div></td><td><span className="location-cell"><MapPin size={14} />{item.station}</span></td><td><strong>{item.quantity.toLocaleString()} {item.unit}</strong></td><td>{item.threshold} {item.unit}</td><td><StatusBadge status={item.status} /></td><td className={item.change < 0 ? 'text-critical' : 'positive'}>{item.change > 0 ? '+' : ''}{item.change}%</td><td><ChevronRight size={16} className="row-arrow" /></td></tr>)}</tbody></table></div></section></div>
}

function StatusBadge({ status }: { status: AssetStatus | StockStatus }) { const key = status.toLowerCase().replace(' ', '-'); return <span className={`status-badge ${key}`}><i />{status}</span> }
function AnalyticsPage() { return <div className="analytics-grid"><section className="panel analytics-main"><PanelHeader title="Station utilization" subtitle="How intensively each station's assets are being used" /><ResponsiveContainer width="100%" height={250}><BarChart data={stationUsage} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 5 }}><CartesianGrid horizontal={false} stroke="#e7eeeb" /><XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#809096', fontSize: 11 }} /><YAxis type="category" dataKey="station" axisLine={false} tickLine={false} tick={{ fill: '#40555b', fontSize: 12, fontWeight: 600 }} width={58} /><Tooltip cursor={{ fill: '#f1f6f4' }} contentStyle={{ borderRadius: 8, border: '1px solid #dbe5e2' }} /><Bar dataKey="utilization" fill="#319f7b" radius={[0, 5, 5, 0]} barSize={23} /></BarChart></ResponsiveContainer><div className="chart-footnote"><span><i className="key-line" /> Asset utilization</span><strong>Average 76.3%</strong></div></section><section className="panel analytics-score"><div className="panel-kicker">OPERATIONAL HEALTH SCORE</div><div className="score-ring"><div><strong>87</strong><span>/ 100</span></div></div><p>Readiness is holding steady, with inventory resilience as the main opportunity.</p><div className="score-breakdown"><div><span>Asset availability</span><strong>92%</strong></div><div><span>Stock resilience</span><strong>74%</strong></div><div><span>Route reliability</span><strong>85%</strong></div></div></section><section className="panel analytics-trend"><PanelHeader title="Consumption pressure" subtitle="Daily inventory usage, normalized across stations" /><ResponsiveContainer width="100%" height={210}><AreaChart data={consumption}><defs><linearGradient id="analyticsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e5a54b" stopOpacity={0.26} /><stop offset="100%" stopColor="#e5a54b" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e7eeeb" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#809096', fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#809096', fontSize: 11 }} /><Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #dbe5e2' }} /><Area type="monotone" dataKey="value" stroke="#d39032" fill="url(#analyticsFill)" strokeWidth={2.5} /></AreaChart></ResponsiveContainer></section><section className="panel insights-panel"><PanelHeader title="Key signals" subtitle="Derived from the current operating picture" /><div className="signal-card"><span className="signal-icon amber"><Activity size={17} /></span><div><strong>Consumption is trending up</strong><p>Daily usage is 14% higher than the 30-day baseline.</p></div></div><div className="signal-card"><span className="signal-icon green"><ShieldCheck size={17} /></span><div><strong>Maitri fleet is highly available</strong><p>92% of assets are operational and inspection-compliant.</p></div></div></section></div> }
function AssetDrawer({ asset, onClose }: { asset: Asset; onClose: () => void }) { return <><button className="drawer-overlay" onClick={onClose} aria-label="Close asset details" /><aside className="asset-drawer"><div className="drawer-header"><div><span className="eyebrow">ASSET DETAIL</span><h2>{asset.id}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close asset details"><X size={19} /></button></div><div className="drawer-hero"><span className="large-asset-icon"><Wrench size={27} /></span><div><h3>{asset.name}</h3><span>{asset.category} equipment</span></div><StatusBadge status={asset.status} /></div><div className="detail-grid"><div><span>Location</span><strong><MapPin size={14} /> {asset.station} Station</strong></div><div><span>Condition</span><strong>{asset.condition}</strong></div><div><span>Last inspection</span><strong>{asset.lastInspection}</strong></div><div><span>Next maintenance</span><strong>{asset.nextMaintenance}</strong></div></div><div className="drawer-section"><div className="panel-kicker">RECENT LIFECYCLE</div><div className="timeline"><div><i /><span><strong>Inspection completed</strong><small>{asset.lastInspection}</small></span></div><div><i /><span><strong>Assigned to {asset.station}</strong><small>21 Aug 2026</small></span></div><div><i /><span><strong>Maintenance completed</strong><small>14 Jul 2026</small></span></div><div><i /><span><strong>Received at station</strong><small>03 May 2026</small></span></div></div></div><button className="primary-button drawer-action"><ClipboardList size={16} /> View full asset history</button></aside></> }

export default App
