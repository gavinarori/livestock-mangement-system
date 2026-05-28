'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dna, Heart, TrendingUp, AlertTriangle, Plus, Search,
  Calendar, Activity, GitBranch, Flame, CheckCircle2, XCircle,
  Clock, Zap, BarChart3, ArrowRight, Shield, X, Trash2, Edit2,
  RefreshCw, ChevronDown, Info, Loader2, FlaskConical,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
type UserRole = 'ADMIN' | 'MANAGER' | 'VETERINARIAN' | 'WORKER' | 'VIEWER'
type BreedingOutcome = 'PENDING' | 'SUCCESSFUL' | 'UNSUCCESSFUL'
type BreedingMethod = 'NATURAL' | 'ARTIFICIAL_INSEMINATION' | 'EMBRYO_TRANSFER'
type HeatCycleStatus = 'ACTIVE' | 'EXPECTED' | 'OVERDUE' | 'BRED'
type AnimalType = 'CATTLE' | 'SHEEP' | 'GOAT' | 'PIG' | 'POULTRY' | 'HORSE' | 'FISH' | 'AQUATIC' | 'OTHER'
type AnimalGender = 'MALE' | 'FEMALE' | 'OTHER'
type HealthStatus = 'HEALTHY' | 'SICK' | 'INJURED' | 'RECOVERING' | 'DECEASED'

interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  organizationId: string
}

interface AnimalOption {
  id: string
  name: string
  type: AnimalType
  breed: string
  gender: AnimalGender
  identificationId?: string
  healthStatus: HealthStatus
  parentMaleId?: string
  parentFemaleId?: string
  inbreedingCoeff?: number
  dateOfBirth?: string
}

interface HeatCycle {
  id: string
  animalId: string
  animal: { id: string; name: string; type: AnimalType; breed: string; gender: AnimalGender; identificationId?: string; healthStatus: HealthStatus }
  lastHeatDate: string
  nextExpectedDate: string
  cycleLengthDays: number
  status: HeatCycleStatus
  intensity?: string
  observedBy?: string
  notes?: string
  createdBy?: { id: string; name: string; role: UserRole }
  createdAt: string
}

interface BreedingRecord {
  id: string
  damId: string
  dam: { id: string; name: string; type: AnimalType; breed: string; gender: AnimalGender; identificationId?: string; healthStatus: HealthStatus }
  sireId: string
  sire: { id: string; name: string; type: AnimalType; breed: string; gender: AnimalGender; identificationId?: string; healthStatus: HealthStatus }
  breedingDate: string
  method: BreedingMethod
  outcome: BreedingOutcome
  offspringCount?: number
  expectedBirthDate?: string
  actualBirthDate?: string
  confirmedPregnancy?: boolean
  pregnancyCheckDate?: string
  veterinarian?: string
  location?: string
  notes?: string
  inbreedingCoeff?: number
  createdBy?: { id: string; name: string; role: UserRole }
  updatedBy?: { id: string; name: string; role: UserRole }
  createdAt: string
  updatedAt: string
}

// ── Permission helpers ─────────────────────────────────────────────────────────
const WRITE_ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'VETERINARIAN']
const canWrite = (role?: UserRole) => role ? WRITE_ROLES.includes(role) : false

// ── API helpers ────────────────────────────────────────────────────────────────
async function apiFetch(url: string, options?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

// ── Sub-components ─────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = 'primary' }: any) => (
  <div className="card-hover bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-${color}/10`}>
      <Icon className={`w-5 h-5 text-${color}`} />
    </div>
    <div>
      <div className="stat-number text-2xl font-bold text-foreground leading-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      {sub && <div className="text-xs text-primary font-medium mt-0.5">{sub}</div>}
    </div>
  </div>
)

const HeatStatusBadge = ({ status }: { status: HeatCycleStatus }) => {
  const map: Record<HeatCycleStatus, { cls: string; label: string }> = {
    ACTIVE: { cls: 'badge-healthy', label: '🔥 In heat' },
    EXPECTED: { cls: 'badge-recovering', label: '📅 Due soon' },
    OVERDUE: { cls: 'badge-sick', label: '⚠ Overdue' },
    BRED: { cls: 'badge-injured', label: '✓ Bred' },
  }
  const { cls, label } = map[status] ?? map.EXPECTED
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
}

const OutcomeBadge = ({ outcome }: { outcome: BreedingOutcome }) => {
  if (outcome === 'SUCCESSFUL') return <span className="badge-healthy px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Successful</span>
  if (outcome === 'UNSUCCESSFUL') return <span className="badge-sick px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"><XCircle className="w-3 h-3" />Unsuccessful</span>
  return <span className="badge-recovering px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"><Clock className="w-3 h-3" />Pending</span>
}

const MethodBadge = ({ method }: { method: BreedingMethod }) => {
  const map: Record<BreedingMethod, string> = {
    NATURAL: 'Natural',
    ARTIFICIAL_INSEMINATION: 'AI',
    EMBRYO_TRANSFER: 'ET',
  }
  return <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{map[method] ?? method}</span>
}

