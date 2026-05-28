'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Syringe, Bug, ClipboardList, Stethoscope, Bell, Plus, CheckCircle2,
  Clock, AlertTriangle, ChevronDown, ChevronRight, X, Calendar,
  User, Activity, Shield, Thermometer, Pill, Search, Edit2, Trash2,
  Loader2, RefreshCw, Info, FlaskConical, MapPin, Phone, Mail,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type UserRole = 'ADMIN' | 'MANAGER' | 'VETERINARIAN' | 'WORKER' | 'VIEWER'

interface AuthUser { id: string; name: string; email: string; role: UserRole; organizationId: string }

interface AnimalOption {
  id: string; name: string; type: string; breed: string
  identificationId?: string; healthStatus: string
}

interface VetProfile {
  id: string; name: string; email?: string; phone?: string
  speciality: string; licenseNo?: string
  availability: 'AVAILABLE' | 'BUSY' | 'OFF_DUTY' | 'ON_LEAVE'
  currentCaseCount: number; isExternal: boolean
  clinicName?: string; notes?: string
}

interface VaccinationSchedule {
  id: string
  animal: AnimalOption
  vaccineName: string; vaccineType: string
  dueDate: string; administeredAt?: string
  status: 'UPCOMING' | 'OVERDUE' | 'COMPLETED' | 'SKIPPED'
  assignedVetId?: string; assignedVetName?: string
  administeredByName?: string; batchNumber?: string
  dosage?: string; route?: string; nextBoosterDate?: string
  notes?: string; sideEffects?: string
  createdBy?: { id: string; name: string; role: UserRole }
  createdAt: string
}

interface DiseaseOutbreak {
  id: string
  name: string; category: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  trend: 'RISING' | 'STABLE' | 'FALLING'
  firstCaseDate: string; lastCaseDate: string; isActive: boolean
  quarantineActive: boolean; quarantineZone?: string
  containmentNotes?: string; treatmentProtocol?: string
  preventionMeasures?: string; reportedToAuthorities: boolean
  affectedAnimals: { id: string; animal: AnimalOption; dateAffected: string; isRecovered: boolean; notes?: string }[]
  notes?: string
  createdBy?: { id: string; name: string; role: UserRole }
}

interface TreatmentStep { label: string; done: boolean; completedAt?: string; completedBy?: string }

interface Treatment {
  id: string
  animal: AnimalOption
  condition: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  startDate: string; endDate?: string; completedAt?: string
  medication?: string; dosage?: string; frequency?: string; route?: string
  temperature?: number; weight?: number
  assignedVetId?: string; assignedVetName?: string
  steps?: TreatmentStep[]
  diagnosisSource?: string; labReference?: string
  isolationRequired: boolean; isolationLocation?: string
  followUpDate?: string; notes?: string
  createdBy?: { id: string; name: string; role: UserRole }
  updatedBy?: { id: string; name: string; role: UserRole }
  createdAt: string
}

// ─── Permissions ───────────────────────────────────────────────────────────────
const WRITE_ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'VETERINARIAN']
const canWrite = (role?: UserRole) => !!role && WRITE_ROLES.includes(role)
const canManageVets = (role?: UserRole) => role === 'ADMIN' || role === 'MANAGER'

// ─── API helper ───────────────────────────────────────────────────────────────
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

