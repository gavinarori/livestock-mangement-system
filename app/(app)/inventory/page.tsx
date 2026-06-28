'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Package, Pill, Wrench, Plus, Search, AlertTriangle, TrendingDown,
  BarChart3, Calendar, Hash, Edit2, Trash2, Clock, RefreshCw,
  Boxes, FlaskConical, X, Loader2, CheckCircle2, Info, ThermometerSun,
  MapPin, Phone, ShieldCheck, Activity
} from 'lucide-react'


type UserRole = 'ADMIN' | 'MANAGER' | 'VETERINARIAN' | 'WORKER' | 'VIEWER'
interface AuthUser { id: string; name: string; email: string; role: UserRole; organizationId: string }

interface FeedItem {
  id: string; name: string; type: string
  quantityKg: number; minimumKg: number; maximumKg?: number
  costPerKg: number; totalValue: number
  supplier?: string; supplierPhone?: string
  lastRestocked?: string; expiryDate?: string; batchNumber?: string
  storageLocation?: string; proteinPct?: number; notes?: string
  alerts: string[]
  createdBy?: { id: string; name: string; role: UserRole }
  updatedBy?: { id: string; name: string; role: UserRole }
  createdAt: string; updatedAt: string
}

interface MedicineItem {
  id: string; name: string; category: string
  quantity: number; unit: string; minimumQty: number
  costPerUnit?: number; totalValue?: number
  expiryDate?: string; batchNumber?: string; usageCount: number
  supplier?: string; supplierPhone?: string; manufacturer?: string
  storageTemp?: string; storageLocation?: string
  prescription: boolean; withdrawalDays?: number
  activeIngredient?: string; dosageInstructions?: string
  notes?: string; alerts: string[]
  createdBy?: { id: string; name: string; role: UserRole }
  createdAt: string
}

interface EquipmentItem {
  id: string; name: string; type: string
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'REPAIR' | 'RETIRED'
  serialNumber?: string; model?: string; manufacturer?: string
  purchaseDate?: string; purchaseCost?: number; currentValue?: number
  lastServiceDate?: string; nextServiceDate?: string; serviceIntervalDays?: number
  usageHours?: number; maxUsageHours?: number
  assignedTo?: string; location?: string
  warrantyExpiry?: string; insuranceNo?: string
  supplier?: string; supplierPhone?: string
  maintenanceNotes?: string; notes?: string; alerts: string[]
  createdBy?: { id: string; name: string; role: UserRole }
  createdAt: string
}


const WRITE_ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'WORKER']
const canWrite = (role?: UserRole) => !!role && WRITE_ROLES.includes(role)


async function apiFetch(url: string, options?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options?.headers },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
  return data
}


