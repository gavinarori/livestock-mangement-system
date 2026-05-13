'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Package, Pill, Wrench, Plus, Search, AlertTriangle, TrendingDown,
  TrendingUp, CheckCircle2, X, BarChart3, Calendar, Hash, Edit2,
  Trash2, ChevronDown, Clock, RefreshCw, ArrowRight, Boxes, FlaskConical
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
interface FeedItem {
  _id: string; name: string; type: string
  quantityKg: number; minimumKg: number
  costPerKg: number; supplier?: string
  lastRestocked?: string; expiryDate?: string
}
interface MedicineItem {
  _id: string; name: string; category: string
  quantity: number; unit: string; minimumQty: number
  expiryDate?: string; batchNumber?: string
  usageCount?: number; supplier?: string
}
interface EquipmentItem {
  _id: string; name: string; type: string
  status: 'operational' | 'maintenance' | 'repair' | 'retired'
  lastServiceDate?: string; nextServiceDate?: string
  usageHours?: number; assignedTo?: string
  location?: string; notes?: string
}

// ── Mock Feed Data ─────────────────────────────────────────────
const mockFeed: FeedItem[] = [
  {
    _id: 'feed-001',
    name: 'Dairy Meal Premium',
    type: 'dairy',
    quantityKg: 420,
    minimumKg: 300,
    costPerKg: 1.45,
    supplier: 'Kenya Feeds Ltd',
    lastRestocked: '2026-05-02',
    expiryDate: '2026-08-10',
  },
  {
    _id: 'feed-002',
    name: 'Broiler Starter Mash',
    type: 'poultry',
    quantityKg: 90,
    minimumKg: 120,
    costPerKg: 1.2,
    supplier: 'Unga Farm Care',
    lastRestocked: '2026-04-20',
    expiryDate: '2026-05-28',
  },
  {
    _id: 'feed-003',
    name: 'Pig Grower Pellets',
    type: 'pig',
    quantityKg: 650,
    minimumKg: 200,
    costPerKg: 1.35,
    supplier: 'Farmers Choice',
    lastRestocked: '2026-05-06',
    expiryDate: '2026-09-01',
  },
  {
    _id: 'feed-004',
    name: 'Hay Bales',
    type: 'roughage',
    quantityKg: 150,
    minimumKg: 150,
    costPerKg: 0.55,
    supplier: 'Nyeri Agro Supplies',
    lastRestocked: '2026-04-10',
    expiryDate: '2026-06-02',
  },
  {
    _id: 'feed-005',
    name: 'Layer Crumbs',
    type: 'poultry',
    quantityKg: 40,
    minimumKg: 100,
    costPerKg: 1.18,
    supplier: 'Sigma Feeds',
    lastRestocked: '2026-03-29',
    expiryDate: '2026-05-18',
  },
  {
    _id: 'feed-006',
    name: 'Goat Mineral Mix',
    type: 'supplement',
    quantityKg: 80,
    minimumKg: 40,
    costPerKg: 2.6,
    supplier: 'VetCare Nutrition',
    lastRestocked: '2026-05-01',
    expiryDate: '2027-01-15',
  },
]

// ── Mock Medicine Data ────────────────────────────────────────
const mockMedicine: MedicineItem[] = [
  {
    _id: 'med-001',
    name: 'Oxytetracycline',
    category: 'antibiotic',
    quantity: 45,
    unit: 'bottles',
    minimumQty: 20,
    expiryDate: '2026-11-10',
    batchNumber: 'OTX-2219',
    usageCount: 18,
    supplier: 'Vet Pharma EA',
  },
  {
    _id: 'med-002',
    name: 'Albendazole Dewormer',
    category: 'dewormer',
    quantity: 12,
    unit: 'packs',
    minimumQty: 15,
    expiryDate: '2026-05-24',
    batchNumber: 'ALB-9921',
    usageCount: 34,
    supplier: 'Agrovet Solutions',
  },
  {
    _id: 'med-003',
    name: 'Newcastle Vaccine',
    category: 'vaccine',
    quantity: 200,
    unit: 'doses',
    minimumQty: 100,
    expiryDate: '2026-05-14',
    batchNumber: 'NCV-402',
    usageCount: 80,
    supplier: 'PoultryMed Ltd',
  },
  {
    _id: 'med-004',
    name: 'Vitamin Boost Injection',
    category: 'supplement',
    quantity: 8,
    unit: 'vials',
    minimumQty: 10,
    expiryDate: '2026-04-29',
    batchNumber: 'VIT-110',
    usageCount: 12,
    supplier: 'Livestock Health Kenya',
  },
  {
    _id: 'med-005',
    name: 'Mastitis Treatment Gel',
    category: 'treatment',
    quantity: 25,
    unit: 'tubes',
    minimumQty: 10,
    expiryDate: '2026-07-30',
    batchNumber: 'MAS-778',
    usageCount: 7,
    supplier: 'VetCare Africa',
  },
  {
    _id: 'med-006',
    name: 'Tick Control Spray',
    category: 'pesticide',
    quantity: 5,
    unit: 'containers',
    minimumQty: 8,
    expiryDate: '2026-06-01',
    batchNumber: 'TCS-991',
    usageCount: 26,
    supplier: 'AgroShield',
  },
]