// ─── Config maps ──────────────────────────────────────────────────────────────
const SEVERITY_CFG = {
  CRITICAL: { label: 'Critical', bg: 'bg-red-100 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  HIGH:     { label: 'High',     bg: 'bg-orange-100 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  MEDIUM:   { label: 'Medium',   bg: 'bg-amber-100 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-400' },
  LOW:      { label: 'Low',      bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
} as const

const VACC_CFG = {
  UPCOMING:  { label: 'Upcoming',  bg: 'bg-blue-100 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400' },
  OVERDUE:   { label: 'Overdue',   bg: 'bg-red-100 dark:bg-red-950/40',  text: 'text-red-700 dark:text-red-400' },
  COMPLETED: { label: 'Done',      bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400' },
  SKIPPED:   { label: 'Skipped',   bg: 'bg-gray-100 dark:bg-gray-800/60', text: 'text-gray-600 dark:text-gray-400' },
} as const

const TX_CFG = {
  PENDING:     { label: 'Pending',     bg: 'bg-gray-100 dark:bg-gray-800/60',   text: 'text-gray-600 dark:text-gray-400' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-blue-100 dark:bg-blue-950/40',   text: 'text-blue-700 dark:text-blue-400' },
  COMPLETED:   { label: 'Completed',   bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400' },
  CANCELLED:   { label: 'Cancelled',   bg: 'bg-red-100 dark:bg-red-950/40',     text: 'text-red-700 dark:text-red-400' },
} as const

const AVAIL_CFG = {
  AVAILABLE: { label: 'Available', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', dot: 'bg-emerald-500 animate-pulse' },
  BUSY:      { label: 'Busy',      cls: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400', dot: 'bg-orange-500' },
  OFF_DUTY:  { label: 'Off Duty',  cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-400', dot: 'bg-gray-400' },
  ON_LEAVE:  { label: 'On Leave',  cls: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400', dot: 'bg-purple-400' },
} as const

// ─── Shared sub-components ────────────────────────────────────────────────────
function PillComponents({ bg, text, label }: { bg: string; text: string; label: string }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${bg} ${text}`}>{label}</span>
}

function TrendArrow({ trend }: { trend: 'RISING' | 'STABLE' | 'FALLING' }) {
  if (trend === 'RISING') return <span className="text-red-500 text-xs font-bold">↑ Rising</span>
  if (trend === 'FALLING') return <span className="text-emerald-600 text-xs font-bold">↓ Falling</span>
  return <span className="text-amber-500 text-xs font-bold">→ Stable</span>
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'warning'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t) }, [onClose])
  const cls = type === 'success' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : type === 'error' ? 'bg-red-100 border-red-300 text-red-800' : 'bg-amber-100 border-amber-300 text-amber-800'
  const Icon = type === 'success' ? CheckCircle2 : type === 'error' ? X : AlertTriangle
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg text-sm max-w-xs ${cls}`}>
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
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-card border border-border rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function ConfirmDeleteModal({ open, onClose, onConfirm, title, desc, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; desc: string; loading: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title="Confirm Delete" maxWidth="max-w-sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div><div className="font-medium text-sm text-red-700 dark:text-red-400">{title}</div><div className="text-xs text-muted-foreground mt-0.5">{desc}</div></div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700 transition-colors disabled:opacity-50">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Delete
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Form field helpers ───────────────────────────────────────────────────────
const selCls = 'w-full border border-border rounded-xl bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
const inpCls = 'w-full border border-border rounded-xl bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
const lblCls = 'text-xs font-medium text-muted-foreground uppercase tracking-wide'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><label className={lblCls}>{label}</label>{children}</div>
}

// ─── Vaccination Form Modal ───────────────────────────────────────────────────
function VaccinationFormModal({ open, onClose, onSaved, animals, vets, editItem }: {
  open: boolean; onClose: () => void; onSaved: (item: VaccinationSchedule) => void
  animals: AnimalOption[]; vets: VetProfile[]; editItem?: VaccinationSchedule | null
}) {
  const isEdit = !!editItem
  const [animalId, setAnimalId] = useState('')
  const [vaccineName, setVaccineName] = useState('')
  const [vaccineType, setVaccineType] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [administeredAt, setAdministeredAt] = useState('')
  const [status, setStatus] = useState<VaccinationSchedule['status']>('UPCOMING')
  const [assignedVetId, setAssignedVetId] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [dosage, setDosage] = useState('')
  const [route, setRoute] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (editItem) {
      setAnimalId(editItem.animal.id); setVaccineName(editItem.vaccineName)
      setVaccineType(editItem.vaccineType); setDueDate(editItem.dueDate.split('T')[0])
      setAdministeredAt(editItem.administeredAt?.split('T')[0] ?? '')
      setStatus(editItem.status); setAssignedVetId(editItem.assignedVetId ?? '')
      setBatchNumber(editItem.batchNumber ?? ''); setDosage(editItem.dosage ?? '')
      setRoute(editItem.route ?? ''); setNotes(editItem.notes ?? '')
    } else {
      setAnimalId(''); setVaccineName(''); setVaccineType('')
      setDueDate(''); setAdministeredAt(''); setStatus('UPCOMING')
      setAssignedVetId(''); setBatchNumber(''); setDosage(''); setRoute(''); setNotes('')
    }
    setError('')
  }, [open, editItem])

  const handleSubmit = async () => {
    setError('')
    if (!animalId) { setError('Please select an animal.'); return }
    if (!vaccineName) { setError('Vaccine name required.'); return }
    if (!vaccineType) { setError('Vaccine type required.'); return }
    if (!dueDate) { setError('Due date required.'); return }
    setLoading(true)
    try {
      const body = { animalId, vaccineName, vaccineType, dueDate, administeredAt: administeredAt || null, status, assignedVetId: assignedVetId || null, batchNumber: batchNumber || null, dosage: dosage || null, route: route || null, notes: notes || null }
      let data
      if (isEdit) {
        data = await apiFetch(`/api/health/vaccinations/${editItem!.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        data = await apiFetch('/api/health/vaccinations', { method: 'POST', body: JSON.stringify(body) })
      }
      onSaved(data.schedule ?? data.vaccination)
      onClose()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Vaccination' : 'Schedule Vaccination'} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-4">
        {error && <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 text-sm text-red-700 dark:text-red-400"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Animal *">
            <select className={selCls} value={animalId} onChange={e => setAnimalId(e.target.value)} disabled={isEdit}>
              <option value="">Select animal…</option>
              {animals.map(a => <option key={a.id} value={a.id}>{a.name} — {a.type} ({a.breed}){a.identificationId ? ` #${a.identificationId}` : ''}</option>)}
            </select>
          </Field>
          <Field label="Vaccine Name *">
            <input className={inpCls} value={vaccineName} onChange={e => setVaccineName(e.target.value)} placeholder="e.g. FMD Trivalent" />
          </Field>
          <Field label="Vaccine Type *">
            <input className={inpCls} value={vaccineType} onChange={e => setVaccineType(e.target.value)} placeholder="e.g. FMD, PPR, BVD…" />
          </Field>
          <Field label="Due Date *">
            <input type="date" className={inpCls} value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </Field>
          <Field label="Status">
            <select className={selCls} value={status} onChange={e => setStatus(e.target.value as any)}>
              <option value="UPCOMING">Upcoming</option>
              <option value="OVERDUE">Overdue</option>
              <option value="COMPLETED">Completed</option>
              <option value="SKIPPED">Skipped</option>
            </select>
          </Field>
          {status === 'COMPLETED' && (
            <Field label="Administered At">
              <input type="date" className={inpCls} value={administeredAt} onChange={e => setAdministeredAt(e.target.value)} />
            </Field>
          )}
          <Field label="Assigned Vet">
            <select className={selCls} value={assignedVetId} onChange={e => setAssignedVetId(e.target.value)}>
              <option value="">Select vet…</option>
              {vets.map(v => <option key={v.id} value={v.id}>{v.name} — {v.speciality}</option>)}
            </select>
          </Field>
          <Field label="Batch Number">
            <input className={inpCls} value={batchNumber} onChange={e => setBatchNumber(e.target.value)} placeholder="Batch #" />
          </Field>
          <Field label="Dosage">
            <input className={inpCls} value={dosage} onChange={e => setDosage(e.target.value)} placeholder="e.g. 2ml" />
          </Field>
          <Field label="Route">
            <select className={selCls} value={route} onChange={e => setRoute(e.target.value)}>
              <option value="">Select route…</option>
              <option value="injection">Injection</option>
              <option value="oral">Oral</option>
              <option value="nasal">Nasal</option>
              <option value="topical">Topical</option>
            </select>
          </Field>
        </div>
        <Field label="Notes">
          <textarea className={`${inpCls} resize-none h-16`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes…" />
        </Field>
        <div className="flex gap-2 justify-end pt-1 border-t border-border">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{isEdit ? 'Save Changes' : 'Schedule'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Disease Form Modal ───────────────────────────────────────────────────────
function DiseaseFormModal({ open, onClose, onSaved, animals, editItem }: {
  open: boolean; onClose: () => void; onSaved: (item: DiseaseOutbreak) => void
  animals: AnimalOption[]; editItem?: DiseaseOutbreak | null
}) {
  const isEdit = !!editItem
  const [name, setName] = useState('')
  const [category, setCategory] = useState('INFECTIOUS')
  const [severity, setSeverity] = useState<DiseaseOutbreak['severity']>('MEDIUM')
  const [trend, setTrend] = useState<DiseaseOutbreak['trend']>('STABLE')
  const [firstCaseDate, setFirstCaseDate] = useState('')
  const [lastCaseDate, setLastCaseDate] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [quarantineActive, setQuarantineActive] = useState(false)
  const [quarantineZone, setQuarantineZone] = useState('')
  const [treatmentProtocol, setTreatmentProtocol] = useState('')
  const [preventionMeasures, setPreventionMeasures] = useState('')
  const [reportedToAuthorities, setReportedToAuthorities] = useState(false)
  const [selectedAnimals, setSelectedAnimals] = useState<{ animalId: string; dateAffected: string }[]>([])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!open) return
    if (editItem) {
      setName(editItem.name); setCategory(editItem.category); setSeverity(editItem.severity)
      setTrend(editItem.trend); setFirstCaseDate(editItem.firstCaseDate.split('T')[0])
      setLastCaseDate(editItem.lastCaseDate.split('T')[0]); setIsActive(editItem.isActive)
      setQuarantineActive(editItem.quarantineActive); setQuarantineZone(editItem.quarantineZone ?? '')
      setTreatmentProtocol(editItem.treatmentProtocol ?? ''); setPreventionMeasures(editItem.preventionMeasures ?? '')
      setReportedToAuthorities(editItem.reportedToAuthorities); setNotes(editItem.notes ?? '')
    } else {
      setName(''); setCategory('INFECTIOUS'); setSeverity('MEDIUM'); setTrend('STABLE')
      setFirstCaseDate(today); setLastCaseDate(today); setIsActive(true)
      setQuarantineActive(false); setQuarantineZone(''); setTreatmentProtocol('')
      setPreventionMeasures(''); setReportedToAuthorities(false); setSelectedAnimals([]); setNotes('')
    }
    setError('')
  }, [open, editItem])

  const toggleAnimal = (animalId: string) => {
    setSelectedAnimals(prev => {
      if (prev.find(a => a.animalId === animalId)) return prev.filter(a => a.animalId !== animalId)
      return [...prev, { animalId, dateAffected: today }]
    })
  }

  const handleSubmit = async () => {
    setError('')
    if (!name) { setError('Disease name required.'); return }
    if (!firstCaseDate || !lastCaseDate) { setError('Case dates required.'); return }
    setLoading(true)
    try {
      const body = {
        name, category, severity, trend, firstCaseDate, lastCaseDate, isActive,
        quarantineActive, quarantineZone: quarantineZone || null,
        treatmentProtocol: treatmentProtocol || null, preventionMeasures: preventionMeasures || null,
        reportedToAuthorities, notes: notes || null,
        affectedAnimalIds: isEdit ? undefined : selectedAnimals,
      }
      let data
      if (isEdit) {
        data = await apiFetch(`/api/health/diseases/${editItem!.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        data = await apiFetch('/api/health/diseases', { method: 'POST', body: JSON.stringify(body) })
      }
      onSaved(data.outbreak)
      onClose()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Outbreak' : 'Log Disease Outbreak'} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-4">
        {error && <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 text-sm text-red-700"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Disease Name *">
            <input className={inpCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Foot-and-Mouth Disease" />
          </Field>
          <Field label="Category">
            <select className={selCls} value={category} onChange={e => setCategory(e.target.value)}>
              {['INFECTIOUS','GENETIC','NUTRITIONAL','ENVIRONMENTAL','PARASITIC','OTHER'].map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
            </select>
          </Field>
          <Field label="Severity">
            <select className={selCls} value={severity} onChange={e => setSeverity(e.target.value as any)}>
              <option value="LOW">Low</option><option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option><option value="CRITICAL">Critical</option>
            </select>
          </Field>
          <Field label="Trend">
            <select className={selCls} value={trend} onChange={e => setTrend(e.target.value as any)}>
              <option value="RISING">Rising</option><option value="STABLE">Stable</option><option value="FALLING">Falling</option>
            </select>
          </Field>
          <Field label="First Case Date *">
            <input type="date" className={inpCls} value={firstCaseDate} onChange={e => setFirstCaseDate(e.target.value)} max={today} />
          </Field>
          <Field label="Last Case Date *">
            <input type="date" className={inpCls} value={lastCaseDate} onChange={e => setLastCaseDate(e.target.value)} max={today} />
          </Field>
          <div className="sm:col-span-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />Active outbreak
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={quarantineActive} onChange={e => setQuarantineActive(e.target.checked)} className="rounded" />Quarantine active
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={reportedToAuthorities} onChange={e => setReportedToAuthorities(e.target.checked)} className="rounded" />Reported to authorities
            </label>
          </div>
          {quarantineActive && (
            <Field label="Quarantine Zone">
              <input className={inpCls} value={quarantineZone} onChange={e => setQuarantineZone(e.target.value)} placeholder="e.g. Pen B, Section 3" />
            </Field>
          )}
        </div>
        <Field label="Treatment Protocol">
          <textarea className={`${inpCls} resize-none h-16`} value={treatmentProtocol} onChange={e => setTreatmentProtocol(e.target.value)} placeholder="Protocol steps…" />
        </Field>
        <Field label="Prevention Measures">
          <textarea className={`${inpCls} resize-none h-16`} value={preventionMeasures} onChange={e => setPreventionMeasures(e.target.value)} placeholder="Prevention and containment…" />
        </Field>
        {!isEdit && animals.length > 0 && (
          <div>
            <p className={`${lblCls} mb-2`}>Affected Animals ({selectedAnimals.length} selected)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
              {animals.map(a => {
                const sel = selectedAnimals.find(s => s.animalId === a.id)
                return (
                  <button key={a.id} type="button" onClick={() => toggleAnimal(a.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-left transition-all ${sel ? 'bg-primary/10 text-primary font-medium border border-primary/30' : 'bg-muted/40 hover:bg-muted border border-transparent'}`}>
                    {sel && <CheckCircle2 className="w-3 h-3 flex-shrink-0" />}
                    <span className="truncate">{a.name}</span>
                    <span className="text-muted-foreground text-[10px] ml-auto">{a.type}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <Field label="Notes">
          <textarea className={`${inpCls} resize-none h-14`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Clinical observations…" />
        </Field>
        <div className="flex gap-2 justify-end pt-1 border-t border-border">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{isEdit ? 'Save Changes' : 'Log Outbreak'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Treatment Form Modal ─────────────────────────────────────────────────────
function TreatmentFormModal({ open, onClose, onSaved, animals, vets, editItem }: {
  open: boolean; onClose: () => void; onSaved: (item: Treatment) => void
  animals: AnimalOption[]; vets: VetProfile[]; editItem?: Treatment | null
}) {
  const isEdit = !!editItem
  const [animalId, setAnimalId] = useState('')
  const [condition, setCondition] = useState('')
  const [status, setStatus] = useState<Treatment['status']>('PENDING')
  const [priority, setPriority] = useState<Treatment['priority']>('MEDIUM')
  const [startDate, setStartDate] = useState('')
  const [assignedVetId, setAssignedVetId] = useState('')
  const [medication, setMedication] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('')
  const [isolationRequired, setIsolationRequired] = useState(false)
  const [isolationLocation, setIsolationLocation] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [steps, setSteps] = useState<TreatmentStep[]>([])
  const [newStep, setNewStep] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!open) return
    if (editItem) {
      setAnimalId(editItem.animal.id); setCondition(editItem.condition)
      setStatus(editItem.status); setPriority(editItem.priority)
      setStartDate(editItem.startDate.split('T')[0])
      setAssignedVetId(editItem.assignedVetId ?? '')
      setMedication(editItem.medication ?? ''); setDosage(editItem.dosage ?? '')
      setFrequency(editItem.frequency ?? ''); setIsolationRequired(editItem.isolationRequired)
      setIsolationLocation(editItem.isolationLocation ?? '')
      setFollowUpDate(editItem.followUpDate?.split('T')[0] ?? '')
      setSteps(editItem.steps ?? []); setNotes(editItem.notes ?? '')
    } else {
      setAnimalId(''); setCondition(''); setStatus('PENDING'); setPriority('MEDIUM')
      setStartDate(today); setAssignedVetId(''); setMedication(''); setDosage('')
      setFrequency(''); setIsolationRequired(false); setIsolationLocation('')
      setFollowUpDate(''); setSteps([]); setNotes('')
    }
    setError('')
  }, [open, editItem])

  const addStep = () => {
    if (!newStep.trim()) return
    setSteps(prev => [...prev, { label: newStep.trim(), done: false }])
    setNewStep('')
  }

  const toggleStep = (i: number) => setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, done: !s.done } : s))
  const removeStep = (i: number) => setSteps(prev => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async () => {
    setError('')
    if (!animalId) { setError('Please select an animal.'); return }
    if (!condition) { setError('Condition required.'); return }
    if (!startDate) { setError('Start date required.'); return }
    setLoading(true)
    try {
      const body = { animalId, condition, status, priority, startDate, assignedVetId: assignedVetId || null, medication: medication || null, dosage: dosage || null, frequency: frequency || null, isolationRequired, isolationLocation: isolationLocation || null, followUpDate: followUpDate || null, steps, notes: notes || null }
      let data
      if (isEdit) {
        data = await apiFetch(`/api/health/treatments/${editItem!.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        data = await apiFetch('/api/health/treatments', { method: 'POST', body: JSON.stringify(body) })
      }
      onSaved(data.treatment)
      onClose()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Treatment' : 'New Treatment'} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-4">
        {error && <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 text-sm text-red-700"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Animal *">
            <select className={selCls} value={animalId} onChange={e => setAnimalId(e.target.value)} disabled={isEdit}>
              <option value="">Select animal…</option>
              {animals.map(a => <option key={a.id} value={a.id}>{a.name} — {a.type} ({a.breed}){a.identificationId ? ` #${a.identificationId}` : ''}</option>)}
            </select>
          </Field>
          <Field label="Condition *">
            <input className={inpCls} value={condition} onChange={e => setCondition(e.target.value)} placeholder="e.g. FMD Recovery, Mastitis…" />
          </Field>
          <Field label="Status">
            <select className={selCls} value={status} onChange={e => setStatus(e.target.value as any)}>
              <option value="PENDING">Pending</option><option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option>
            </select>
          </Field>
          <Field label="Priority">
            <select className={selCls} value={priority} onChange={e => setPriority(e.target.value as any)}>
              <option value="LOW">Low</option><option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option><option value="CRITICAL">Critical</option>
            </select>
          </Field>
          <Field label="Start Date *">
            <input type="date" className={inpCls} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </Field>
          <Field label="Follow-up Date">
            <input type="date" className={inpCls} value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
          </Field>
          <Field label="Assigned Vet">
            <select className={selCls} value={assignedVetId} onChange={e => setAssignedVetId(e.target.value)}>
              <option value="">Select vet…</option>
              {vets.map(v => <option key={v.id} value={v.id} disabled={v.availability === 'OFF_DUTY' || v.availability === 'ON_LEAVE'}>{v.name} — {v.speciality} [{v.availability}]</option>)}
            </select>
          </Field>
          <Field label="Medication">
            <input className={inpCls} value={medication} onChange={e => setMedication(e.target.value)} placeholder="Drug name" />
          </Field>
          <Field label="Dosage">
            <input className={inpCls} value={dosage} onChange={e => setDosage(e.target.value)} placeholder="e.g. 10ml twice daily" />
          </Field>
          <Field label="Frequency">
            <select className={selCls} value={frequency} onChange={e => setFrequency(e.target.value)}>
              <option value="">Select…</option>
              <option value="once daily">Once daily</option>
              <option value="twice daily">Twice daily</option>
              <option value="three times daily">Three times daily</option>
              <option value="every 48 hours">Every 48 hours</option>
              <option value="weekly">Weekly</option>
              <option value="as needed">As needed</option>
            </select>
          </Field>
          <div className="sm:col-span-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isolationRequired} onChange={e => setIsolationRequired(e.target.checked)} className="rounded" />Isolation required
            </label>
          </div>
          {isolationRequired && (
            <Field label="Isolation Location">
              <input className={inpCls} value={isolationLocation} onChange={e => setIsolationLocation(e.target.value)} placeholder="e.g. Pen B, Isolation Ward" />
            </Field>
          )}
        </div>

        {/* Treatment Steps Builder */}
        <div>
          <p className={`${lblCls} mb-2`}>Treatment Steps</p>
          <div className="flex gap-2 mb-2">
            <input className={`${inpCls} flex-1`} value={newStep} onChange={e => setNewStep(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addStep())}
              placeholder="Add step and press Enter…" />
            <button type="button" onClick={addStep}
              className="px-3 py-2 rounded-xl bg-muted text-sm hover:bg-border transition-colors"><Plus className="w-4 h-4" /></button>
          </div>
          {steps.length > 0 && (
            <ol className="space-y-1.5">
              {steps.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-sm bg-muted/30 rounded-lg px-3 py-1.5">
                  <button type="button" onClick={() => toggleStep(i)}
                    className={`w-4 h-4 rounded-full flex-shrink-0 border-2 transition-colors ${s.done ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground'}`}>
                    {s.done && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </button>
                  <span className={`flex-1 ${s.done ? 'line-through text-muted-foreground' : ''}`}>{s.label}</span>
                  <button type="button" onClick={() => removeStep(i)} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                </li>
              ))}
            </ol>
          )}
        </div>

        <Field label="Clinical Notes">
          <textarea className={`${inpCls} resize-none h-16`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observations, complications…" />
        </Field>
        <div className="flex gap-2 justify-end pt-1 border-t border-border">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{isEdit ? 'Save Changes' : 'Create Treatment'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Vet Form Modal ───────────────────────────────────────────────────────────
function VetFormModal({ open, onClose, onSaved, editItem }: {
  open: boolean; onClose: () => void; onSaved: (item: VetProfile) => void; editItem?: VetProfile | null
}) {
  const isEdit = !!editItem
  const [name, setName] = useState(''); const [email, setEmail] = useState('')
  const [phone, setPhone] = useState(''); const [speciality, setSpeciality] = useState('')
  const [licenseNo, setLicenseNo] = useState(''); const [availability, setAvailability] = useState<VetProfile['availability']>('AVAILABLE')
  const [isExternal, setIsExternal] = useState(false); const [clinicName, setClinicName] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false); const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (editItem) {
      setName(editItem.name); setEmail(editItem.email ?? ''); setPhone(editItem.phone ?? '')
      setSpeciality(editItem.speciality); setLicenseNo(editItem.licenseNo ?? '')
      setAvailability(editItem.availability); setIsExternal(editItem.isExternal)
      setClinicName(editItem.clinicName ?? ''); setNotes(editItem.notes ?? '')
    } else {
      setName(''); setEmail(''); setPhone(''); setSpeciality('')
      setLicenseNo(''); setAvailability('AVAILABLE'); setIsExternal(false)
      setClinicName(''); setNotes('')
    }
    setError('')
  }, [open, editItem])

  const handleSubmit = async () => {
    setError('')
    if (!name) { setError('Name required.'); return }
    if (!speciality) { setError('Speciality required.'); return }
    setLoading(true)
    try {
      const body = { name, email: email || null, phone: phone || null, speciality, licenseNo: licenseNo || null, availability, isExternal, clinicName: clinicName || null, notes: notes || null }
      let data
      if (isEdit) {
        data = await apiFetch(`/api/health/vets?id=${editItem!.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        data = await apiFetch('/api/health/vets', { method: 'POST', body: JSON.stringify(body) })
      }
      onSaved(data.vet)
      onClose()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Vet Profile' : 'Add Vet Profile'}>
      <div className="flex flex-col gap-4">
        {error && <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 text-sm text-red-700"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name *"><input className={inpCls} value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Jane Smith" /></Field>
          <Field label="Speciality *"><input className={inpCls} value={speciality} onChange={e => setSpeciality(e.target.value)} placeholder="Large Animal, Swine…" /></Field>
          <Field label="Email"><input type="email" className={inpCls} value={email} onChange={e => setEmail(e.target.value)} placeholder="vet@example.com" /></Field>
          <Field label="Phone"><input type="tel" className={inpCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254 7xx xxx xxx" /></Field>
          <Field label="License No"><input className={inpCls} value={licenseNo} onChange={e => setLicenseNo(e.target.value)} placeholder="KVB-12345" /></Field>
          <Field label="Availability">
            <select className={selCls} value={availability} onChange={e => setAvailability(e.target.value as any)}>
              <option value="AVAILABLE">Available</option><option value="BUSY">Busy</option>
              <option value="OFF_DUTY">Off Duty</option><option value="ON_LEAVE">On Leave</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isExternal} onChange={e => setIsExternal(e.target.checked)} className="rounded" />External / Consultant Vet
            </label>
          </div>
          {isExternal && <Field label="Clinic Name"><input className={inpCls} value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="Clinic or practice name" /></Field>}
        </div>
        <Field label="Notes"><textarea className={`${inpCls} resize-none h-14`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Areas of expertise, notes…" /></Field>
        <div className="flex gap-2 justify-end pt-1 border-t border-border">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{isEdit ? 'Save Changes' : 'Add Vet'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Treatment Detail Modal ───────────────────────────────────────────────────
function TreatmentDetailModal({ open, onClose, treatment, onEdit, onDelete, canWrite }: {
  open: boolean; onClose: () => void; treatment: Treatment | null
  onEdit: (t: Treatment) => void; onDelete: (t: Treatment) => void; canWrite: boolean
}) {
  if (!treatment) return null
  const prCfg = SEVERITY_CFG[treatment.priority]
  const stCfg = TX_CFG[treatment.status]
  const steps = treatment.steps ?? []
  const done = steps.filter(s => s.done).length
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0
  return (
    <Modal open={open} onClose={onClose} title="Treatment Details">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-lg">{treatment.condition}</h3>
            <p className="text-sm text-muted-foreground">{treatment.animal.name} — {treatment.animal.type} ({treatment.animal.breed})</p>
          </div>
          <div className="flex gap-1.5">
            <PillComponents bg={prCfg.bg} text={prCfg.text} label={prCfg.label} />
            <PillComponents  bg={stCfg.bg} text={stCfg.text} label={stCfg.label} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 bg-muted/40 rounded-xl"><p className="text-xs text-muted-foreground mb-0.5">Assigned Vet</p><p className="font-medium">{treatment.assignedVetName ?? '—'}</p></div>
          <div className="p-3 bg-muted/40 rounded-xl"><p className="text-xs text-muted-foreground mb-0.5">Start Date</p><p className="font-medium">{new Date(treatment.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</p></div>
          {treatment.medication && <div className="p-3 bg-muted/40 rounded-xl"><p className="text-xs text-muted-foreground mb-0.5">Medication</p><p className="font-medium">{treatment.medication}</p></div>}
          {treatment.dosage && <div className="p-3 bg-muted/40 rounded-xl"><p className="text-xs text-muted-foreground mb-0.5">Dosage</p><p className="font-medium">{treatment.dosage}{treatment.frequency ? ` · ${treatment.frequency}` : ''}</p></div>}
          {treatment.isolationRequired && <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl col-span-2"><p className="text-xs text-amber-700 dark:text-amber-400 mb-0.5 font-semibold">⚠ Isolation Required</p><p className="font-medium text-amber-900 dark:text-amber-300">{treatment.isolationLocation ?? 'Location not specified'}</p></div>}
        </div>
        {steps.length > 0 && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>{done}/{steps.length} steps</span><span>{pct}%</span></div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
            <ol className="space-y-1.5">
              {steps.map((s, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${s.done ? 'bg-emerald-500' : 'bg-muted border-2 border-border'}`}>
                    {s.done && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </span>
                  <span className={s.done ? 'line-through text-muted-foreground' : ''}>{s.label}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {treatment.notes && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Clinical Notes</p>
            <p className="text-sm text-amber-900 dark:text-amber-300">{treatment.notes}</p>
          </div>
        )}
        {treatment.createdBy && <p className="text-xs text-muted-foreground">Recorded by {treatment.createdBy.name} · {new Date(treatment.createdAt).toLocaleDateString()}</p>}
        {canWrite && (
          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <button onClick={() => { onClose(); onDelete(treatment) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm"><Trash2 className="w-3.5 h-3.5" />Delete</button>
            <button onClick={() => { onClose(); onEdit(treatment) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:opacity-90"><Edit2 className="w-3.5 h-3.5" />Edit</button>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HealthIntelligencePage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [activeTab, setActiveTab] = useState<'vaccinations' | 'diseases' | 'treatments' | 'vets'>('vaccinations')
  const [vaccinations, setVaccinations] = useState<VaccinationSchedule[]>([])
  const [diseases, setDiseases] = useState<DiseaseOutbreak[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [vets, setVets] = useState<VetProfile[]>([])
  const [animals, setAnimals] = useState<AnimalOption[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [vaccFilter, setVaccFilter] = useState<string>('all')
  const [expandedDisease, setExpandedDisease] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)

  // Modal state
  const [showVaccModal, setShowVaccModal] = useState(false)
  const [showDiseaseModal, setShowDiseaseModal] = useState(false)
  const [showTreatmentModal, setShowTreatmentModal] = useState(false)
  const [showVetModal, setShowVetModal] = useState(false)
  const [showTreatmentDetail, setShowTreatmentDetail] = useState(false)
  const [editVacc, setEditVacc] = useState<VaccinationSchedule | null>(null)
  const [editDisease, setEditDisease] = useState<DiseaseOutbreak | null>(null)
  const [editTreatment, setEditTreatment] = useState<Treatment | null>(null)
  const [editVet, setEditVet] = useState<VetProfile | null>(null)
  const [detailTreatment, setDetailTreatment] = useState<Treatment | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; label: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => setToast({ message, type }), [])

  // ── Load session ────────────────────────────────────────────────────────────
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) try { setUser(JSON.parse(userData)) } catch {}
    loadAll()
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [vRes, dRes, tRes, vetRes, aRes] = await Promise.all([
        apiFetch('/api/health/vaccinations?limit=100'),
        apiFetch('/api/health/diseases?isActive=true&limit=100'),
        apiFetch('/api/health/treatments?limit=100'),
        apiFetch('/api/health/vets'),
        apiFetch('/api/animals?limit=500'),
      ])
      setVaccinations(vRes.schedules ?? [])
      setDiseases(dRes.outbreaks ?? [])
      setTreatments(tRes.treatments ?? [])
      setVets(vetRes.vets ?? [])
      setAnimals(aRes.animals ?? [])
    } catch (e: any) {
      showToast(e.message || 'Failed to load health data', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAll()
    setRefreshing(false)
    showToast('Data refreshed', 'success')
  }

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => ({
    overdueVacc: vaccinations.filter(v => v.status === 'OVERDUE').length,
    activeDiseases: diseases.filter(d => d.isActive).length,
    activeTransactions: treatments.filter(t => t.status === 'IN_PROGRESS').length,
    availableVets: vets.filter(v => v.availability === 'AVAILABLE').length,
  }), [vaccinations, diseases, treatments, vets])

  // ── Filtered lists ──────────────────────────────────────────────────────────
  const filteredVacc = useMemo(() => {
    let list = vaccFilter === 'all' ? vaccinations : vaccinations.filter(v => v.status === vaccFilter.toUpperCase())
    if (search) list = list.filter(v => v.animal.name.toLowerCase().includes(search.toLowerCase()) || v.vaccineName.toLowerCase().includes(search.toLowerCase()) || (v.assignedVetName ?? '').toLowerCase().includes(search.toLowerCase()))
    return list
  }, [vaccinations, vaccFilter, search])

  const filteredDiseases = useMemo(() => {
    if (!search) return diseases
    return diseases.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
  }, [diseases, search])

  const filteredTreatments = useMemo(() => {
    if (!search) return treatments
    return treatments.filter(t => t.animal.name.toLowerCase().includes(search.toLowerCase()) || t.condition.toLowerCase().includes(search.toLowerCase()) || (t.assignedVetName ?? '').toLowerCase().includes(search.toLowerCase()))
  }, [treatments, search])

  const filteredVets = useMemo(() => {
    if (!search) return vets
    return vets.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || v.speciality.toLowerCase().includes(search.toLowerCase()))
  }, [vets, search])

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const { type, id } = deleteTarget
      if (type === 'vacc') {
        await apiFetch(`/api/health/vaccinations/${id}`, { method: 'DELETE' })
        setVaccinations(p => p.filter(v => v.id !== id))
      } else if (type === 'disease') {
        await apiFetch(`/api/health/diseases/${id}`, { method: 'DELETE' })
        setDiseases(p => p.filter(d => d.id !== id))
      } else if (type === 'treatment') {
        await apiFetch(`/api/health/treatments/${id}`, { method: 'DELETE' })
        setTreatments(p => p.filter(t => t.id !== id))
      } else if (type === 'vet') {
        await apiFetch(`/api/health/vets?id=${id}`, { method: 'DELETE' })
        setVets(p => p.filter(v => v.id !== id))
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
  const manageVets = canManageVets(user?.role)

  const TABS = [
    { id: 'vaccinations', label: 'Vaccinations', icon: Syringe, count: kpis.overdueVacc, countLabel: 'overdue' },
    { id: 'diseases', label: 'Diseases', icon: Bug, count: kpis.activeDiseases, countLabel: 'active' },
    { id: 'treatments', label: 'Treatments', icon: ClipboardList, count: kpis.activeTransactions, countLabel: 'active' },
    { id: 'vets', label: 'Vets', icon: Stethoscope, count: kpis.availableVets, countLabel: 'available' },
  ] as const

  if (loading) return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-5">
      <div className="h-10 w-64 bg-muted animate-pulse rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}</div>
      <div className="h-64 bg-muted animate-pulse rounded-2xl" />
    </div>
  )

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <header className="animate-fade-up" style={{ animationFillMode: 'forwards' }}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-xs font-semibold tracking-widest uppercase text-primary">Health Intelligence</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Health Intelligence System</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Vaccination schedules · Disease tracking · Treatment workflows · Vet management
              {user && <span className="ml-2 bg-muted px-2 py-0.5 rounded-full text-xs">{user.role}</span>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={handleRefresh} disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm hover:bg-muted disabled:opacity-50 transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />Refresh
            </button>
            {!write && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-xl">
                <Shield className="w-3.5 h-3.5" />View only
              </div>
            )}
          </div>
        </div>
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up delay-75" style={{ animationFillMode: 'forwards' }}>
        {[
          { label: 'Overdue Vaccines', value: kpis.overdueVacc, icon: Syringe, color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
          { label: 'Active Diseases', value: kpis.activeDiseases, icon: Thermometer, color: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400' },
          { label: 'Treatments Running', value: kpis.activeTransactions, icon: Pill, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
          { label: 'Vets Available', value: kpis.availableVets, icon: Stethoscope, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <div key={label} className="animate-fade-up bg-card border border-border rounded-2xl p-4 flex items-center gap-3 card-hover shadow-sm"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}>
            <span className={`p-2.5 rounded-xl ${color} flex-shrink-0`}><Icon className="w-4 h-4" /></span>
            <div>
              <p className="stat-number text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {kpis.overdueVacc > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400 animate-fade-up" role="alert">
          <Bell className="w-4 h-4 flex-shrink-0 animate-pulse" />
          <strong>{kpis.overdueVacc} overdue vaccination{kpis.overdueVacc > 1 ? 's' : ''}</strong> — immediate attention needed
        </div>
      )}

      {/* Tab nav */}
      <nav className="animate-fade-up delay-100" style={{ animationFillMode: 'forwards' }}>
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-full overflow-x-auto" role="tablist">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button key={tab.id} role="tab" aria-selected={active}
                onClick={() => { setActiveTab(tab.id); setSearch('') }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 flex-1 justify-center ${active ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-primary text-primary-foreground' : 'bg-border text-muted-foreground'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
          className="w-full pl-9 pr-3 py-2 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {/* ── VACCINATIONS TAB ── */}
      {activeTab === 'vaccinations' && (
        <section className="animate-fade-up space-y-4" style={{ animationFillMode: 'forwards' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2"><Syringe className="w-5 h-5 text-primary" />Vaccination Schedules</h2>
              <p className="text-sm text-muted-foreground">{vaccinations.length} records total</p>
            </div>
            {write && (
              <button onClick={() => { setEditVacc(null); setShowVaccModal(true) }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4" />Schedule Vaccination
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'upcoming', 'overdue', 'completed', 'skipped'] as const).map(f => (
              <button key={f} onClick={() => setVaccFilter(f)} aria-pressed={vaccFilter === f}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${vaccFilter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                {f}
              </button>
            ))}
          </div>

          {filteredVacc.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <Syringe className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No vaccination records found</p>
              {write && <p className="text-xs mt-1">Click "Schedule Vaccination" to add one</p>}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredVacc.map((v, i) => (
                <article key={v.id} className="animate-fade-up card-hover flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-card border border-border rounded-xl"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}>
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-1 sm:gap-3">
                    <div>
                      <p className="text-sm font-semibold truncate">{v.animal.name}</p>
                      <p className="text-xs text-muted-foreground">{v.animal.type}{v.animal.identificationId ? ` · #${v.animal.identificationId}` : ''}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{v.vaccineName}</p>
                      <p className="text-xs text-muted-foreground">{v.vaccineType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Due date</p>
                      <p className="text-sm font-medium flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(v.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Assigned vet</p>
                      <p className="text-sm font-medium">{v.assignedVetName ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PillComponents bg={VACC_CFG[v.status].bg} text={VACC_CFG[v.status].text} label={VACC_CFG[v.status].label} />
                    {write && (
                      <div className="flex gap-1">
                        <button onClick={() => { setEditVacc(v); setShowVaccModal(true) }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteTarget({ type: 'vacc', id: v.id, label: `${v.vaccineName} for ${v.animal.name}` })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── DISEASES TAB ── */}
      {activeTab === 'diseases' && (
        <section className="animate-fade-up delay-100 space-y-4" style={{ animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2"><Bug className="w-5 h-5 text-amber-600" />Disease Tracking</h2>
              <p className="text-sm text-muted-foreground">Active outbreaks · last 30 days</p>
            </div>
            {write && (
              <button onClick={() => { setEditDisease(null); setShowDiseaseModal(true) }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:opacity-90">
                <Plus className="w-4 h-4" />Log Outbreak
              </button>
            )}
          </div>

          {filteredDiseases.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <Bug className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No active disease outbreaks</p>
              {write && <p className="text-xs mt-1">Click "Log Outbreak" to track a disease</p>}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredDiseases.map((d, i) => {
                const cfg = SEVERITY_CFG[d.severity]
                const open = expandedDisease === d.id
                return (
                  <article key={d.id} className="animate-fade-up bg-card border border-border rounded-xl overflow-hidden card-hover"
                    style={{ animationDelay: `${i * 70}ms`, animationFillMode: 'forwards' }}>
                    <button onClick={() => setExpandedDisease(open ? null : d.id)} aria-expanded={open}
                      className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot} ${d.trend === 'RISING' ? 'animate-pulse' : ''}`} />
                      <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <p className="text-sm font-semibold col-span-2 sm:col-span-1 truncate">{d.name}</p>
                        <p className="text-sm text-muted-foreground"><strong className="text-foreground">{d.affectedAnimals.length}</strong> affected</p>
                        <TrendArrow trend={d.trend} />
                        <PillComponents bg={cfg.bg} text={cfg.text} label={cfg.label} />
                      </div>
                      {write && (
                        <div className="flex gap-1 mr-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setEditDisease(d); setShowDiseaseModal(true) }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteTarget({ type: 'disease', id: d.id, label: d.name })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                      {open ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                    </button>
                    {open && (
                      <div className="px-4 pb-4 border-t border-border bg-muted/20 space-y-3">
                        <div className="pt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                          <div><p className="text-xs text-muted-foreground">Category</p><p className="font-medium">{d.category}</p></div>
                          <div><p className="text-xs text-muted-foreground">Last case</p><p className="font-medium">{new Date(d.lastCaseDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</p></div>
                          <div><p className="text-xs text-muted-foreground">Status</p><p className={`font-medium ${d.isActive ? 'text-red-600' : 'text-emerald-600'}`}>{d.isActive ? 'Active' : 'Resolved'}</p></div>
                          {d.quarantineActive && <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Quarantine Zone</p><p className="font-medium text-orange-600">⚠ {d.quarantineZone ?? 'Active'}</p></div>}
                          {d.reportedToAuthorities && <div><p className="text-xs text-muted-foreground">Authorities</p><p className="font-medium text-blue-600">✓ Reported</p></div>}
                        </div>
                        {d.affectedAnimals.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Affected Animals</p>
                            <div className="flex flex-wrap gap-1.5">
                              {d.affectedAnimals.map(a => (
                                <span key={a.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${a.isRecovered ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'}`}>
                                  {a.isRecovered && <CheckCircle2 className="w-2.5 h-2.5" />}
                                  {a.animal.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {d.treatmentProtocol && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Protocol:</span> {d.treatmentProtocol}</p>}
                        {d.notes && <p className="text-sm text-muted-foreground italic">{d.notes}</p>}
                        {d.createdBy && <p className="text-xs text-muted-foreground/60">Logged by {d.createdBy.name}</p>}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ── TREATMENTS TAB ── */}
      {activeTab === 'treatments' && (
        <section className="animate-fade-up delay-200 space-y-4" style={{ animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2"><ClipboardList className="w-5 h-5 text-blue-600" />Treatment Workflows</h2>
              <p className="text-sm text-muted-foreground">{treatments.length} total · {kpis.activeTransactions} active</p>
            </div>
            {write && (
              <button onClick={() => { setEditTreatment(null); setShowTreatmentModal(true) }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:opacity-90">
                <Plus className="w-4 h-4" />New Treatment
              </button>
            )}
          </div>

          {filteredTreatments.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No treatment records found</p>
              {write && <p className="text-xs mt-1">Click "New Treatment" to start a workflow</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTreatments.map((t, i) => {
                const cfg = SEVERITY_CFG[t.priority]
                const txCfg = TX_CFG[t.status]
                const steps = t.steps ?? []
                const done = steps.filter(s => s.done).length
                const pct = steps.length ? Math.round((done / steps.length) * 100) : 0
                return (
                  <article key={t.id} className="animate-fade-up bg-card border border-border rounded-xl p-4 cursor-pointer card-hover flex flex-col gap-3"
                    style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
                    onClick={() => { setDetailTreatment(t); setShowTreatmentDetail(true) }}
                    role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && (setDetailTreatment(t), setShowTreatmentDetail(true))}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{t.animal.name}</p>
                        <p className="text-xs text-muted-foreground">{t.condition}</p>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${cfg.dot}`} />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <PillComponents bg={txCfg.bg} text={txCfg.text} label={txCfg.label} />
                      <PillComponents bg={cfg.bg} text={cfg.text} label={cfg.label} />
                    </div>
                    {steps.length > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>{done}/{steps.length} steps</span><span>{pct}%</span></div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} /></div>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />{t.assignedVetName ?? 'Unassigned'}
                    </div>
                    {t.isolationRequired && (
                      <div className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1"><MapPin className="w-3 h-3" />Isolation: {t.isolationLocation ?? 'Required'}</div>
                    )}
                    {write && (
                      <div className="flex gap-1 pt-1 border-t border-border justify-end" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setEditTreatment(t); setShowTreatmentModal(true) }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteTarget({ type: 'treatment', id: t.id, label: `${t.condition} for ${t.animal.name}` })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ── VETS TAB ── */}
      {activeTab === 'vets' && (
        <section className="animate-fade-up delay-300 space-y-4" style={{ animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2"><Stethoscope className="w-5 h-5 text-purple-600" />Vet Assignment System</h2>
              <p className="text-sm text-muted-foreground">Veterinarian availability and caseloads</p>
            </div>
            {manageVets && (
              <button onClick={() => { setEditVet(null); setShowVetModal(true) }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:opacity-90">
                <Plus className="w-4 h-4" />Add Vet
              </button>
            )}
          </div>

          {filteredVets.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <Stethoscope className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No vet profiles found</p>
              {manageVets && <p className="text-xs mt-1">Click "Add Vet" to register a veterinarian</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVets.map((vet, i) => {
                const avail = AVAIL_CFG[vet.availability]
                return (
                  <article key={vet.id} className="animate-fade-up card-hover bg-card border border-border rounded-xl p-4 flex flex-col gap-3"
                    style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">{vet.name.split(' ').filter(w => w !== 'Dr.').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{vet.name}</p>
                        <p className="text-xs text-muted-foreground">{vet.speciality}</p>
                        {vet.isExternal && <p className="text-xs text-muted-foreground/60">{vet.clinicName ?? 'External'}</p>}
                      </div>
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${avail.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${avail.dot}`} />{avail.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-muted/40 rounded-lg text-center">
                        <p className="text-muted-foreground">Active Cases</p>
                        <p className={`font-bold text-lg stat-number ${vet.currentCaseCount > 4 ? 'text-orange-600' : ''}`}>{vet.currentCaseCount}</p>
                      </div>
                      <div className="p-2.5 bg-muted/40 rounded-lg text-center">
                        <p className="text-muted-foreground">Load</p>
                        <p className={`font-bold text-lg stat-number ${vet.currentCaseCount > 4 ? 'text-orange-600' : 'text-emerald-600'}`}>
                          {vet.currentCaseCount > 6 ? 'Critical' : vet.currentCaseCount > 4 ? 'High' : 'Normal'}
                        </p>
                      </div>
                    </div>

                    {(vet.phone || vet.email) && (
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {vet.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{vet.phone}</p>}
                        {vet.email && <p className="flex items-center gap-1"><Mail className="w-3 h-3" />{vet.email}</p>}
                      </div>
                    )}

                    {manageVets && (
                      <div className="flex gap-1 pt-1 border-t border-border justify-end">
                        <button onClick={() => { setEditVet(vet); setShowVetModal(true) }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteTarget({ type: 'vet', id: vet.id, label: vet.name })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Modals ── */}
      <VaccinationFormModal open={showVaccModal} onClose={() => { setShowVaccModal(false); setEditVacc(null) }} animals={animals} vets={vets} editItem={editVacc}
        onSaved={item => {
          setVaccinations(prev => { const i = prev.findIndex(v => v.id === item.id); if (i >= 0) { const n = [...prev]; n[i] = item; return n } return [item, ...prev] })
          showToast(editVacc ? 'Vaccination updated' : 'Vaccination scheduled', 'success')
          setEditVacc(null)
        }} />

      <DiseaseFormModal open={showDiseaseModal} onClose={() => { setShowDiseaseModal(false); setEditDisease(null) }} animals={animals} editItem={editDisease}
        onSaved={item => {
          setDiseases(prev => { const i = prev.findIndex(d => d.id === item.id); if (i >= 0) { const n = [...prev]; n[i] = item; return n } return [item, ...prev] })
          showToast(editDisease ? 'Outbreak updated' : 'Outbreak logged', 'success')
          setEditDisease(null)
        }} />

      <TreatmentFormModal open={showTreatmentModal} onClose={() => { setShowTreatmentModal(false); setEditTreatment(null) }} animals={animals} vets={vets} editItem={editTreatment}
        onSaved={item => {
          setTreatments(prev => { const i = prev.findIndex(t => t.id === item.id); if (i >= 0) { const n = [...prev]; n[i] = item; return n } return [item, ...prev] })
          showToast(editTreatment ? 'Treatment updated' : 'Treatment created', 'success')
          setEditTreatment(null)
        }} />

      <VetFormModal open={showVetModal} onClose={() => { setShowVetModal(false); setEditVet(null) }} editItem={editVet}
        onSaved={item => {
          setVets(prev => { const i = prev.findIndex(v => v.id === item.id); if (i >= 0) { const n = [...prev]; n[i] = item; return n } return [item, ...prev] })
          showToast(editVet ? 'Vet profile updated' : 'Vet added', 'success')
          setEditVet(null)
        }} />

      <TreatmentDetailModal open={showTreatmentDetail} onClose={() => setShowTreatmentDetail(false)} treatment={detailTreatment}
        canWrite={write}
        onEdit={t => { setEditTreatment(t); setShowTreatmentModal(true) }}
        onDelete={t => setDeleteTarget({ type: 'treatment', id: t.id, label: `${t.condition} for ${t.animal.name}` })} />

      <ConfirmDeleteModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleteLoading}
        title={`Delete ${deleteTarget?.type === 'vacc' ? 'Vaccination' : deleteTarget?.type === 'disease' ? 'Outbreak' : deleteTarget?.type === 'treatment' ? 'Treatment' : 'Vet Profile'}`}
        desc={`"${deleteTarget?.label ?? ''}" will be permanently removed.`} />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}