const fmtKsh = (v: number) => `KSh ${v.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const daysUntil = (d?: string) => !d ? null : Math.round((new Date(d).getTime() - Date.now()) / 86400000)
const isExpired = (d?: string) => !!d && new Date(d) < new Date()
const isExpiringSoon = (d?: string) => { if (!d) return false; const diff = (new Date(d).getTime() - Date.now()) / 86400000; return diff >= 0 && diff < 30 }

const StockBar = ({ qty, min, max }: { qty: number; min: number; max: number }) => {
  const pct = Math.min((qty / Math.max(max, 1)) * 100, 100)
  const color = qty <= min ? 'bg-destructive' : qty <= min * 1.5 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-muted-foreground text-[11px] tabular-nums">{qty.toLocaleString()} / {max.toLocaleString()}</span>
    </div>
  )
}

const EquipmentStatusBadge = ({ status }: { status: EquipmentItem['status'] }) => {
  const m: Record<string, string> = {
    OPERATIONAL: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    MAINTENANCE: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    REPAIR: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
    RETIRED: 'bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-400',
  }
  const labels: Record<string, string> = { OPERATIONAL: 'Operational', MAINTENANCE: 'Maintenance', REPAIR: 'Repair', RETIRED: 'Retired' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m[status] ?? ''}`}>{labels[status] ?? status}</span>
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'warning'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t) }, [onClose])
  const cls = type === 'success' ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : type === 'error' ? 'bg-red-100 border-red-300 text-red-800 dark:bg-red-950/40 dark:text-red-300' : 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
  const Icon = type === 'success' ? CheckCircle2 : type === 'error' ? X : AlertTriangle
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg text-sm max-w-sm animate-fade-up ${cls}`}>
      <Icon className="w-4 h-4 flex-shrink-0" /><span>{message}</span>
      <button onClick={onClose} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
    </div>
  )
}

function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-card border border-border rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function ConfirmModal({ open, onClose, onConfirm, label, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; label: string; loading: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title="Confirm Delete" maxWidth="max-w-sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-sm text-red-700 dark:text-red-400">Delete "{label}"?</div>
            <div className="text-xs text-muted-foreground mt-0.5">This action cannot be undone.</div>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Delete
          </button>
        </div>
      </div>
    </Modal>
  )
}

const selCls = 'w-full border border-border rounded-xl bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
const inpCls = 'w-full border border-border rounded-xl bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
const lblCls = 'text-xs font-medium text-muted-foreground uppercase tracking-wide'
function Field({ label, children, span2 = false }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return <div className={`flex flex-col gap-1.5 ${span2 ? 'sm:col-span-2' : ''}`}><label className={lblCls}>{label}</label>{children}</div>
}

// ─── Feed Form Modal ──────────────────────────────────────────────────────────
function FeedFormModal({ open, onClose, onSaved, editItem }: {
  open: boolean; onClose: () => void; onSaved: (item: FeedItem) => void; editItem?: FeedItem | null
}) {
  const isEdit = !!editItem
  const [name, setName] = useState(''); const [type, setType] = useState('DAIRY')
  const [quantityKg, setQuantityKg] = useState(''); const [minimumKg, setMinimumKg] = useState('')
  const [maximumKg, setMaximumKg] = useState(''); const [costPerKg, setCostPerKg] = useState('')
  const [supplier, setSupplier] = useState(''); const [supplierPhone, setSupplierPhone] = useState('')
  const [lastRestocked, setLastRestocked] = useState(''); const [expiryDate, setExpiryDate] = useState('')
  const [batchNumber, setBatchNumber] = useState(''); const [storageLocation, setStorageLocation] = useState('')
  const [proteinPct, setProteinPct] = useState(''); const [notes, setNotes] = useState('')
  const [stockChangeReason, setStockChangeReason] = useState('')
  const [loading, setLoading] = useState(false); const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (editItem) {
      setName(editItem.name); setType(editItem.type.toUpperCase())
      setQuantityKg(editItem.quantityKg.toString()); setMinimumKg(editItem.minimumKg.toString())
      setMaximumKg(editItem.maximumKg?.toString() ?? ''); setCostPerKg(editItem.costPerKg.toString())
      setSupplier(editItem.supplier ?? ''); setSupplierPhone(editItem.supplierPhone ?? '')
      setLastRestocked(editItem.lastRestocked?.split('T')[0] ?? ''); setExpiryDate(editItem.expiryDate?.split('T')[0] ?? '')
      setBatchNumber(editItem.batchNumber ?? ''); setStorageLocation(editItem.storageLocation ?? '')
      setProteinPct(editItem.proteinPct?.toString() ?? ''); setNotes(editItem.notes ?? '')
      setStockChangeReason('')
    } else {
      setName(''); setType('DAIRY'); setQuantityKg(''); setMinimumKg(''); setMaximumKg(''); setCostPerKg('')
      setSupplier(''); setSupplierPhone(''); setLastRestocked(''); setExpiryDate('')
      setBatchNumber(''); setStorageLocation(''); setProteinPct(''); setNotes(''); setStockChangeReason('')
    }
    setError('')
  }, [open, editItem])

  const handleSubmit = async () => {
    setError('')
    if (!name) { setError('Name is required.'); return }
    if (!costPerKg || isNaN(Number(costPerKg))) { setError('Valid cost per kg (KSh) is required.'); return }
    if (quantityKg === '' || isNaN(Number(quantityKg))) { setError('Valid quantity is required.'); return }
    if (!minimumKg || isNaN(Number(minimumKg))) { setError('Minimum stock level is required.'); return }
    setLoading(true)
    try {
      const body: any = {
        name, type: type as any, quantityKg: Number(quantityKg), minimumKg: Number(minimumKg),
        maximumKg: maximumKg ? Number(maximumKg) : null, costPerKg: Number(costPerKg),
        supplier: supplier || null, supplierPhone: supplierPhone || null,
        lastRestocked: lastRestocked || null, expiryDate: expiryDate || null,
        batchNumber: batchNumber || null, storageLocation: storageLocation || null,
        proteinPct: proteinPct ? Number(proteinPct) : null, notes: notes || null,
      }
      if (isEdit) body.stockChangeReason = stockChangeReason || null
      let data
      if (isEdit) {
        data = await apiFetch(`/api/inventory/feed/${editItem!.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        data = await apiFetch('/api/inventory/feed', { method: 'POST', body: JSON.stringify(body) })
      }
      onSaved(data.item)
      onClose()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Feed Item' : 'Add Feed Item'} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-4">
        {error && <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 text-sm text-red-700"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Feed Name *"><input className={inpCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dairy Meal Premium" /></Field>
          <Field label="Feed Type *">
            <select className={selCls} value={type} onChange={e => setType(e.target.value)}>
              {['DAIRY','POULTRY','PIG','CATTLE','SHEEP','GOAT','ROUGHAGE','SUPPLEMENT','CONCENTRATE','OTHER'].map(t => (
                <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </Field>
          <Field label="Quantity (kg) *"><input type="number" min={0} step={0.1} className={inpCls} value={quantityKg} onChange={e => setQuantityKg(e.target.value)} placeholder="0.00" /></Field>
          <Field label="Min Stock Level (kg) *"><input type="number" min={0} step={0.1} className={inpCls} value={minimumKg} onChange={e => setMinimumKg(e.target.value)} placeholder="0.00" /></Field>
          <Field label="Max Capacity (kg)"><input type="number" min={0} step={0.1} className={inpCls} value={maximumKg} onChange={e => setMaximumKg(e.target.value)} placeholder="Optional" /></Field>
          <Field label="Cost per kg (KSh) *">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">KSh</span>
              <input type="number" min={0} step={0.01} className={`${inpCls} pl-10`} value={costPerKg} onChange={e => setCostPerKg(e.target.value)} placeholder="0.00" />
            </div>
          </Field>
          <Field label="Supplier"><input className={inpCls} value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Supplier name" /></Field>
          <Field label="Supplier Phone"><input type="tel" className={inpCls} value={supplierPhone} onChange={e => setSupplierPhone(e.target.value)} placeholder="+254 7xx xxx xxx" /></Field>
          <Field label="Last Restocked"><input type="date" className={inpCls} value={lastRestocked} onChange={e => setLastRestocked(e.target.value)} /></Field>
          <Field label="Expiry Date"><input type="date" className={inpCls} value={expiryDate} onChange={e => setExpiryDate(e.target.value)} /></Field>
          <Field label="Batch Number"><input className={inpCls} value={batchNumber} onChange={e => setBatchNumber(e.target.value)} placeholder="Batch #" /></Field>
          <Field label="Storage Location"><input className={inpCls} value={storageLocation} onChange={e => setStorageLocation(e.target.value)} placeholder="e.g. Warehouse A, Bin 3" /></Field>
          <Field label="Protein % (optional)"><input type="number" min={0} max={100} step={0.1} className={inpCls} value={proteinPct} onChange={e => setProteinPct(e.target.value)} placeholder="e.g. 18.5" /></Field>
          {isEdit && (
            <Field label="Stock Change Reason">
              <input className={inpCls} value={stockChangeReason} onChange={e => setStockChangeReason(e.target.value)} placeholder="Reason for stock adjustment…" />
            </Field>
          )}
        </div>
        <Field label="Notes" span2><textarea className={`${inpCls} resize-none h-16`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Storage conditions, feeding guidelines…" /></Field>
        <div className="flex gap-2 justify-end pt-1 border-t border-border">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{isEdit ? 'Save Changes' : 'Add Feed'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Medicine Form Modal ──────────────────────────────────────────────────────
function MedicineFormModal({ open, onClose, onSaved, editItem }: {
  open: boolean; onClose: () => void; onSaved: (item: MedicineItem) => void; editItem?: MedicineItem | null
}) {
  const isEdit = !!editItem
  const [name, setName] = useState(''); const [category, setCategory] = useState('ANTIBIOTIC')
  const [quantity, setQuantity] = useState(''); const [unit, setUnit] = useState('bottles')
  const [minimumQty, setMinimumQty] = useState(''); const [costPerUnit, setCostPerUnit] = useState('')
  const [expiryDate, setExpiryDate] = useState(''); const [batchNumber, setBatchNumber] = useState('')
  const [supplier, setSupplier] = useState(''); const [supplierPhone, setSupplierPhone] = useState('')
  const [manufacturer, setManufacturer] = useState(''); const [storageTemp, setStorageTemp] = useState('')
  const [storageLocation, setStorageLocation] = useState('')
  const [prescription, setPrescription] = useState(false); const [withdrawalDays, setWithdrawalDays] = useState('')
  const [activeIngredient, setActiveIngredient] = useState(''); const [dosageInstructions, setDosageInstructions] = useState('')
  const [notes, setNotes] = useState(''); const [stockChangeReason, setStockChangeReason] = useState('')
  const [loading, setLoading] = useState(false); const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (editItem) {
      setName(editItem.name); setCategory(editItem.category.toUpperCase()); setQuantity(editItem.quantity.toString())
      setUnit(editItem.unit); setMinimumQty(editItem.minimumQty.toString())
      setCostPerUnit(editItem.costPerUnit?.toString() ?? ''); setExpiryDate(editItem.expiryDate?.split('T')[0] ?? '')
      setBatchNumber(editItem.batchNumber ?? ''); setSupplier(editItem.supplier ?? ''); setSupplierPhone(editItem.supplierPhone ?? '')
      setManufacturer(editItem.manufacturer ?? ''); setStorageTemp(editItem.storageTemp ?? ''); setStorageLocation(editItem.storageLocation ?? '')
      setPrescription(editItem.prescription); setWithdrawalDays(editItem.withdrawalDays?.toString() ?? '')
      setActiveIngredient(editItem.activeIngredient ?? ''); setDosageInstructions(editItem.dosageInstructions ?? '')
      setNotes(editItem.notes ?? ''); setStockChangeReason('')
    } else {
      setName(''); setCategory('ANTIBIOTIC'); setQuantity(''); setUnit('bottles'); setMinimumQty(''); setCostPerUnit('')
      setExpiryDate(''); setBatchNumber(''); setSupplier(''); setSupplierPhone(''); setManufacturer('')
      setStorageTemp(''); setStorageLocation(''); setPrescription(false); setWithdrawalDays('')
      setActiveIngredient(''); setDosageInstructions(''); setNotes(''); setStockChangeReason('')
    }
    setError('')
  }, [open, editItem])

  const handleSubmit = async () => {
    setError('')
    if (!name) { setError('Name is required.'); return }
    if (!quantity || isNaN(Number(quantity))) { setError('Valid quantity is required.'); return }
    if (!minimumQty || isNaN(Number(minimumQty))) { setError('Minimum quantity is required.'); return }
    setLoading(true)
    try {
      const body: any = {
        name, category: category as any, quantity: Number(quantity), unit, minimumQty: Number(minimumQty),
        costPerUnit: costPerUnit ? Number(costPerUnit) : null, expiryDate: expiryDate || null,
        batchNumber: batchNumber || null, supplier: supplier || null, supplierPhone: supplierPhone || null,
        manufacturer: manufacturer || null, storageTemp: storageTemp || null, storageLocation: storageLocation || null,
        prescription, withdrawalDays: withdrawalDays ? Number(withdrawalDays) : null,
        activeIngredient: activeIngredient || null, dosageInstructions: dosageInstructions || null, notes: notes || null,
      }
      if (isEdit) body.stockChangeReason = stockChangeReason || null
      let data
      if (isEdit) {
        data = await apiFetch(`/api/inventory/medicine/${editItem!.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        data = await apiFetch('/api/inventory/medicine', { method: 'POST', body: JSON.stringify(body) })
      }
      onSaved(data.item)
      onClose()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Medicine' : 'Add Medicine'} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-4">
        {error && <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 text-sm text-red-700"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Medicine Name *"><input className={inpCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Oxytetracycline" /></Field>
          <Field label="Category *">
            <select className={selCls} value={category} onChange={e => setCategory(e.target.value)}>
              {['ANTIBIOTIC','VACCINE','DEWORMER','SUPPLEMENT','PESTICIDE','TREATMENT','ANTIFUNGAL','ANTIPARASITIC','HORMONE','OTHER'].map(c => (
                <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </Field>
          <Field label="Quantity *"><input type="number" min={0} step={0.01} className={inpCls} value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" /></Field>
          <Field label="Unit *">
            <select className={selCls} value={unit} onChange={e => setUnit(e.target.value)}>
              {['bottles','vials','doses','packs','tubes','containers','kg','litres','sachets','strips','ampoules'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label="Min Stock Level *"><input type="number" min={0} step={0.01} className={inpCls} value={minimumQty} onChange={e => setMinimumQty(e.target.value)} placeholder="0" /></Field>
          <Field label="Cost per Unit (KSh)">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">KSh</span>
              <input type="number" min={0} step={0.01} className={`${inpCls} pl-10`} value={costPerUnit} onChange={e => setCostPerUnit(e.target.value)} placeholder="0.00" />
            </div>
          </Field>
          <Field label="Expiry Date"><input type="date" className={inpCls} value={expiryDate} onChange={e => setExpiryDate(e.target.value)} /></Field>
          <Field label="Batch Number"><input className={inpCls} value={batchNumber} onChange={e => setBatchNumber(e.target.value)} placeholder="Batch #" /></Field>
          <Field label="Supplier"><input className={inpCls} value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Supplier / Agrovet" /></Field>
          <Field label="Supplier Phone"><input type="tel" className={inpCls} value={supplierPhone} onChange={e => setSupplierPhone(e.target.value)} placeholder="+254 7xx xxx xxx" /></Field>
          <Field label="Manufacturer"><input className={inpCls} value={manufacturer} onChange={e => setManufacturer(e.target.value)} placeholder="e.g. Bayer, Norbrook" /></Field>
          <Field label="Storage Temperature">
            <select className={selCls} value={storageTemp} onChange={e => setStorageTemp(e.target.value)}>
              <option value="">Not specified</option>
              <option value="refrigerated">Refrigerated (2–8°C)</option>
              <option value="cool-dry">Cool & Dry (below 25°C)</option>
              <option value="room-temp">Room Temperature</option>
            </select>
          </Field>
          <Field label="Storage Location"><input className={inpCls} value={storageLocation} onChange={e => setStorageLocation(e.target.value)} placeholder="e.g. Drug Cabinet A" /></Field>
          <Field label="Withdrawal Period (days)"><input type="number" min={0} className={inpCls} value={withdrawalDays} onChange={e => setWithdrawalDays(e.target.value)} placeholder="Pre-slaughter days" /></Field>
          <Field label="Active Ingredient"><input className={inpCls} value={activeIngredient} onChange={e => setActiveIngredient(e.target.value)} placeholder="e.g. Oxytetracycline HCl" /></Field>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input type="checkbox" id="prescription" checked={prescription} onChange={e => setPrescription(e.target.checked)} className="rounded" />
            <label htmlFor="prescription" className="text-sm text-muted-foreground cursor-pointer">Requires prescription / veterinary authorization</label>
          </div>
          {isEdit && (
            <Field label="Stock Change Reason">
              <input className={inpCls} value={stockChangeReason} onChange={e => setStockChangeReason(e.target.value)} placeholder="Reason for quantity adjustment…" />
            </Field>
          )}
        </div>
        <Field label="Dosage Instructions" span2><textarea className={`${inpCls} resize-none h-14`} value={dosageInstructions} onChange={e => setDosageInstructions(e.target.value)} placeholder="Dosage and administration instructions…" /></Field>
        <Field label="Notes" span2><textarea className={`${inpCls} resize-none h-14`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes…" /></Field>
        <div className="flex gap-2 justify-end pt-1 border-t border-border">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{isEdit ? 'Save Changes' : 'Add Medicine'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Equipment Form Modal ─────────────────────────────────────────────────────
function EquipmentFormModal({ open, onClose, onSaved, editItem }: {
  open: boolean; onClose: () => void; onSaved: (item: EquipmentItem) => void; editItem?: EquipmentItem | null
}) {
  const isEdit = !!editItem
  const [name, setName] = useState(''); const [type, setType] = useState('utility')
  const [status, setStatus] = useState<EquipmentItem['status']>('OPERATIONAL')
  const [model, setModel] = useState(''); const [manufacturer, setManufacturer] = useState('')
  const [serialNumber, setSerialNumber] = useState(''); const [purchaseDate, setPurchaseDate] = useState('')
  const [purchaseCost, setPurchaseCost] = useState(''); const [currentValue, setCurrentValue] = useState('')
  const [lastServiceDate, setLastServiceDate] = useState(''); const [nextServiceDate, setNextServiceDate] = useState('')
  const [serviceIntervalDays, setServiceIntervalDays] = useState(''); const [usageHours, setUsageHours] = useState('')
  const [maxUsageHours, setMaxUsageHours] = useState(''); const [assignedTo, setAssignedTo] = useState('')
  const [location, setLocation] = useState(''); const [warrantyExpiry, setWarrantyExpiry] = useState('')
  const [supplier, setSupplier] = useState(''); const [supplierPhone, setSupplierPhone] = useState('')
  const [maintenanceNotes, setMaintenanceNotes] = useState(''); const [notes, setNotes] = useState('')
  const [eventType, setEventType] = useState(''); const [eventDescription, setEventDescription] = useState('')
  const [loading, setLoading] = useState(false); const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (editItem) {
      setName(editItem.name); setType(editItem.type); setStatus(editItem.status)
      setModel(editItem.model ?? ''); setManufacturer(editItem.manufacturer ?? ''); setSerialNumber(editItem.serialNumber ?? '')
      setPurchaseDate(editItem.purchaseDate?.split('T')[0] ?? ''); setPurchaseCost(editItem.purchaseCost?.toString() ?? '')
      setCurrentValue(editItem.currentValue?.toString() ?? '')
      setLastServiceDate(editItem.lastServiceDate?.split('T')[0] ?? ''); setNextServiceDate(editItem.nextServiceDate?.split('T')[0] ?? '')
      setServiceIntervalDays(editItem.serviceIntervalDays?.toString() ?? ''); setUsageHours(editItem.usageHours?.toString() ?? '')
      setMaxUsageHours(editItem.maxUsageHours?.toString() ?? ''); setAssignedTo(editItem.assignedTo ?? '')
      setLocation(editItem.location ?? ''); setWarrantyExpiry(editItem.warrantyExpiry?.split('T')[0] ?? '')
      setSupplier(editItem.supplier ?? ''); setSupplierPhone(editItem.supplierPhone ?? '')
      setMaintenanceNotes(editItem.maintenanceNotes ?? ''); setNotes(editItem.notes ?? '')
      setEventType(''); setEventDescription('')
    } else {
      setName(''); setType('utility'); setStatus('OPERATIONAL'); setModel(''); setManufacturer(''); setSerialNumber('')
      setPurchaseDate(''); setPurchaseCost(''); setCurrentValue(''); setLastServiceDate(''); setNextServiceDate('')
      setServiceIntervalDays(''); setUsageHours(''); setMaxUsageHours(''); setAssignedTo(''); setLocation('')
      setWarrantyExpiry(''); setSupplier(''); setSupplierPhone(''); setMaintenanceNotes(''); setNotes('')
      setEventType(''); setEventDescription('')
    }
    setError('')
  }, [open, editItem])

  const handleSubmit = async () => {
    setError('')
    if (!name) { setError('Equipment name is required.'); return }
    if (!type) { setError('Equipment type is required.'); return }
    setLoading(true)
    try {
      const body: any = {
        name, type, status, model: model || null, manufacturer: manufacturer || null,
        serialNumber: serialNumber || null, purchaseDate: purchaseDate || null,
        purchaseCost: purchaseCost ? Number(purchaseCost) : null, currentValue: currentValue ? Number(currentValue) : null,
        lastServiceDate: lastServiceDate || null, nextServiceDate: nextServiceDate || null,
        serviceIntervalDays: serviceIntervalDays ? Number(serviceIntervalDays) : null,
        usageHours: usageHours ? Number(usageHours) : null, maxUsageHours: maxUsageHours ? Number(maxUsageHours) : null,
        assignedTo: assignedTo || null, location: location || null, warrantyExpiry: warrantyExpiry || null,
        supplier: supplier || null, supplierPhone: supplierPhone || null,
        maintenanceNotes: maintenanceNotes || null, notes: notes || null,
        eventType: eventType || null, eventDescription: eventDescription || null,
      }
      let data
      if (isEdit) {
        data = await apiFetch(`/api/inventory/equipment?id=${editItem!.id}`, { method: 'PUT', body: JSON.stringify(body) })
      } else {
        data = await apiFetch('/api/inventory/equipment', { method: 'POST', body: JSON.stringify(body) })
      }
      onSaved(data.item)
      onClose()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Equipment' : 'Add Equipment'} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-4">
        {error && <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 text-sm text-red-700"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name *"><input className={inpCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Milk Cooling Tank" /></Field>
          <Field label="Type *">
            <select className={selCls} value={type} onChange={e => setType(e.target.value)}>
              {['dairy','poultry','processing','utility','vehicle','feeding','medical','irrigation','other'].map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className={selCls} value={status} onChange={e => setStatus(e.target.value as any)}>
              <option value="OPERATIONAL">Operational</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="REPAIR">Under Repair</option>
              <option value="RETIRED">Retired</option>
            </select>
          </Field>
          <Field label="Serial Number"><input className={inpCls} value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="SN-XXXX" /></Field>
          <Field label="Model"><input className={inpCls} value={model} onChange={e => setModel(e.target.value)} placeholder="Model name/number" /></Field>
          <Field label="Manufacturer"><input className={inpCls} value={manufacturer} onChange={e => setManufacturer(e.target.value)} placeholder="e.g. DeLaval, Massey Ferguson" /></Field>
          <Field label="Purchase Date"><input type="date" className={inpCls} value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} /></Field>
          <Field label="Purchase Cost (KSh)">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">KSh</span>
              <input type="number" min={0} step={100} className={`${inpCls} pl-10`} value={purchaseCost} onChange={e => setPurchaseCost(e.target.value)} placeholder="0.00" />
            </div>
          </Field>
          <Field label="Current Value (KSh)">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">KSh</span>
              <input type="number" min={0} step={100} className={`${inpCls} pl-10`} value={currentValue} onChange={e => setCurrentValue(e.target.value)} placeholder="0.00" />
            </div>
          </Field>
          <Field label="Last Service Date"><input type="date" className={inpCls} value={lastServiceDate} onChange={e => setLastServiceDate(e.target.value)} /></Field>
          <Field label="Next Service Date"><input type="date" className={inpCls} value={nextServiceDate} onChange={e => setNextServiceDate(e.target.value)} /></Field>
          <Field label="Service Interval (days)"><input type="number" min={1} className={inpCls} value={serviceIntervalDays} onChange={e => setServiceIntervalDays(e.target.value)} placeholder="e.g. 90" /></Field>
          <Field label="Usage Hours"><input type="number" min={0} step={0.5} className={inpCls} value={usageHours} onChange={e => setUsageHours(e.target.value)} placeholder="0.0" /></Field>
          <Field label="Max Hours (overhaul)"><input type="number" min={0} className={inpCls} value={maxUsageHours} onChange={e => setMaxUsageHours(e.target.value)} placeholder="e.g. 10000" /></Field>
          <Field label="Assigned To"><input className={inpCls} value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="Department, team, or person" /></Field>
          <Field label="Location"><input className={inpCls} value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Main Barn, Shed B" /></Field>
          <Field label="Warranty Expiry"><input type="date" className={inpCls} value={warrantyExpiry} onChange={e => setWarrantyExpiry(e.target.value)} /></Field>
          <Field label="Supplier"><input className={inpCls} value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Supplier name" /></Field>
          <Field label="Supplier Phone"><input type="tel" className={inpCls} value={supplierPhone} onChange={e => setSupplierPhone(e.target.value)} placeholder="+254 7xx xxx xxx" /></Field>
          {isEdit && (
            <>
              <Field label="Log Event Type">
                <select className={selCls} value={eventType} onChange={e => setEventType(e.target.value)}>
                  <option value="">No event</option>
                  <option value="SERVICE">Service</option>
                  <option value="REPAIR">Repair</option>
                  <option value="INSPECTION">Inspection</option>
                  <option value="UPGRADE">Upgrade</option>
                  <option value="INCIDENT">Incident</option>
                </select>
              </Field>
              <Field label="Event Description"><input className={inpCls} value={eventDescription} onChange={e => setEventDescription(e.target.value)} placeholder="What was done…" /></Field>
            </>
          )}
        </div>
        <Field label="Maintenance Notes" span2><textarea className={`${inpCls} resize-none h-14`} value={maintenanceNotes} onChange={e => setMaintenanceNotes(e.target.value)} placeholder="Known issues, service history notes…" /></Field>
        <Field label="General Notes" span2><textarea className={`${inpCls} resize-none h-12`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes…" /></Field>
        <div className="flex gap-2 justify-end pt-1 border-t border-border">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{isEdit ? 'Save Changes' : 'Add Equipment'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [tab, setTab] = useState<'feed' | 'medicine' | 'equipment'>('feed')
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [medicine, setMedicine] = useState<MedicineItem[]>([])
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [showAlertsOnly, setShowAlertsOnly] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)

  const [showFeedModal, setShowFeedModal] = useState(false)
  const [showMedModal, setShowMedModal] = useState(false)
  const [showEquipModal, setShowEquipModal] = useState(false)
  const [editFeed, setEditFeed] = useState<FeedItem | null>(null)
  const [editMed, setEditMed] = useState<MedicineItem | null>(null)
  const [editEquip, setEditEquip] = useState<EquipmentItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'feed' | 'medicine' | 'equipment'; id: string; label: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => setToast({ message, type }), [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token) { router.push('/login'); return }
    if (userData) try { setUser(JSON.parse(userData)) } catch {}
    loadAll()
  }, [router])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [fData, mData, eData] = await Promise.all([
        apiFetch('/api/inventory/feed?limit=100'),
        apiFetch('/api/inventory/medicine?limit=100'),
        apiFetch('/api/inventory/equipment?limit=100'),
      ])
      setFeed(fData.items ?? [])
      setMedicine(mData.items ?? [])
      setEquipment(eData.items ?? [])
    } catch (e: any) {
      showToast(e.message || 'Failed to load inventory', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAll()
    setRefreshing(false)
    showToast('Refreshed', 'success')
  }

  const stats = useMemo(() => ({
    lowFeed: feed.filter(f => f.alerts.includes('LOW_STOCK')).length,
    expiringMeds: medicine.filter(m => m.alerts.length > 0).length,
    equipmentIssues: equipment.filter(e => e.status !== 'OPERATIONAL').length,
    servicesDue: equipment.filter(e => e.alerts.some(a => a.includes('SERVICE'))).length,
    totalFeedValueKsh: feed.reduce((s, f) => s + f.totalValue, 0),
    totalMedValueKsh: medicine.reduce((s, m) => s + (m.totalValue ?? 0), 0),
  }), [feed, medicine, equipment])

  const q = search.toLowerCase()
  const filteredFeed = feed.filter(f => {
    const match = !q || f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q) || (f.supplier ?? '').toLowerCase().includes(q)
    return match && (!showAlertsOnly || f.alerts.length > 0)
  })
  const filteredMed = medicine.filter(m => {
    const match = !q || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || (m.supplier ?? '').toLowerCase().includes(q)
    return match && (!showAlertsOnly || m.alerts.length > 0)
  })
  const filteredEquip = equipment.filter(e => {
    const match = !q || e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || (e.assignedTo ?? '').toLowerCase().includes(q) || (e.location ?? '').toLowerCase().includes(q)
    return match && (!showAlertsOnly || e.alerts.length > 0)
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      if (deleteTarget.type === 'feed') {
        await apiFetch(`/api/inventory/feed/${deleteTarget.id}`, { method: 'DELETE' })
        setFeed(p => p.filter(f => f.id !== deleteTarget.id))
      } else if (deleteTarget.type === 'medicine') {
        await apiFetch(`/api/inventory/medicine/${deleteTarget.id}`, { method: 'DELETE' })
        setMedicine(p => p.filter(m => m.id !== deleteTarget.id))
      } else {
        await apiFetch(`/api/inventory/equipment?id=${deleteTarget.id}`, { method: 'DELETE' })
        setEquipment(p => p.filter(e => e.id !== deleteTarget.id))
      }
      setDeleteTarget(null)
      showToast('Deleted successfully', 'success')
    } catch (e: any) {
      showToast(e.message || 'Delete failed', 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const write = canWrite(user?.role)

  const TABS = [
    { id: 'feed', label: 'Feed', icon: Package, count: feed.length, alerts: stats.lowFeed },
    { id: 'medicine', label: 'Medicine', icon: Pill, count: medicine.length, alerts: stats.expiringMeds },
    { id: 'equipment', label: 'Equipment', icon: Wrench, count: equipment.length, alerts: stats.equipmentIssues },
  ] as const

  if (loading) return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto flex flex-col gap-5">
      <div className="h-10 w-64 bg-muted animate-pulse rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}</div>
      <div className="h-64 bg-muted animate-pulse rounded-2xl" />
    </div>
  )

  return (
    <main className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-6">

        {/* ── Header ── */}
        <header className="animate-fade-up flex flex-col sm:flex-row sm:items-start justify-between gap-4" style={{ animationFillMode: 'forwards' }}>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Boxes className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-primary">Inventory</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Resource Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Feed · Medicine · Equipment tracking
              {user && <span className="ml-2 bg-muted px-2 py-0.5 rounded-full text-xs">{user.role}</span>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={handleRefresh} disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm hover:bg-muted disabled:opacity-50 transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />Refresh
            </button>
            {write && tab === 'feed' && (
              <button onClick={() => { setEditFeed(null); setShowFeedModal(true) }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:opacity-90 shadow-sm shadow-primary/20">
                <Plus className="w-4 h-4" />Add Feed
              </button>
            )}
            {write && tab === 'medicine' && (
              <button onClick={() => { setEditMed(null); setShowMedModal(true) }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:opacity-90 shadow-sm shadow-primary/20">
                <Plus className="w-4 h-4" />Add Medicine
              </button>
            )}
            {write && tab === 'equipment' && (
              <button onClick={() => { setEditEquip(null); setShowEquipModal(true) }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:opacity-90 shadow-sm shadow-primary/20">
                <Plus className="w-4 h-4" />Add Equipment
              </button>
            )}
            {!write && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-xl">
                <ShieldCheck className="w-3.5 h-3.5" />View only
              </div>
            )}
          </div>
        </header>

        {/* ── Stats ── */}
        <div className="animate-fade-up delay-75 grid grid-cols-2 md:grid-cols-4 gap-3" style={{ animationFillMode: 'forwards' }}>
          {[
            { icon: TrendingDown, label: 'Low feed stock', value: stats.lowFeed, alert: stats.lowFeed > 0, sub: stats.lowFeed > 0 ? 'Restock needed' : 'All stocked' },
            { icon: FlaskConical, label: 'Medicine alerts', value: stats.expiringMeds, alert: stats.expiringMeds > 0, sub: stats.expiringMeds > 0 ? 'Action required' : 'All current' },
            { icon: Wrench, label: 'Equipment issues', value: stats.equipmentIssues, alert: stats.equipmentIssues > 0, sub: stats.servicesDue > 0 ? `${stats.servicesDue} service due` : undefined },
            { icon: BarChart3, label: 'Total feed value', value: fmtKsh(stats.totalFeedValueKsh), alert: false },
          ].map(({ icon: Icon, label, value, alert, sub }) => (
            <div key={label} className={`card-hover bg-card border rounded-2xl p-5 flex items-center gap-4 ${alert ? 'border-destructive/30' : 'border-border'}`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${alert ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                <Icon className={`w-5 h-5 ${alert ? 'text-destructive' : 'text-primary'}`} />
              </div>
              <div>
                <div className="stat-number text-2xl font-bold leading-tight">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                {sub && <div className={`text-xs font-medium mt-0.5 ${alert ? 'text-destructive' : 'text-primary'}`}>{sub}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="animate-fade-up delay-100 flex gap-1 p-1 bg-muted rounded-2xl w-fit" style={{ animationFillMode: 'forwards' }}>
          {TABS.map(({ id, label, icon: Icon, count, alerts }) => (
            <button key={id} onClick={() => { setTab(id); setSearch('') }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all relative ${tab === id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon className="w-4 h-4" />{label}
              {count > 0 && <span className="text-xs bg-muted text-muted-foreground rounded-full px-1.5">{count}</span>}
              {alerts > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center font-bold">{alerts}</span>}
            </button>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="animate-fade-up delay-150 flex gap-2 flex-wrap" style={{ animationFillMode: 'forwards' }}>
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="w-full pl-9 pr-3 py-2 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 h-9" />
          </div>
          <button onClick={() => setShowAlertsOnly(p => !p)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors ${showAlertsOnly ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'border-border text-muted-foreground hover:border-destructive/30 hover:text-destructive'}`}>
            <AlertTriangle className="w-4 h-4" />{showAlertsOnly ? 'Alerts only' : 'Show alerts'}
          </button>
        </div>

        {/* ── FEED TAB ── */}
        {tab === 'feed' && (
          <div className="animate-fade-up flex flex-col gap-3" style={{ animationFillMode: 'forwards' }}>
            {filteredFeed.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-medium">No feed items found</p>
                {write && <p className="text-xs mt-1">Click "Add Feed" to create the first entry</p>}
              </div>
            ) : (
              <div className="rounded-2xl border border-border overflow-hidden bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {['Feed / Type', 'Stock (kg)', 'Min Level', 'Cost/kg (KSh)', 'Supplier', 'Restocked', 'Expiry', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredFeed.map((f, i) => {
                        const low = f.alerts.includes('LOW_STOCK')
                        const expired = f.alerts.includes('EXPIRED')
                        const expiring = f.alerts.includes('EXPIRING_SOON')
                        const days = daysUntil(f.expiryDate)
                        return (
                          <tr key={f.id} className={`group hover:bg-muted/30 transition-colors ${(low || expired) ? 'bg-destructive/[0.03]' : ''}`}
                            style={{ animationDelay: `${i * 30}ms` }}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-foreground flex items-center gap-1.5">
                                {(low || expired) && <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
                                {f.name}
                              </div>
                              <div className="text-xs text-muted-foreground capitalize mt-0.5">{f.type.toLowerCase()}</div>
                              {f.storageLocation && <div className="text-xs text-muted-foreground/60 flex items-center gap-0.5 mt-0.5"><MapPin className="w-3 h-3" />{f.storageLocation}</div>}
                            </td>
                            <td className="px-4 py-3 w-44">
                              <div className="font-semibold text-foreground mb-1">{f.quantityKg.toLocaleString()} kg</div>
                              <StockBar qty={f.quantityKg} min={f.minimumKg} max={f.maximumKg ?? f.minimumKg * 5} />
                              <div className="text-[11px] text-muted-foreground mt-0.5">Value: {fmtKsh(f.totalValue)}</div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{f.minimumKg.toLocaleString()} kg</td>
                            <td className="px-4 py-3">
                              <span className="font-medium text-foreground">{fmtKsh(f.costPerKg)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-muted-foreground">{f.supplier || '—'}</div>
                              {f.supplierPhone && <div className="text-xs text-muted-foreground/60 flex items-center gap-0.5 mt-0.5"><Phone className="w-3 h-3" />{f.supplierPhone}</div>}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{f.lastRestocked ? new Date(f.lastRestocked).toLocaleDateString() : '—'}</td>
                            <td className="px-4 py-3">
                              {f.expiryDate ? (
                                <span className={`text-xs font-medium ${expired ? 'text-destructive' : expiring ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                                  {expired ? `⚠ Expired ${Math.abs(days!)}d ago` : expiring ? `${days}d left` : new Date(f.expiryDate).toLocaleDateString()}
                                </span>
                              ) : '—'}
                            </td>
                            {/* Actions always visible */}
                            <td className="px-4 py-3">
                              {write && (
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => { setEditFeed(f); setShowFeedModal(true) }}
                                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="Edit">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setDeleteTarget({ type: 'feed', id: f.id, label: f.name })}
                                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600" title="Delete">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-xs text-muted-foreground flex justify-between">
                  <span>{filteredFeed.length} item{filteredFeed.length !== 1 ? 's' : ''}</span>
                  <span className="font-medium">Total value: {fmtKsh(filteredFeed.reduce((s, f) => s + f.totalValue, 0))}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MEDICINE TAB ── */}
        {tab === 'medicine' && (
          <div className="animate-fade-up flex flex-col gap-3" style={{ animationFillMode: 'forwards' }}>
            {filteredMed.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Pill className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-medium">No medicine items found</p>
                {write && <p className="text-xs mt-1">Click "Add Medicine" to start tracking</p>}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredMed.map((m, i) => {
                    const low = m.alerts.includes('LOW_STOCK')
                    const expired = m.alerts.includes('EXPIRED')
                    const expiring = m.alerts.includes('EXPIRING_SOON')
                    const days = daysUntil(m.expiryDate)
                    return (
                      <div key={m.id} className={`group card-hover bg-card border rounded-2xl p-4 relative overflow-hidden ${(low || expired) ? 'border-destructive/30' : 'border-border'}`}
                        style={{ animationDelay: `${i * 30}ms` }}>
                        {(low || expired) && <div className="absolute top-0 left-0 right-0 h-0.5 bg-destructive" />}
                        {expiring && !expired && <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500" />}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              {(low || expired) && <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
                              {m.name}
                            </div>
                            <div className="text-xs text-muted-foreground capitalize mt-0.5">{m.category.toLowerCase()}</div>
                            {m.prescription && (
                              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-0.5"><ShieldCheck className="w-3 h-3" />Prescription required</div>
                            )}
                          </div>
                          {/* Always visible medicine card actions */}
                          {write && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => { setEditMed(m); setShowMedModal(true) }}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="Edit">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setDeleteTarget({ type: 'medicine', id: m.id, label: m.name })}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            <strong className={`${low ? 'text-destructive' : 'text-foreground'}`}>{m.quantity} {m.unit}</strong>
                            <span>/ min {m.minimumQty}</span>
                          </span>
                          {m.batchNumber && <span className="flex items-center gap-1"><Hash className="w-3 h-3" />Batch: {m.batchNumber}</span>}
                          {m.usageCount > 0 && <span className="flex items-center gap-1"><Activity className="w-3 h-3" />Used {m.usageCount}×</span>}
                          {m.costPerUnit && <span className="flex items-center gap-1 font-medium text-foreground">{fmtKsh(m.costPerUnit)}/{m.unit.slice(0, -1) || m.unit}</span>}
                        </div>
                        <StockBar qty={m.quantity} min={m.minimumQty} max={Math.max(m.minimumQty * 5, m.quantity)} />
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          {m.expiryDate && (
                            <div className={`flex items-center gap-1.5 font-medium ${expired ? 'text-destructive' : expiring ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                              <Calendar className="w-3.5 h-3.5" />
                              {expired ? `Expired ${Math.abs(days!)}d ago` : expiring ? `Exp in ${days}d` : `Exp: ${new Date(m.expiryDate).toLocaleDateString()}`}
                            </div>
                          )}
                          {m.storageTemp && (
                            <div className="flex items-center gap-1.5 text-muted-foreground capitalize">
                              <ThermometerSun className="w-3.5 h-3.5" />{m.storageTemp.replace('-', ' ')}
                            </div>
                          )}
                          {m.supplier && (
                            <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                              <Info className="w-3.5 h-3.5 flex-shrink-0" />{m.supplier}{m.supplierPhone ? ` · ${m.supplierPhone}` : ''}
                            </div>
                          )}
                          {m.withdrawalDays !== undefined && m.withdrawalDays !== null && (
                            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 col-span-2">
                              <Clock className="w-3.5 h-3.5" />Withdrawal: {m.withdrawalDays} days pre-slaughter
                            </div>
                          )}
                        </div>
                        {m.totalValue ? <div className="mt-2 text-xs text-muted-foreground">Stock value: <strong>{fmtKsh(m.totalValue)}</strong></div> : null}
                      </div>
                    )
                  })}
                </div>
                <div className="text-xs text-muted-foreground text-right mt-1">
                  Total medicine value: <strong>{fmtKsh(filteredMed.reduce((s, m) => s + (m.totalValue ?? 0), 0))}</strong>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── EQUIPMENT TAB ── */}
        {tab === 'equipment' && (
          <div className="animate-fade-up flex flex-col gap-3" style={{ animationFillMode: 'forwards' }}>
            {filteredEquip.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-medium">No equipment found</p>
                {write && <p className="text-xs mt-1">Click "Add Equipment" to register machinery</p>}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredEquip.map((e, i) => {
                  const serviceDays = daysUntil(e.nextServiceDate)
                  const serviceSoon = serviceDays !== null && serviceDays <= 14
                  const serviceOverdue = serviceDays !== null && serviceDays < 0
                  const hoursNearLimit = e.maxUsageHours && e.usageHours && e.usageHours >= e.maxUsageHours * 0.9
                  return (
                    <div key={e.id} className={`group card-hover bg-card border rounded-2xl p-4 relative flex flex-col gap-3 ${e.status !== 'OPERATIONAL' || serviceSoon || serviceOverdue ? 'border-destructive/25' : 'border-border'}`}
                      style={{ animationDelay: `${i * 40}ms` }}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${e.status === 'OPERATIONAL' ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                            <Wrench className={`w-4 h-4 ${e.status === 'OPERATIONAL' ? 'text-primary' : 'text-destructive'}`} />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-sm leading-tight">{e.name}</div>
                            <div className="text-xs text-muted-foreground capitalize">{e.type}</div>
                          </div>
                        </div>
                        <EquipmentStatusBadge status={e.status} />
                      </div>

                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        {e.location && <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3 flex-shrink-0" />{e.location}</span>}
                        {e.assignedTo && <span className="flex items-center gap-1.5"><Hash className="w-3 h-3 flex-shrink-0" />{e.assignedTo}</span>}
                        {e.serialNumber && <span className="flex items-center gap-1.5"><Info className="w-3 h-3 flex-shrink-0" />SN: {e.serialNumber}</span>}
                        {e.usageHours !== undefined && e.usageHours !== null && (
                          <span className={`flex items-center gap-1.5 ${hoursNearLimit ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}`}>
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            {e.usageHours.toLocaleString()} hrs{e.maxUsageHours ? ` / ${e.maxUsageHours.toLocaleString()}` : ''}
                            {hoursNearLimit && ' ⚠'}
                          </span>
                        )}
                        {e.lastServiceDate && (
                          <span className="flex items-center gap-1.5"><RefreshCw className="w-3 h-3 flex-shrink-0" />Serviced: {new Date(e.lastServiceDate).toLocaleDateString()}</span>
                        )}
                        {e.nextServiceDate && (
                          <span className={`flex items-center gap-1.5 font-medium ${serviceOverdue ? 'text-destructive' : serviceSoon ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            Next service: {serviceOverdue ? `Overdue by ${Math.abs(serviceDays!)}d` : serviceSoon ? `in ${serviceDays}d` : new Date(e.nextServiceDate).toLocaleDateString()}
                          </span>
                        )}
                        {e.purchaseCost && <span className="flex items-center gap-1.5"><BarChart3 className="w-3 h-3 flex-shrink-0" />Purchase: {fmtKsh(e.purchaseCost)}{e.currentValue ? ` · Value: ${fmtKsh(e.currentValue)}` : ''}</span>}
                        {e.supplier && <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 flex-shrink-0" />{e.supplier}{e.supplierPhone ? ` · ${e.supplierPhone}` : ''}</span>}
                      </div>

                      {e.maintenanceNotes && (
                        <p className="text-xs text-muted-foreground italic border-t border-border pt-2">"{e.maintenanceNotes}"</p>
                      )}

                      {/* Always visible equipment actions */}
                      {write && (
                        <div className="flex gap-1 pt-1 border-t border-border justify-end">
                          <button onClick={() => { setEditEquip(e); setShowEquipModal(true) }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <Edit2 className="w-3 h-3" />Edit
                          </button>
                          <button onClick={() => setDeleteTarget({ type: 'equipment', id: e.id, label: e.name })}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <FeedFormModal open={showFeedModal} onClose={() => { setShowFeedModal(false); setEditFeed(null) }} editItem={editFeed}
        onSaved={item => {
          setFeed(prev => { const i = prev.findIndex(f => f.id === item.id); if (i >= 0) { const n = [...prev]; n[i] = item; return n } return [item, ...prev] })
          showToast(editFeed ? 'Feed item updated' : 'Feed item added', 'success')
          setEditFeed(null)
        }} />

      <MedicineFormModal open={showMedModal} onClose={() => { setShowMedModal(false); setEditMed(null) }} editItem={editMed}
        onSaved={item => {
          setMedicine(prev => { const i = prev.findIndex(m => m.id === item.id); if (i >= 0) { const n = [...prev]; n[i] = item; return n } return [item, ...prev] })
          showToast(editMed ? 'Medicine updated' : 'Medicine added', 'success')
          setEditMed(null)
        }} />

      <EquipmentFormModal open={showEquipModal} onClose={() => { setShowEquipModal(false); setEditEquip(null) }} editItem={editEquip}
        onSaved={item => {
          setEquipment(prev => { const i = prev.findIndex(e => e.id === item.id); if (i >= 0) { const n = [...prev]; n[i] = item; return n } return [item, ...prev] })
          showToast(editEquip ? 'Equipment updated' : 'Equipment added', 'success')
          setEditEquip(null)
        }} />

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        label={deleteTarget?.label ?? ''} loading={deleteLoading} />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </main>
  )
}