// ── Mock Equipment Data ───────────────────────────────────────
const mockEquipment: EquipmentItem[] = [
  {
    _id: 'eq-001',
    name: 'Milk Cooling Tank',
    type: 'dairy',
    status: 'operational',
    lastServiceDate: '2026-04-18',
    nextServiceDate: '2026-07-18',
    usageHours: 3820,
    assignedTo: 'Dairy Unit',
    location: 'Main Barn',
    notes: 'Running efficiently after compressor replacement.',
  },
  {
    _id: 'eq-002',
    name: 'Feed Mixer',
    type: 'processing',
    status: 'maintenance',
    lastServiceDate: '2026-03-02',
    nextServiceDate: '2026-05-20',
    usageHours: 2100,
    assignedTo: 'Feed Section',
    location: 'Storage Area',
    notes: 'Motor vibration under inspection.',
  },
  {
    _id: 'eq-003',
    name: 'Egg Incubator',
    type: 'poultry',
    status: 'operational',
    lastServiceDate: '2026-05-01',
    nextServiceDate: '2026-08-01',
    usageHours: 920,
    assignedTo: 'Hatchery',
    location: 'Poultry House B',
  },
  {
    _id: 'eq-004',
    name: 'Water Pump',
    type: 'utility',
    status: 'repair',
    lastServiceDate: '2026-02-15',
    nextServiceDate: '2026-05-15',
    usageHours: 5700,
    assignedTo: 'Irrigation',
    location: 'Borehole Station',
    notes: 'Pressure issues detected during peak hours.',
  },
  {
    _id: 'eq-005',
    name: 'Tractor MF-385',
    type: 'vehicle',
    status: 'operational',
    lastServiceDate: '2026-04-10',
    nextServiceDate: '2026-06-12',
    usageHours: 4480,
    assignedTo: 'Field Operations',
    location: 'Machinery Shed',
  },
  {
    _id: 'eq-006',
    name: 'Automatic Feeder',
    type: 'feeding',
    status: 'retired',
    lastServiceDate: '2025-12-11',
    nextServiceDate: '2026-01-11',
    usageHours: 8800,
    assignedTo: 'Old Poultry Unit',
    location: 'Warehouse',
    notes: 'Replaced with smart feeding system.',
  },
]

// ── Helpers ────────────────────────────────────────────────────
const isLow = (qty: number, min: number) => qty <= min
const isExpiringSoon = (dateStr?: string) => {
  if (!dateStr) return false
  return (new Date(dateStr).getTime() - Date.now()) / 86400000 < 30
}
const isExpired = (dateStr?: string) => {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}
const daysUntil = (dateStr?: string) => {
  if (!dateStr) return null
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

const StockBar = ({ qty, min, max }: { qty: number; min: number; max: number }) => {
  const pct = Math.min((qty / Math.max(max, 1)) * 100, 100)
  const color = qty <= min ? 'bg-destructive' : qty <= min * 2 ? 'bg-chart-3' : 'bg-chart-1'
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-muted-foreground w-24 text-right">{qty.toLocaleString()} / {max.toLocaleString()}</span>
    </div>
  )
}

const StatusBadge = ({ status }: { status: EquipmentItem['status'] }) => {
  const map: Record<string, string> = {
    operational: 'badge-healthy',
    maintenance: 'badge-recovering',
    repair: 'badge-injured',
    retired: 'badge-sick',
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] || ''}`}>{status}</span>
}

const StatCard = ({ icon: Icon, label, value, sub, alert }: any) => (
  <div className={`card-hover bg-card border rounded-2xl p-5 flex items-center gap-4 ${alert ? 'border-destructive/30' : 'border-border'}`}>
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${alert ? 'bg-destructive/10' : 'bg-primary/10'}`}>
      <Icon className={`w-5 h-5 ${alert ? 'text-destructive' : 'text-primary'}`} />
    </div>
    <div>
      <div className="stat-number text-2xl font-bold leading-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      {sub && <div className={`text-xs font-medium mt-0.5 ${alert ? 'text-destructive' : 'text-primary'}`}>{sub}</div>}
    </div>
  </div>
)