const InbreedingMeter = ({ coeff = 0 }: { coeff?: number }) => {
  const pct = Math.min(coeff * 100, 100)
  const color = pct < 5 ? 'bg-chart-1' : pct < 15 ? 'bg-chart-3' : 'bg-destructive'
  const label = pct < 5 ? 'Low' : pct < 15 ? 'Moderate' : 'High'
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-muted-foreground w-20 text-right">{coeff.toFixed(3)} <span className={pct >= 15 ? 'text-destructive font-medium' : ''}>{label}</span></span>
    </div>
  )
}

const LineageNode = ({ animalId, animals, depth = 0, maxDepth = 3 }: {
  animalId: string; animals: AnimalOption[]; depth?: number; maxDepth?: number
}) => {
  const animal = animals.find(a => a.id === animalId)
  if (!animal || depth >= maxDepth) return null
  const sire = animal.parentMaleId ? animals.find(a => a.id === animal.parentMaleId) : null
  const dam = animal.parentFemaleId ? animals.find(a => a.id === animal.parentFemaleId) : null
  return (
    <div className={`flex flex-col gap-1 ${depth > 0 ? 'pl-4 border-l border-border ml-2' : ''}`}>
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm ${depth === 0 ? 'bg-primary/10 text-primary font-semibold' : 'bg-muted/40'}`}>
        <span>{animal.gender === 'FEMALE' ? '♀' : animal.gender === 'MALE' ? '♂' : '◈'}</span>
        <span>{animal.name}</span>
        {animal.breed && <span className="text-xs text-muted-foreground">({animal.breed})</span>}
        {(animal.inbreedingCoeff ?? 0) > 0.15 && <AlertTriangle className="w-3 h-3 text-destructive ml-auto" />}
      </div>
      {(sire || dam) && (
        <div className="flex flex-col gap-1 mt-1">
          {sire && (
            <div>
              <div className="text-[10px] text-muted-foreground mb-0.5 ml-3 uppercase tracking-wider">Sire</div>
              <LineageNode animalId={sire.id} animals={animals} depth={depth + 1} maxDepth={maxDepth} />
            </div>
          )}
          {dam && (
            <div>
              <div className="text-[10px] text-muted-foreground mb-0.5 ml-3 uppercase tracking-wider">Dam</div>
              <LineageNode animalId={dam.id} animals={animals} depth={depth + 1} maxDepth={maxDepth} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Toast component ────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'warning'; onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  const cls = type === 'success' ? 'bg-chart-1/10 border-chart-1/30 text-chart-1' : type === 'error' ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-chart-3/10 border-chart-3/30 text-chart-3'
  const Icon = type === 'success' ? CheckCircle2 : type === 'error' ? XCircle : AlertTriangle
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg text-sm max-w-xs animate-fade-up ${cls}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
      <button onClick={onClose} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
    </div>
  )
}

// ── Modal backdrop ─────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children, maxWidth = 'max-w-lg' }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string
}) => {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
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

// ── Confirm delete modal ───────────────────────────────────────────────────────
const ConfirmDeleteModal = ({ open, onClose, onConfirm, title, description, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; description: string; loading: boolean
}) => (
  <Modal open={open} onClose={onClose} title="Confirm Delete" maxWidth="max-w-sm">
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
        <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
        <div>
          <div className="font-medium text-sm text-destructive">{title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-xl">Cancel</Button>
        <Button variant="destructive" onClick={onConfirm} disabled={loading} className="rounded-xl gap-2">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Confirm Delete
        </Button>
      </div>
    </div>
  </Modal>
)

// ── Breeding Record Form Modal ─────────────────────────────────────────────────
const BreedingFormModal = ({
  open, onClose, onSaved, females, males, editRecord,
}: {
  open: boolean
  onClose: () => void
  onSaved: (record: BreedingRecord) => void
  females: AnimalOption[]
  males: AnimalOption[]
  editRecord?: BreedingRecord | null
}) => {
  const isEdit = !!editRecord
  const [damId, setDamId] = useState('')
  const [sireId, setSireId] = useState('')
  const [breedingDate, setBreedingDate] = useState('')
  const [method, setMethod] = useState<BreedingMethod>('NATURAL')
  const [outcome, setOutcome] = useState<BreedingOutcome>('PENDING')
  const [offspringCount, setOffspringCount] = useState('')
  const [expectedBirthDate, setExpectedBirthDate] = useState('')
  const [actualBirthDate, setActualBirthDate] = useState('')
  const [confirmedPregnancy, setConfirmedPregnancy] = useState(false)
  const [pregnancyCheckDate, setPregnancyCheckDate] = useState('')
  const [veterinarian, setVeterinarian] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    if (editRecord) {
      setDamId(editRecord.damId)
      setSireId(editRecord.sireId)
      setBreedingDate(editRecord.breedingDate.split('T')[0])
      setMethod(editRecord.method)
      setOutcome(editRecord.outcome)
      setOffspringCount(editRecord.offspringCount?.toString() ?? '')
      setExpectedBirthDate(editRecord.expectedBirthDate?.split('T')[0] ?? '')
      setActualBirthDate(editRecord.actualBirthDate?.split('T')[0] ?? '')
      setConfirmedPregnancy(editRecord.confirmedPregnancy ?? false)
      setPregnancyCheckDate(editRecord.pregnancyCheckDate?.split('T')[0] ?? '')
      setVeterinarian(editRecord.veterinarian ?? '')
      setLocation(editRecord.location ?? '')
      setNotes(editRecord.notes ?? '')
    } else {
      setDamId(''); setSireId(''); setBreedingDate(new Date().toISOString().split('T')[0])
      setMethod('NATURAL'); setOutcome('PENDING'); setOffspringCount('')
      setExpectedBirthDate(''); setActualBirthDate(''); setConfirmedPregnancy(false)
      setPregnancyCheckDate(''); setVeterinarian(''); setLocation(''); setNotes('')
    }
    setError(''); setWarnings([])
  }, [open, editRecord])

  // Filter compatible males when a female is selected
  const compatibleMales = useMemo(() => {
    if (!damId) return males
    const dam = females.find(f => f.id === damId)
    if (!dam) return males
    return males.filter(m => m.type === dam.type && m.healthStatus !== 'DECEASED' && m.healthStatus !== 'SICK')
  }, [damId, females, males])

  const handleSubmit = async () => {
    setError(''); setWarnings([])
    if (!damId) { setError('Please select a dam (female animal).'); return }
    if (!sireId) { setError('Please select a sire (male animal).'); return }
    if (!breedingDate) { setError('Please enter a breeding date.'); return }
    if (damId === sireId) { setError('An animal cannot breed with itself.'); return }

    setLoading(true)
    try {
      const body: any = {
        damId, sireId, breedingDate, method, outcome,
        offspringCount: offspringCount ? parseInt(offspringCount) : null,
        expectedBirthDate: expectedBirthDate || null,
        actualBirthDate: actualBirthDate || null,
        confirmedPregnancy,
        pregnancyCheckDate: pregnancyCheckDate || null,
        veterinarian: veterinarian || null,
        location: location || null,
        notes: notes || null,
      }
      let data
      if (isEdit) {
        data = await apiFetch(`/api/breeding/records/${editRecord!.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        data = await apiFetch('/api/breeding/records', { method: 'POST', body: JSON.stringify(body) })
        if (data.warnings?.length) setWarnings(data.warnings)
      }
      onSaved(data.record)
      if (!data.warnings?.length) onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const selCls = 'w-full border border-border rounded-xl bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
  const inputCls = 'w-full border border-border rounded-xl bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
  const labelCls = 'text-xs font-medium text-muted-foreground uppercase tracking-wide'

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Breeding Record' : 'Log Breeding Event'} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-4">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}
        {warnings.map((w, i) => (
          <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-chart-3/10 border border-chart-3/20 text-sm text-chart-3">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{w}</span>
          </div>
        ))}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Dam selector */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Dam ♀ (Female) *</label>
            <select className={selCls} value={damId} onChange={e => { setDamId(e.target.value); setSireId('') }} disabled={isEdit}>
              <option value="">Select female animal…</option>
              {females.map(f => (
                <option key={f.id} value={f.id} disabled={f.healthStatus === 'DECEASED' || f.healthStatus === 'SICK'}>
                  {f.name} ({f.breed}) {f.healthStatus !== 'HEALTHY' ? `[${f.healthStatus}]` : ''}
                </option>
              ))}
            </select>
            {females.length === 0 && <p className="text-xs text-muted-foreground">No female animals found.</p>}
          </div>

          {/* Sire selector */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Sire ♂ (Male) *</label>
            <select className={selCls} value={sireId} onChange={e => setSireId(e.target.value)} disabled={isEdit}>
              <option value="">Select male animal…</option>
              {compatibleMales.map(m => (
                <option key={m.id} value={m.id} disabled={m.healthStatus === 'DECEASED' || m.healthStatus === 'SICK'}>
                  {m.name} ({m.breed}) {m.healthStatus !== 'HEALTHY' ? `[${m.healthStatus}]` : ''}
                </option>
              ))}
            </select>
            {damId && compatibleMales.length === 0 && (
              <p className="text-xs text-destructive">No compatible males found for this species.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Breeding Date *</label>
            <input type="date" className={inputCls} value={breedingDate} onChange={e => setBreedingDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Method</label>
            <select className={selCls} value={method} onChange={e => setMethod(e.target.value as BreedingMethod)}>
              <option value="NATURAL">Natural</option>
              <option value="ARTIFICIAL_INSEMINATION">Artificial Insemination</option>
              <option value="EMBRYO_TRANSFER">Embryo Transfer</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Outcome</label>
            <select className={selCls} value={outcome} onChange={e => setOutcome(e.target.value as BreedingOutcome)}>
              <option value="PENDING">Pending</option>
              <option value="SUCCESSFUL">Successful</option>
              <option value="UNSUCCESSFUL">Unsuccessful</option>
            </select>
          </div>

          {outcome === 'SUCCESSFUL' && (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Offspring Count</label>
              <input type="number" min={0} max={20} className={inputCls} value={offspringCount} onChange={e => setOffspringCount(e.target.value)} placeholder="e.g. 1" />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Expected Birth Date</label>
            <input type="date" className={inputCls} value={expectedBirthDate} onChange={e => setExpectedBirthDate(e.target.value)} />
          </div>

          {outcome === 'SUCCESSFUL' && (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Actual Birth Date</label>
              <input type="date" className={inputCls} value={actualBirthDate} onChange={e => setActualBirthDate(e.target.value)} />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Pregnancy Check Date</label>
            <input type="date" className={inputCls} value={pregnancyCheckDate} onChange={e => setPregnancyCheckDate(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Veterinarian</label>
            <input type="text" className={inputCls} value={veterinarian} onChange={e => setVeterinarian(e.target.value)} placeholder="Attending vet name" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Location</label>
            <input type="text" className={inputCls} value={location} onChange={e => setLocation(e.target.value)} placeholder="Pen, paddock, field…" />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <input type="checkbox" id="confirmedPreg" checked={confirmedPregnancy} onChange={e => setConfirmedPregnancy(e.target.checked)} className="rounded" />
            <label htmlFor="confirmedPreg" className="text-sm text-muted-foreground cursor-pointer">Pregnancy confirmed by scan/test</label>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Notes</label>
          <textarea className={`${inputCls} resize-none h-20`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any observations, complications, or follow-up notes…" />
        </div>

        <div className="flex gap-2 justify-end pt-1 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-xl">Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="rounded-xl gap-2">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {warnings.length > 0 ? 'Save Anyway' : isEdit ? 'Save Changes' : 'Log Breeding'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Heat Cycle Log Modal ───────────────────────────────────────────────────────
const HeatCycleModal = ({
  open, onClose, onSaved, females, prefillAnimalId,
}: {
  open: boolean; onClose: () => void; onSaved: (cycle: HeatCycle) => void
  females: AnimalOption[]; prefillAnimalId?: string
}) => {
  const [animalId, setAnimalId] = useState('')
  const [lastHeatDate, setLastHeatDate] = useState('')
  const [cycleLengthDays, setCycleLengthDays] = useState('21')
  const [status, setStatus] = useState<HeatCycleStatus>('ACTIVE')
  const [intensity, setIntensity] = useState('')
  const [observedBy, setObservedBy] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setAnimalId(prefillAnimalId ?? '')
    setLastHeatDate(new Date().toISOString().split('T')[0])
    setCycleLengthDays('21'); setStatus('ACTIVE')
    setIntensity(''); setObservedBy(''); setNotes(''); setError('')
  }, [open, prefillAnimalId])

  const handleSubmit = async () => {
    setError('')
    if (!animalId) { setError('Please select an animal.'); return }
    if (!lastHeatDate) { setError('Please enter the last heat date.'); return }
    const days = parseInt(cycleLengthDays)
    if (isNaN(days) || days < 14 || days > 365) { setError('Cycle length must be between 14 and 365 days.'); return }

    setLoading(true)
    try {
      const data = await apiFetch('/api/breeding/heat-cycles', {
        method: 'POST',
        body: JSON.stringify({ animalId, lastHeatDate, cycleLengthDays: days, status, intensity: intensity || null, observedBy: observedBy || null, notes: notes || null }),
      })
      onSaved(data.cycle)
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const selCls = 'w-full border border-border rounded-xl bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
  const inputCls = 'w-full border border-border rounded-xl bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
  const labelCls = 'text-xs font-medium text-muted-foreground uppercase tracking-wide'

  return (
    <Modal open={open} onClose={onClose} title="Log Heat Cycle">
      <div className="flex flex-col gap-4">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className={labelCls}>Female Animal *</label>
            <select className={selCls} value={animalId} onChange={e => setAnimalId(e.target.value)}>
              <option value="">Select female animal…</option>
              {females.map(f => (
                <option key={f.id} value={f.id} disabled={f.healthStatus === 'DECEASED'}>
                  {f.name} — {f.type} ({f.breed}) {f.identificationId ? `#${f.identificationId}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Last Heat Date *</label>
            <input type="date" className={inputCls} value={lastHeatDate} onChange={e => setLastHeatDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Cycle Length (days)</label>
            <input type="number" min={14} max={365} className={inputCls} value={cycleLengthDays} onChange={e => setCycleLengthDays(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Status</label>
            <select className={selCls} value={status} onChange={e => setStatus(e.target.value as HeatCycleStatus)}>
              <option value="ACTIVE">Active (In Heat)</option>
              <option value="EXPECTED">Expected</option>
              <option value="OVERDUE">Overdue</option>
              <option value="BRED">Bred</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Intensity</label>
            <select className={selCls} value={intensity} onChange={e => setIntensity(e.target.value)}>
              <option value="">Not assessed</option>
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="strong">Strong</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className={labelCls}>Observed By</label>
            <input type="text" className={inputCls} value={observedBy} onChange={e => setObservedBy(e.target.value)} placeholder="Staff name or ID" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Notes</label>
          <textarea className={`${inputCls} resize-none h-16`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Behavioral signs, physical observations…" />
        </div>

        <div className="flex gap-2 justify-end pt-1 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-xl">Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="rounded-xl gap-2">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Log Heat Cycle
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function BreedingPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [tab, setTab] = useState<'heat' | 'records' | 'lineage' | 'analytics'>('heat')
  const [heatCycles, setHeatCycles] = useState<HeatCycle[]>([])
  const [breedingRecords, setBreedingRecords] = useState<BreedingRecord[]>([])
  const [animals, setAnimals] = useState<AnimalOption[]>([])
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState<string>('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)

  // Modals
  const [showBreedingModal, setShowBreedingModal] = useState(false)
  const [showHeatModal, setShowHeatModal] = useState(false)
  const [editRecord, setEditRecord] = useState<BreedingRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'record' | 'heat'; id: string; label: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [heatPrefillAnimalId, setHeatPrefillAnimalId] = useState<string | undefined>()

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type })
  }, [])

  // ── Load session ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token || !userData) { router.push('/login'); return }
    try {
      setUser(JSON.parse(userData)) // Basic validation to ensure user data is present and parseable
    } catch {
      router.push('/login')
      return
    }
    loadAll(token)
  }, [router])

  // ── Load all data ─────────────────────────────────────────────────────────────
  const loadAll = useCallback(async (token?: string) => {
    setLoading(true)
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      const t = token ?? localStorage.getItem('token')
      if (t) headers['Authorization'] = `Bearer ${t}`

      const [hRes, bRes, aRes] = await Promise.all([
        fetch('/api/breeding/heat-cycles?limit=100', { headers }),
        fetch('/api/breeding/records?limit=100', { headers }),
        fetch('/api/animals?limit=500', { headers }),
      ])

      if (hRes.ok) { const d = await hRes.json(); setHeatCycles(d.cycles || []) }
      if (bRes.ok) { const d = await bRes.json(); setBreedingRecords(d.records || []) }
      if (aRes.ok) {
        const d = await aRes.json()
        const list: AnimalOption[] = (d.animals || [])
        setAnimals(list)
        if (list.length > 0 && !selectedAnimalId) setSelectedAnimalId(list[0].id)
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }, [selectedAnimalId, showToast])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAll()
    setRefreshing(false)
    showToast('Data refreshed', 'success')
  }

  // ── Derived data ──────────────────────────────────────────────────────────────
  const females = useMemo(() => animals.filter(a => a.gender === 'FEMALE' && a.healthStatus !== 'DECEASED'), [animals])
  const males = useMemo(() => animals.filter(a => a.gender === 'MALE' && a.healthStatus !== 'DECEASED'), [animals])

  const filteredHeat = useMemo(() =>
    heatCycles.filter(h => h.animal?.name?.toLowerCase().includes(search.toLowerCase())),
    [heatCycles, search])

  const filteredRecords = useMemo(() =>
    breedingRecords.filter(r => {
      const matchSearch =
        r.dam?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.sire?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.notes?.toLowerCase().includes(search.toLowerCase())
      const matchOutcome = !outcomeFilter || r.outcome === outcomeFilter
      return matchSearch && matchOutcome
    }),
    [breedingRecords, search, outcomeFilter])

  const filteredAnimals = useMemo(() =>
    animals.filter(a => a.name?.toLowerCase().includes(search.toLowerCase())),
    [animals, search])

  const analytics = useMemo(() => {
    const total = breedingRecords.length
    const successful = breedingRecords.filter(r => r.outcome === 'SUCCESSFUL').length
    const unsuccessful = breedingRecords.filter(r => r.outcome === 'UNSUCCESSFUL').length
    const pending = breedingRecords.filter(r => r.outcome === 'PENDING').length
    const successRate = total ? Math.round((successful / total) * 100) : 0
    const inHeat = heatCycles.filter(h => h.status === 'ACTIVE').length
    const overdue = heatCycles.filter(h => h.status === 'OVERDUE').length
    const highInbreeding = animals.filter(a => (a.inbreedingCoeff ?? 0) > 0.15).length
    const avgInbreeding = animals.length ? animals.reduce((s, a) => s + (a.inbreedingCoeff ?? 0), 0) / animals.length : 0
    return { total, successful, unsuccessful, pending, successRate, inHeat, overdue, highInbreeding, avgInbreeding }
  }, [breedingRecords, heatCycles, animals])

  // ── CRUD handlers ─────────────────────────────────────────────────────────────
  const handleBreedingSaved = useCallback((record: BreedingRecord) => {
    setBreedingRecords(prev => {
      const existing = prev.findIndex(r => r.id === record.id)
      if (existing >= 0) {
        const next = [...prev]; next[existing] = record; return next
      }
      return [record, ...prev]
    })
    showToast(editRecord ? 'Breeding record updated' : 'Breeding record created', 'success')
    setEditRecord(null)
  }, [editRecord, showToast])

  const handleHeatSaved = useCallback((cycle: HeatCycle) => {
    setHeatCycles(prev => [cycle, ...prev])
    showToast('Heat cycle logged', 'success')
  }, [showToast])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      if (deleteTarget.type === 'record') {
        await apiFetch(`/api/breeding/records/${deleteTarget.id}`, { method: 'DELETE' })
        setBreedingRecords(prev => prev.filter(r => r.id !== deleteTarget.id))
        showToast('Breeding record deleted', 'success')
      } else {
        await apiFetch(`/api/breeding/heat-cycles?id=${deleteTarget.id}`, { method: 'DELETE' })
        setHeatCycles(prev => prev.filter(h => h.id !== deleteTarget.id))
        showToast('Heat cycle deleted', 'success')
      }
      setDeleteTarget(null)
    } catch (e: any) {
      showToast(e.message || 'Delete failed', 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const canWriteRecords = canWrite(user?.role)

  const TABS = [
    { id: 'heat', label: 'Heat Cycles', icon: Flame },
    { id: 'records', label: 'Breeding Records', icon: Heart },
    { id: 'lineage', label: 'Lineage Tree', icon: GitBranch },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ] as const

  // ── Loading skeleton ──────────────────────────────────────────────────────────
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

        {/* ── Header ── */}
        <header className="animate-fade-up flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ animationFillMode: 'forwards' }}>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Dna className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-primary">Genetics</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Breeding & Genetics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Heat cycles, lineage, and reproductive analytics
              {user && <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">{user.role}</span>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-2 rounded-xl h-9 text-sm">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />Refresh
            </Button>
            {canWriteRecords && (
              <>
                <Button variant="outline" onClick={() => { setHeatPrefillAnimalId(undefined); setShowHeatModal(true) }} className="gap-2 rounded-xl h-9 text-sm">
                  <Flame className="w-3.5 h-3.5" />Log Heat
                </Button>
                <Button onClick={() => { setEditRecord(null); setShowBreedingModal(true) }} className="gap-2 rounded-xl shadow-sm shadow-primary/20 hover:shadow-md transition-shadow">
                  <Plus className="w-4 h-4" />Log Breeding
                </Button>
              </>
            )}
            {!canWriteRecords && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-xl">
                <Shield className="w-3.5 h-3.5" />View only — {user?.role}
              </div>
            )}
          </div>
        </header>

        {/* ── Stats ── */}
        <div className="animate-fade-up delay-75 grid grid-cols-2 md:grid-cols-4 gap-3" style={{ animationFillMode: 'forwards' }}>
          <StatCard icon={Flame} label="Currently in heat" value={analytics.inHeat} color="destructive" />
          <StatCard icon={TrendingUp} label="Breeding success rate" value={`${analytics.successRate}%`} sub={`${analytics.successful} / ${analytics.total} attempts`} />
          <StatCard icon={AlertTriangle} label="Overdue heat cycles" value={analytics.overdue} color="destructive" />
          <StatCard icon={Shield} label="High inbreeding risk" value={analytics.highInbreeding} sub={`Avg F = ${analytics.avgInbreeding.toFixed(3)}`} color="destructive" />
        </div>

        {/* ── Tabs ── */}
        <div className="animate-fade-up delay-100 flex gap-1 p-1 bg-muted rounded-2xl w-fit flex-wrap" style={{ animationFillMode: 'forwards' }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* ── Search + filter ── */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-9 rounded-xl bg-card h-9 text-sm" />
          </div>
          {tab === 'records' && (
            <select
              className="border border-border rounded-xl bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 h-9"
              value={outcomeFilter} onChange={e => setOutcomeFilter(e.target.value)}>
              <option value="">All outcomes</option>
              <option value="PENDING">Pending</option>
              <option value="SUCCESSFUL">Successful</option>
              <option value="UNSUCCESSFUL">Unsuccessful</option>
            </select>
          )}
        </div>

        {/* ── HEAT CYCLES TAB ── */}
        {tab === 'heat' && (
          <div className="animate-fade-up flex flex-col gap-3" style={{ animationFillMode: 'forwards' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Heat Cycle Tracker</h2>
              {canWriteRecords && (
                <Button variant="outline" size="sm" onClick={() => { setHeatPrefillAnimalId(undefined); setShowHeatModal(true) }}
                  className="gap-1.5 rounded-xl h-8 text-xs"><Plus className="w-3.5 h-3.5" />Log Heat</Button>
              )}
            </div>
            {filteredHeat.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Flame className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-medium">No heat cycles recorded</p>
                {canWriteRecords && <p className="text-xs mt-1">Click "Log Heat" to add the first record</p>}
              </div>
            ) : (
              <div className="rounded-2xl border border-border overflow-hidden bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Animal</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Heat</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next Expected</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cycle</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredHeat.map(h => {
                        const daysUntil = Math.round((new Date(h.nextExpectedDate).getTime() - Date.now()) / 86400000)
                        return (
                          <tr key={h.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium">{h.animal?.name ?? '—'}</div>
                              <div className="text-xs text-muted-foreground">{h.animal?.type} · {h.animal?.breed}</div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{new Date(h.lastHeatDate).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{new Date(h.nextExpectedDate).toLocaleDateString()}</span>
                                {daysUntil > 0 && daysUntil <= 7 && <span className="text-xs text-chart-3 font-medium">(in {daysUntil}d)</span>}
                                {daysUntil <= 0 && <span className="text-xs text-destructive font-medium">({Math.abs(daysUntil)}d ago)</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{h.cycleLengthDays}d</td>
                            <td className="px-4 py-3"><HeatStatusBadge status={h.status} /></td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1">
                                {canWriteRecords && h.status !== 'BRED' && (
                                  <Button variant="outline" size="sm"
                                    onClick={() => { setHeatPrefillAnimalId(h.animalId); setEditRecord(null); setShowBreedingModal(true) }}
                                    className="h-7 text-xs rounded-lg gap-1">
                                    <Heart className="w-3 h-3" />Breed
                                  </Button>
                                )}
                                {canWriteRecords && (
                                  <button
                                    onClick={() => setDeleteTarget({ type: 'heat', id: h.id, label: `Heat cycle for ${h.animal?.name ?? 'this animal'}` })}
                                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
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

        {/* ── BREEDING RECORDS TAB ── */}
        {tab === 'records' && (
          <div className="animate-fade-up flex flex-col gap-3" style={{ animationFillMode: 'forwards' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Breeding Records <span className="text-xs text-muted-foreground font-normal ml-1">({filteredRecords.length})</span></h2>
              {canWriteRecords && (
                <Button size="sm" onClick={() => { setEditRecord(null); setShowBreedingModal(true) }}
                  className="gap-1.5 rounded-xl h-8 text-xs"><Plus className="w-3.5 h-3.5" />New Record</Button>
              )}
            </div>
            {filteredRecords.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Heart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-medium">No breeding records found</p>
                {canWriteRecords && <p className="text-xs mt-1">Click "Log Breeding" or "New Record" to get started</p>}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredRecords.map(r => (
                  <div key={r.id} className="card-hover bg-card border border-border rounded-2xl p-4">
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold">{r.sire?.name ?? '—'}</span>
                          <span className="text-muted-foreground text-sm">♂ × ♀</span>
                          <span className="font-semibold">{r.dam?.name ?? '—'}</span>
                          <OutcomeBadge outcome={r.outcome} />
                          <MethodBadge method={r.method} />
                        </div>
                        <div className="text-sm text-muted-foreground flex flex-wrap gap-3 mt-1">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(r.breedingDate).toLocaleDateString()}</span>
                          {r.dam?.type && <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" />{r.dam.type}</span>}
                          {r.offspringCount !== undefined && r.offspringCount !== null && (
                            <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" />{r.offspringCount} offspring</span>
                          )}
                          {r.confirmedPregnancy && (
                            <span className="flex items-center gap-1 text-chart-1"><CheckCircle2 className="w-3.5 h-3.5" />Pregnancy confirmed</span>
                          )}
                          {r.veterinarian && <span className="flex items-center gap-1"><FlaskConical className="w-3.5 h-3.5" />{r.veterinarian}</span>}
                        </div>
                        {r.notes && <p className="text-xs text-muted-foreground mt-1.5 italic">"{r.notes}"</p>}
                        {r.createdBy && <p className="text-xs text-muted-foreground/60 mt-1">Recorded by {r.createdBy.name} · {new Date(r.createdAt).toLocaleDateString()}</p>}
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {r.inbreedingCoeff !== undefined && r.inbreedingCoeff !== null && (
                          <div className="w-48">
                            <div className="text-xs text-muted-foreground mb-1 font-medium">Inbreeding coefficient</div>
                            <InbreedingMeter coeff={r.inbreedingCoeff} />
                          </div>
                        )}
                        {canWriteRecords && (
                          <div className="flex gap-1 mt-1">
                            <button onClick={() => { setEditRecord(r); setShowBreedingModal(true) }}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'record', id: r.id, label: `Breeding: ${r.sire?.name ?? '?'} × ${r.dam?.name ?? '?'}` })}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── LINEAGE TAB ── */}
        {tab === 'lineage' && (
          <div className="animate-fade-up flex flex-col gap-4" style={{ animationFillMode: 'forwards' }}>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-64 flex-shrink-0">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Select Animal</h3>
                <div className="flex flex-col gap-1 max-h-80 overflow-y-auto rounded-xl border border-border bg-card p-2">
                  {filteredAnimals.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No animals found</p>}
                  {filteredAnimals.map(a => (
                    <button key={a.id} onClick={() => setSelectedAnimalId(a.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${selectedAnimalId === a.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                      <span>{a.gender === 'FEMALE' ? '♀' : a.gender === 'MALE' ? '♂' : '◈'}</span>
                      <div>
                        <div className="leading-tight">{a.name}</div>
                        {a.breed && <div className="text-xs text-muted-foreground">{a.breed}</div>}
                      </div>
                      {(a.inbreedingCoeff ?? 0) > 0.15 && <AlertTriangle className="w-3.5 h-3.5 text-destructive ml-auto flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Genetic Lineage</h3>
                  {selectedAnimalId && (() => {
                    const sel = animals.find(a => a.id === selectedAnimalId)
                    return sel && (sel.inbreedingCoeff ?? 0) > 0.1 ? (
                      <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-3 py-1 rounded-full border border-destructive/20">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Inbreeding risk (F={sel.inbreedingCoeff?.toFixed(3)})
                      </div>
                    ) : null
                  })()}
                </div>
                {selectedAnimalId ? (
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <LineageNode animalId={selectedAnimalId} animals={animals} depth={0} maxDepth={3} />
                    {(() => {
                      const sel = animals.find(a => a.id === selectedAnimalId)
                      return sel && !sel.parentMaleId && !sel.parentFemaleId ? (
                        <p className="text-xs text-muted-foreground mt-3 text-center">
                          No parent records found.{' '}
                          <Link href={`/animals/${sel.id}/edit`} className="text-primary hover:underline">Add lineage →</Link>
                        </p>
                      ) : null
                    })()}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 flex items-center justify-center h-48 text-muted-foreground text-sm">
                    <div className="text-center">
                      <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Select an animal to view its lineage tree
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {tab === 'analytics' && (
          <div className="animate-fade-up flex flex-col gap-5" style={{ animationFillMode: 'forwards' }}>
            <h2 className="font-semibold text-foreground">Breeding Analytics</h2>

            {analytics.total === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No breeding records yet — analytics will appear here</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Success rate donut */}
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <h3 className="font-semibold mb-4">Breeding Outcomes</h3>
                    <div className="flex items-center gap-4">
                      <div className="relative w-24 h-24 flex-shrink-0">
                        <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--muted)" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--primary)" strokeWidth="3"
                            strokeDasharray={`${analytics.successRate} ${100 - analytics.successRate}`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-xl font-bold stat-number">{analytics.successRate}%</div>
                      </div>
                      <div className="flex flex-col gap-2 text-sm">
                        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-chart-1" /><span className="text-muted-foreground">Successful:</span><strong>{analytics.successful}</strong></div>
                        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-destructive" /><span className="text-muted-foreground">Unsuccessful:</span><strong>{analytics.unsuccessful}</strong></div>
                        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-chart-3" /><span className="text-muted-foreground">Pending:</span><strong>{analytics.pending}</strong></div>
                      </div>
                    </div>
                  </div>

                  {/* Inbreeding risk overview */}
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <h3 className="font-semibold mb-4">Inbreeding Risk Overview</h3>
                    <div className="flex flex-col gap-3">
                      {[
                        { label: 'Low risk (F < 0.05)', count: animals.filter(a => (a.inbreedingCoeff ?? 0) < 0.05).length, color: 'bg-chart-1' },
                        { label: 'Moderate (0.05–0.15)', count: animals.filter(a => { const f = a.inbreedingCoeff ?? 0; return f >= 0.05 && f < 0.15 }).length, color: 'bg-chart-3' },
                        { label: 'High risk (F ≥ 0.15)', count: animals.filter(a => (a.inbreedingCoeff ?? 0) >= 0.15).length, color: 'bg-destructive' },
                      ].map(({ label, count, color }) => (
                        <div key={label} className="flex items-center gap-3 text-sm">
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
                          <span className="text-muted-foreground flex-1">{label}</span>
                          <strong>{count}</strong>
                          <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full ${color}`} style={{ width: animals.length ? `${(count / animals.length) * 100}%` : '0%' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Method breakdown */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="font-semibold mb-4">Breeding Methods</h3>
                  <div className="flex flex-wrap gap-4">
                    {(['NATURAL', 'ARTIFICIAL_INSEMINATION', 'EMBRYO_TRANSFER'] as BreedingMethod[]).map(m => {
                      const count = breedingRecords.filter(r => r.method === m).length
                      const pct = analytics.total ? Math.round((count / analytics.total) * 100) : 0
                      const labels: Record<BreedingMethod, string> = { NATURAL: 'Natural', ARTIFICIAL_INSEMINATION: 'Artificial Insemination', EMBRYO_TRANSFER: 'Embryo Transfer' }
                      return (
                        <div key={m} className="flex-1 min-w-32 bg-muted/40 rounded-xl p-3 text-center">
                          <div className="text-2xl font-bold stat-number">{count}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{labels[m]}</div>
                          <div className="text-xs text-primary font-medium mt-0.5">{pct}%</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* High inbreeding alerts */}
                {analytics.highInbreeding > 0 && (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                    <div className="flex items-center gap-2 mb-3 text-destructive font-semibold">
                      <AlertTriangle className="w-4 h-4" />Inbreeding Alerts ({analytics.highInbreeding})
                    </div>
                    <div className="flex flex-col gap-2">
                      {animals.filter(a => (a.inbreedingCoeff ?? 0) >= 0.15).map(a => (
                        <div key={a.id} className="flex items-center gap-3 text-sm bg-card rounded-xl px-3 py-2 border border-destructive/15">
                          <span className="font-medium">{a.name}</span>
                          <span className="text-muted-foreground">{a.breed}</span>
                          <div className="flex-1"><InbreedingMeter coeff={a.inbreedingCoeff} /></div>
                          <Link href={`/animals/${a.id}`} className="text-primary hover:underline text-xs flex items-center gap-0.5">
                            View <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <BreedingFormModal
        open={showBreedingModal}
        onClose={() => { setShowBreedingModal(false); setEditRecord(null) }}
        onSaved={handleBreedingSaved}
        females={females}
        males={males}
        editRecord={editRecord}
      />

      <HeatCycleModal
        open={showHeatModal}
        onClose={() => setShowHeatModal(false)}
        onSaved={handleHeatSaved}
        females={females}
        prefillAnimalId={heatPrefillAnimalId}
      />

      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title={`Delete ${deleteTarget?.type === 'record' ? 'Breeding Record' : 'Heat Cycle'}`}
        description={`"${deleteTarget?.label ?? ''}" will be permanently removed. This action cannot be undone.`}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </main>
  )
}