// ── Main page ──────────────────────────────────────────────────
export default function InventoryPage() {
  const [tab, setTab] = useState<'feed' | 'medicine' | 'equipment'>('feed')
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [medicine, setMedicine] = useState<MedicineItem[]>([])
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showAlertsOnly, setShowAlertsOnly] = useState(false)
  const router = useRouter()
/*
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    loadAll(token)
  }, [router])
  */
 useEffect(() => {
  setLoading(true)

  setTimeout(() => {
    setFeed(mockFeed)
    setMedicine(mockMedicine)
    setEquipment(mockEquipment)
    setLoading(false)
  }, 1200)
}, [])

  const loadAll = async (token: string) => {
    try {
      setLoading(true)
      const h = { Authorization: `Bearer ${token}` }
      const [fRes, mRes, eRes] = await Promise.all([
        fetch('/api/inventory/feed', { headers: h }),
        fetch('/api/inventory/medicine', { headers: h }),
        fetch('/api/inventory/equipment', { headers: h }),
      ])
      if (fRes.ok) { const d = await fRes.json(); setFeed(d.items || []) }
      if (mRes.ok) { const d = await mRes.json(); setMedicine(d.items || []) }
      if (eRes.ok) { const d = await eRes.json(); setEquipment(d.items || []) }
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleDeleteFeed = async (id: string) => {
    if (!confirm('Delete this feed item?')) return
    try {
      const token = localStorage.getItem('token')!
      await fetch(`/api/inventory/feed/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      setFeed(p => p.filter(f => f._id !== id))
    } catch (e: any) { setError(e.message) }
  }
  const handleDeleteMedicine = async (id: string) => {
    if (!confirm('Delete this medicine?')) return
    try {
      const token = localStorage.getItem('token')!
      await fetch(`/api/inventory/medicine/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      setMedicine(p => p.filter(m => m._id !== id))
    } catch (e: any) { setError(e.message) }
  }
  const handleDeleteEquipment = async (id: string) => {
    if (!confirm('Delete this equipment?')) return
    try {
      const token = localStorage.getItem('token')!
      await fetch(`/api/inventory/equipment/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      setEquipment(p => p.filter(e => e._id !== id))
    } catch (e: any) { setError(e.message) }
  }

  const stats = useMemo(() => ({
    lowFeed: feed.filter(f => isLow(f.quantityKg, f.minimumKg)).length,
    expiringMeds: medicine.filter(m => isExpiringSoon(m.expiryDate) || isExpired(m.expiryDate)).length,
    equipmentIssues: equipment.filter(e => e.status !== 'operational').length,
    totalFeedValue: feed.reduce((s, f) => s + f.quantityKg * f.costPerKg, 0),
    servicesDue: equipment.filter(e => { const d = daysUntil(e.nextServiceDate); return d !== null && d <= 14 }).length,
  }), [feed, medicine, equipment])

  const q = search.toLowerCase()
  const filteredFeed = feed.filter(f => {
    const match = !q || f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q)
    const alert = isLow(f.quantityKg, f.minimumKg) || isExpiringSoon(f.expiryDate)
    return match && (!showAlertsOnly || alert)
  })
  const filteredMed = medicine.filter(m => {
    const match = !q || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
    const alert = isLow(m.quantity, m.minimumQty) || isExpiringSoon(m.expiryDate) || isExpired(m.expiryDate)
    return match && (!showAlertsOnly || alert)
  })
  const filteredEquip = equipment.filter(e => {
    const match = !q || e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q)
    const alert = e.status !== 'operational'
    return match && (!showAlertsOnly || alert)
  })

  const TABS = [
    { id: 'feed', label: 'Feed', icon: Package, count: feed.length, alerts: stats.lowFeed },
    { id: 'medicine', label: 'Medicine', icon: Pill, count: medicine.length, alerts: stats.expiringMeds },
    { id: 'equipment', label: 'Equipment', icon: Wrench, count: equipment.length, alerts: stats.equipmentIssues },
  ] as const

  const addLinks: Record<string, string> = {
    feed: '/inventory/feed/new',
    medicine: '/inventory/medicine/new',
    equipment: '/inventory/equipment/new',
  }

  if (loading) return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto flex flex-col gap-5">
      <div className="skeleton h-10 w-64 rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  )

  return (
    <main className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-6">

        {/* Header */}
        <header className="animate-fade-up flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ animationFillMode: 'forwards' }}>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Boxes className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-primary">Inventory</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Resource Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Feed, medicine, and equipment tracking</p>
          </div>
          <Link href={addLinks[tab]}>
            <Button className="gap-2 rounded-xl shadow-sm shadow-primary/20 hover:shadow-md transition-shadow">
              <Plus className="w-4 h-4" /> Add {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Button>
          </Link>
        </header>

        {error && (
          <div role="alert" className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
            <button className="ml-auto" onClick={() => setError('')}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Stats */}
        <div className="animate-fade-up delay-75 grid grid-cols-2 md:grid-cols-4 gap-3" style={{ animationFillMode: 'forwards' }}>
          <StatCard icon={TrendingDown} label="Low feed stock" value={stats.lowFeed} alert={stats.lowFeed > 0} sub={stats.lowFeed > 0 ? 'Restock needed' : 'All stocked'} />
          <StatCard icon={FlaskConical} label="Expiring medicines" value={stats.expiringMeds} alert={stats.expiringMeds > 0} sub={stats.expiringMeds > 0 ? 'Action required' : 'All current'} />
          <StatCard icon={Wrench} label="Equipment issues" value={stats.equipmentIssues} alert={stats.equipmentIssues > 0} sub={stats.servicesDue > 0 ? `${stats.servicesDue} service due` : undefined} />
          <StatCard icon={BarChart3} label="Total feed value" value={`$${stats.totalFeedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        </div>

        {/* Tabs */}
        <div className="animate-fade-up delay-100 flex gap-1 p-1 bg-muted rounded-2xl w-fit" style={{ animationFillMode: 'forwards' }}>
          {TABS.map(({ id, label, icon: Icon, count, alerts }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all relative ${tab === id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon className="w-4 h-4" />{label}
              {count > 0 && <span className="text-xs bg-muted text-muted-foreground rounded-full px-1.5">{count}</span>}
              {alerts > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center font-bold">{alerts}</span>}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="animate-fade-up delay-150 flex gap-2 flex-wrap" style={{ animationFillMode: 'forwards' }}>
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-9 rounded-xl bg-card h-9 text-sm" />
          </div>
          <button onClick={() => setShowAlertsOnly(p => !p)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors ${showAlertsOnly ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'border-border text-muted-foreground hover:border-destructive/30 hover:text-destructive'}`}>
            <AlertTriangle className="w-4 h-4" />
            {showAlertsOnly ? 'Alerts only' : 'Show alerts only'}
          </button>
        </div>

        {/* ── FEED TAB ── */}
        {tab === 'feed' && (
          <div className="animate-fade-up flex flex-col gap-3" style={{ animationFillMode: 'forwards' }}>
            {filteredFeed.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground"><Package className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No feed items found</p></div>
            ) : (
              <div className="rounded-2xl border border-border overflow-hidden bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {['Feed / Type', 'Stock (kg)', 'Min Level', 'Cost/kg', 'Supplier', 'Restocked', 'Expiry', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredFeed.map(f => {
                        const low = isLow(f.quantityKg, f.minimumKg)
                        const expiring = isExpiringSoon(f.expiryDate)
                        const expired = isExpired(f.expiryDate)
                        return (
                          <tr key={f._id} className={`group hover:bg-muted/30 transition-colors ${low || expired ? 'bg-destructive/3' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-foreground flex items-center gap-1.5">
                                {(low || expired) && <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
                                {f.name}
                              </div>
                              <div className="text-xs text-muted-foreground capitalize">{f.type}</div>
                            </td>
                            <td className="px-4 py-3 w-48">
                              <div className="font-semibold text-foreground mb-1">{f.quantityKg.toLocaleString()} kg</div>
                              <StockBar qty={f.quantityKg} min={f.minimumKg} max={f.minimumKg * 5} />
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{f.minimumKg.toLocaleString()} kg</td>
                            <td className="px-4 py-3 text-muted-foreground">${f.costPerKg.toFixed(2)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{f.supplier || '—'}</td>
                            <td className="px-4 py-3 text-muted-foreground">{f.lastRestocked ? new Date(f.lastRestocked).toLocaleDateString() : '—'}</td>
                            <td className="px-4 py-3">
                              {f.expiryDate ? (
                                <span className={`text-xs font-medium ${expired ? 'text-destructive' : expiring ? 'text-chart-3' : 'text-muted-foreground'}`}>
                                  {expired ? '⚠ Expired' : expiring ? `${daysUntil(f.expiryDate)}d left` : new Date(f.expiryDate).toLocaleDateString()}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Link href={`/inventory/feed/${f._id}/edit`}>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></Button>
                                </Link>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive hover:text-destructive" onClick={() => handleDeleteFeed(f._id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MEDICINE TAB ── */}
        {tab === 'medicine' && (
          <div className="animate-fade-up flex flex-col gap-3" style={{ animationFillMode: 'forwards' }}>
            {filteredMed.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground"><Pill className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No medicines found</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredMed.map(m => {
                  const low = isLow(m.quantity, m.minimumQty)
                  const expired = isExpired(m.expiryDate)
                  const expiring = isExpiringSoon(m.expiryDate)
                  const days = daysUntil(m.expiryDate)
                  return (
                    <div key={m._id} className={`group card-hover bg-card border rounded-2xl p-4 relative overflow-hidden ${low || expired ? 'border-destructive/30' : 'border-border'}`}>
                      {(low || expired) && <div className="absolute top-0 left-0 right-0 h-0.5 bg-destructive" />}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            {(low || expired) && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                            {m.name}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize mt-0.5">{m.category}</div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <Link href={`/inventory/medicine/${m._id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive hover:text-destructive" onClick={() => handleDeleteMedicine(m._id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          <strong className={`${low ? 'text-destructive' : 'text-foreground'}`}>{m.quantity} {m.unit}</strong>
                          <span>/ min {m.minimumQty}</span>
                        </span>
                        {m.batchNumber && <span className="flex items-center gap-1"><Hash className="w-3 h-3" />Batch: {m.batchNumber}</span>}
                        {m.usageCount !== undefined && <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />Used {m.usageCount}×</span>}
                      </div>
                      <StockBar qty={m.quantity} min={m.minimumQty} max={m.minimumQty * 5} />
                      {m.expiryDate && (
                        <div className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${expired ? 'text-destructive' : expiring ? 'text-chart-3' : 'text-muted-foreground'}`}>
                          <Calendar className="w-3.5 h-3.5" />
                          {expired ? `Expired ${Math.abs(days!)}d ago` : expiring ? `Expires in ${days}d` : `Exp: ${new Date(m.expiryDate).toLocaleDateString()}`}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── EQUIPMENT TAB ── */}
        {tab === 'equipment' && (
          <div className="animate-fade-up flex flex-col gap-3" style={{ animationFillMode: 'forwards' }}>
            {filteredEquip.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground"><Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No equipment found</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredEquip.map(e => {
                  const serviceDays = daysUntil(e.nextServiceDate)
                  const serviceSoon = serviceDays !== null && serviceDays <= 14
                  return (
                    <div key={e._id} className={`group card-hover bg-card border rounded-2xl p-4 relative ${e.status !== 'operational' || serviceSoon ? 'border-destructive/25' : 'border-border'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${e.status === 'operational' ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                            <Wrench className={`w-4 h-4 ${e.status === 'operational' ? 'text-primary' : 'text-destructive'}`} />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-sm leading-tight">{e.name}</div>
                            <div className="text-xs text-muted-foreground capitalize">{e.type}</div>
                          </div>
                        </div>
                        <StatusBadge status={e.status} />
                      </div>

                      <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        {e.location && <span className="flex items-center gap-1.5">📍 {e.location}</span>}
                        {e.assignedTo && <span className="flex items-center gap-1.5"><Hash className="w-3 h-3" />Assigned: {e.assignedTo}</span>}
                        {e.usageHours !== undefined && (
                          <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{e.usageHours.toLocaleString()} hrs total</span>
                        )}
                        {e.lastServiceDate && (
                          <span className="flex items-center gap-1.5"><RefreshCw className="w-3 h-3" />Serviced: {new Date(e.lastServiceDate).toLocaleDateString()}</span>
                        )}
                        {e.nextServiceDate && (
                          <span className={`flex items-center gap-1.5 font-medium ${serviceSoon ? 'text-chart-3' : ''}`}>
                            <Calendar className="w-3 h-3" />
                            Next service: {serviceSoon ? `in ${serviceDays}d` : new Date(e.nextServiceDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {e.notes && <p className="text-xs text-muted-foreground mt-2 italic border-t border-border pt-2">"{e.notes}"</p>}

                      <div className="mt-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/inventory/equipment/${e._id}/edit`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full h-7 text-xs rounded-lg gap-1"><Edit2 className="w-3 h-3" />Edit</Button>
                        </Link>
                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg text-destructive hover:text-destructive hover:border-destructive/30" onClick={() => handleDeleteEquipment(e._id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}