'use client'

import { useState, useEffect } from 'react'
import {
  Syringe, Bug, ClipboardList, Stethoscope, Bell, Plus, CheckCircle2,
  Clock, AlertTriangle, ChevronDown, ChevronRight, X, Calendar,
  User, Activity, Shield, Thermometer, Pill, FileText, Search
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
type Priority = 'low' | 'medium' | 'high' | 'critical'
type VaccStatus = 'upcoming' | 'overdue' | 'completed'
type TxStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled'

interface Vaccination {
  id: string; animal: string; type: string; vaccine: string
  dueDate: string; status: VaccStatus; vet: string
}
interface Disease {
  id: string; name: string; affected: number; trend: 'rising' | 'stable' | 'falling'
  severity: Priority; lastCase: string; notes: string
}
interface Treatment {
  id: string; animal: string; condition: string; vet: string
  startDate: string; status: TxStatus; priority: Priority; notes: string
  steps: { label: string; done: boolean }[]
}
interface Vet {
  id: string; name: string; speciality: string; available: boolean
  currentCases: number; phone: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const VACCINATIONS: Vaccination[] = [
  { id: 'v1', animal: 'Bessie (Cow #A-012)', type: 'Cattle', vaccine: 'FMD Trivalent', dueDate: '2026-05-14', status: 'upcoming', vet: 'Dr. Mwangi' },
  { id: 'v2', animal: 'Jumper (Goat #G-034)', type: 'Goat', vaccine: 'PPR Vaccine', dueDate: '2026-05-10', status: 'overdue', vet: 'Dr. Kamau' },
  { id: 'v3', animal: 'Rex (Bull #B-007)', type: 'Cattle', vaccine: 'BVD+IBR Combo', dueDate: '2026-04-28', status: 'completed', vet: 'Dr. Mwangi' },
  { id: 'v4', animal: 'Nala (Sheep #S-021)', type: 'Sheep', vaccine: 'Clostridial 8-in-1', dueDate: '2026-05-18', status: 'upcoming', vet: 'Dr. Otieno' },
  { id: 'v5', animal: 'Lulu (Pig #P-003)', type: 'Pig', vaccine: 'PRRS Live', dueDate: '2026-05-08', status: 'overdue', vet: 'Dr. Kamau' },
  { id: 'v6', animal: 'Herd Flock A (Poultry)', type: 'Poultry', vaccine: 'Newcastle Disease', dueDate: '2026-05-20', status: 'upcoming', vet: 'Dr. Otieno' },
]

const DISEASES: Disease[] = [
  { id: 'd1', name: 'Foot-and-Mouth Disease', affected: 3, trend: 'falling', severity: 'critical', lastCase: '2026-05-01', notes: 'Under quarantine. Two animals recovering.' },
  { id: 'd2', name: 'Bovine Respiratory Syndrome', affected: 5, trend: 'stable', severity: 'high', lastCase: '2026-05-06', notes: 'Antibiotic protocol in place.' },
  { id: 'd3', name: 'Bloat (Ruminants)', affected: 2, trend: 'rising', severity: 'medium', lastCase: '2026-05-09', notes: 'Feed composition change recommended.' },
  { id: 'd4', name: 'Mastitis', affected: 1, trend: 'stable', severity: 'low', lastCase: '2026-04-22', notes: 'Isolated and treated. Monitoring milk quality.' },
]

const TREATMENTS: Treatment[] = [
  {
    id: 't1', animal: 'Bessie (Cow #A-012)', condition: 'FMD Recovery', vet: 'Dr. Mwangi',
    startDate: '2026-05-01', status: 'in-progress', priority: 'critical',
    notes: 'Isolation pen B. Twice-daily wound dressing.',
    steps: [
      { label: 'Isolate animal', done: true },
      { label: 'Administer antiviral', done: true },
      { label: 'Daily wound dressing', done: false },
      { label: 'Nutrition support IV', done: false },
      { label: 'Release from quarantine', done: false },
    ]
  },
  {
    id: 't2', animal: 'Rex (Bull #B-007)', condition: 'BRS Treatment', vet: 'Dr. Kamau',
    startDate: '2026-05-06', status: 'in-progress', priority: 'high',
    notes: '5-day antibiotic course. Monitor temperature.',
    steps: [
      { label: 'Initial diagnosis', done: true },
      { label: 'Day 1-3 antibiotics', done: true },
      { label: 'Day 4-5 antibiotics', done: false },
      { label: 'Follow-up chest exam', done: false },
    ]
  },
  {
    id: 't3', animal: 'Lulu (Pig #P-003)', condition: 'PRRS Viral', vet: 'Dr. Otieno',
    startDate: '2026-05-08', status: 'pending', priority: 'medium',
    notes: 'Awaiting lab confirmation.',
    steps: [
      { label: 'Blood sample taken', done: true },
      { label: 'Lab results', done: false },
      { label: 'Treatment protocol', done: false },
    ]
  },
]

const VETS: Vet[] = [
  { id: 'vet1', name: 'Dr. James Mwangi', speciality: 'Large Animal / Ruminants', available: true, currentCases: 4, phone: '+254 712 345 678' },
  { id: 'vet2', name: 'Dr. Alice Kamau', speciality: 'Swine & Poultry', available: true, currentCases: 2, phone: '+254 733 456 789' },
  { id: 'vet3', name: 'Dr. Peter Otieno', speciality: 'General Livestock', available: false, currentCases: 6, phone: '+254 722 567 890' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<Priority, { label: string; bg: string; text: string; dot: string }> = {
  critical: { label: 'Critical', bg: 'bg-red-100 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  high:     { label: 'High',     bg: 'bg-orange-100 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  medium:   { label: 'Medium',   bg: 'bg-amber-100 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-400' },
  low:      { label: 'Low',      bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
}

const VACC_STATUS_CONFIG: Record<VaccStatus, { label: string; bg: string; text: string }> = {
  upcoming:  { label: 'Upcoming', bg: 'bg-blue-100 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400' },
  overdue:   { label: 'Overdue',  bg: 'bg-red-100 dark:bg-red-950/40',  text: 'text-red-700 dark:text-red-400' },
  completed: { label: 'Done',     bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400' },
}

const TX_STATUS_CONFIG: Record<TxStatus, { label: string; bg: string; text: string }> = {
  pending:     { label: 'Pending',     bg: 'bg-gray-100 dark:bg-gray-800/60',    text: 'text-gray-600 dark:text-gray-400' },
  'in-progress': { label: 'In Progress', bg: 'bg-blue-100 dark:bg-blue-950/40',  text: 'text-blue-700 dark:text-blue-400' },
  completed:   { label: 'Completed',   bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400' },
  cancelled:   { label: 'Cancelled',   bg: 'bg-red-100 dark:bg-red-950/40',      text: 'text-red-700 dark:text-red-400' },
}

function Badge({ config }: { config: { label: string; bg: string; text: string } }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

function TrendArrow({ trend }: { trend: 'rising' | 'stable' | 'falling' }) {
  if (trend === 'rising')  return <span className="text-red-500 text-xs font-bold" aria-label="Rising">↑ Rising</span>
  if (trend === 'falling') return <span className="text-emerald-600 text-xs font-bold" aria-label="Falling">↓ Falling</span>
  return <span className="text-amber-500 text-xs font-bold" aria-label="Stable">→ Stable</span>
}

// ─── Sub-sections ─────────────────────────────────────────────────────────────
function VaccinationPanel() {
  const [filter, setFilter] = useState<'all' | VaccStatus>('all')
  const filtered = filter === 'all' ? VACCINATIONS : VACCINATIONS.filter(v => v.status === filter)
  const overdue = VACCINATIONS.filter(v => v.status === 'overdue').length

  return (
    <section aria-labelledby="vacc-heading" className="animate-fade-up" style={{ animationFillMode: 'forwards' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 id="vacc-heading" className="font-semibold text-lg flex items-center gap-2">
            <Syringe className="w-5 h-5 text-primary" aria-hidden="true" />
            Vaccination Schedules
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Automated reminders · {VACCINATIONS.length} records</p>
        </div>
        {overdue > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400" role="alert">
            <Bell className="w-4 h-4 flex-shrink-0 animate-pulse" aria-hidden="true" />
            <strong>{overdue} overdue</strong> — immediate attention needed
          </div>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap" role="group" aria-label="Filter vaccinations">
        {(['all', 'upcoming', 'overdue', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all duration-200 ${
              filter === f
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {filtered.map((v, i) => (
          <article
            key={v.id}
            className="animate-fade-up card-hover flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-card border border-border rounded-xl"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}
            aria-label={`${v.animal} — ${v.vaccine}`}
          >
            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
              <div>
                <p className="text-sm font-semibold truncate">{v.animal}</p>
                <p className="text-xs text-muted-foreground">{v.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium">{v.vaccine}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" aria-hidden="true" />
                  <time dateTime={v.dueDate}>{new Date(v.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assigned vet</p>
                <p className="text-sm font-medium">{v.vet}</p>
              </div>
            </div>
            <Badge config={VACC_STATUS_CONFIG[v.status]} />
          </article>
        ))}
      </div>
    </section>
  )
}

function DiseasePanel() {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <section aria-labelledby="disease-heading" className="animate-fade-up delay-100" style={{ animationFillMode: 'forwards' }}>
      <div className="mb-4">
        <h2 id="disease-heading" className="font-semibold text-lg flex items-center gap-2">
          <Bug className="w-5 h-5 text-amber-600" aria-hidden="true" />
          Disease Tracking
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">Active cases · last 30 days</p>
      </div>

      <div className="space-y-2.5">
        {DISEASES.map((d, i) => {
          const cfg = PRIORITY_CONFIG[d.severity]
          const open = expanded === d.id
          return (
            <article
              key={d.id}
              className="animate-fade-up bg-card border border-border rounded-xl overflow-hidden card-hover"
              style={{ animationDelay: `${i * 70}ms`, animationFillMode: 'forwards' }}
            >
              <button
                onClick={() => setExpanded(open ? null : d.id)}
                aria-expanded={open}
                aria-controls={`disease-detail-${d.id}`}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
              >
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot} ${d.trend === 'rising' ? 'animate-pulse' : ''}`} aria-hidden="true" />
                <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <p className="text-sm font-semibold col-span-2 sm:col-span-1 truncate">{d.name}</p>
                  <p className="text-sm text-muted-foreground"><strong className="text-foreground">{d.affected}</strong> affected</p>
                  <TrendArrow trend={d.trend} />
                  <Badge config={{ label: cfg.label, bg: cfg.bg, text: cfg.text }} />
                </div>
                {open
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                  : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                }
              </button>
              {open && (
                <div id={`disease-detail-${d.id}`} className="px-4 pb-4 text-sm space-y-2 border-t border-border bg-muted/20">
                  <p className="pt-3 text-muted-foreground">{d.notes}</p>
                  <p className="text-xs text-muted-foreground">
                    Last case: <time dateTime={d.lastCase}>{new Date(d.lastCase).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
                  </p>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function TreatmentPanel() {
  const [selected, setSelected] = useState<Treatment | null>(null)

  return (
    <section aria-labelledby="treatment-heading" className="animate-fade-up delay-200" style={{ animationFillMode: 'forwards' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 id="treatment-heading" className="font-semibold text-lg flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" aria-hidden="true" />
            Treatment Workflows
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{TREATMENTS.length} active workflows</p>
        </div>
        <button className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline" aria-label="Add new treatment workflow">
          <Plus className="w-4 h-4" aria-hidden="true" /> New
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TREATMENTS.map((t, i) => {
          const cfg = PRIORITY_CONFIG[t.priority]
          const txCfg = TX_STATUS_CONFIG[t.status]
          const done = t.steps.filter(s => s.done).length
          const pct = Math.round((done / t.steps.length) * 100)

          return (
            <article
              key={t.id}
              className="animate-fade-up bg-card border border-border rounded-xl p-4 cursor-pointer card-hover flex flex-col gap-3"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
              onClick={() => setSelected(t)}
              role="button"
              tabIndex={0}
              aria-label={`View treatment for ${t.animal}`}
              onKeyDown={e => e.key === 'Enter' && setSelected(t)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{t.animal}</p>
                  <p className="text-xs text-muted-foreground">{t.condition}</p>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${cfg.dot}`} aria-hidden="true" />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Badge config={txCfg} />
                <Badge config={{ label: cfg.label, bg: cfg.bg, text: cfg.text }} />
              </div>

              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{done}/{t.steps.length} steps</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Treatment progress: ${pct}%`}>
                  <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="w-3 h-3" aria-hidden="true" />
                {t.vet}
              </div>
            </article>
          )
        })}
      </div>

      {/* Treatment Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tx-modal-title"
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}
        >
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-scale-in space-y-5" style={{ animationFillMode: 'forwards' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="tx-modal-title" className="font-semibold text-lg">{selected.condition}</h3>
                <p className="text-sm text-muted-foreground">{selected.animal}</p>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close treatment detail" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-muted/40 rounded-xl">
                <p className="text-xs text-muted-foreground">Assigned Vet</p>
                <p className="font-medium mt-0.5">{selected.vet}</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl">
                <p className="text-xs text-muted-foreground">Start Date</p>
                <time dateTime={selected.startDate} className="font-medium mt-0.5 block">
                  {new Date(selected.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                </time>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">Treatment Steps</p>
              <ol className="space-y-2" aria-label="Treatment workflow steps">
                {selected.steps.map((step, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? 'bg-emerald-500' : 'bg-muted border-2 border-border'}`} aria-hidden="true">
                      {step.done && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </span>
                    <span className={`text-sm ${step.done ? 'line-through text-muted-foreground' : 'text-foreground'}`} aria-label={`Step ${i + 1}: ${step.label} — ${step.done ? 'completed' : 'pending'}`}>
                      {step.label}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {selected.notes && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Clinical Notes</p>
                <p className="text-sm text-amber-900 dark:text-amber-300">{selected.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function VetPanel() {
  return (
    <section aria-labelledby="vet-heading" className="animate-fade-up delay-300" style={{ animationFillMode: 'forwards' }}>
      <div className="mb-4">
        <h2 id="vet-heading" className="font-semibold text-lg flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-purple-600" aria-hidden="true" />
          Vet Assignment System
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">Veterinarian availability and caseloads</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {VETS.map((vet, i) => (
          <article
            key={vet.id}
            className="animate-fade-up card-hover bg-card border border-border rounded-xl p-4 flex flex-col gap-3"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
            aria-label={`${vet.name} — ${vet.available ? 'Available' : 'Unavailable'}`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary" aria-hidden="true">
                  {vet.name.split(' ').filter(w => w !== 'Dr.').map(w => w[0]).join('').slice(0, 2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{vet.name}</p>
                <p className="text-xs text-muted-foreground">{vet.speciality}</p>
              </div>
              <span
                className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${vet.available ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'}`}
                aria-label={vet.available ? 'Available' : 'Unavailable'}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${vet.available ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} aria-hidden="true" />
                {vet.available ? 'Available' : 'Busy'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-muted/40 rounded-lg text-center">
                <p className="text-muted-foreground">Active Cases</p>
                <p className="font-bold text-lg stat-number">{vet.currentCases}</p>
              </div>
              <div className="p-2.5 bg-muted/40 rounded-lg text-center">
                <p className="text-muted-foreground">Load</p>
                <p className={`font-bold text-lg stat-number ${vet.currentCases > 4 ? 'text-orange-600' : 'text-emerald-600'}`}>
                  {vet.currentCases > 4 ? 'High' : 'Normal'}
                </p>
              </div>
            </div>

            <button
              className="w-full text-xs font-semibold py-2 rounded-lg border border-border hover:bg-primary hover:text-primary-foreground transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!vet.available}
              aria-label={`Assign case to ${vet.name}`}
            >
              {vet.available ? 'Assign Case' : 'Currently Unavailable'}
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HealthIntelligencePage() {
  const [activeTab, setActiveTab] = useState<'vaccinations' | 'diseases' | 'treatments' | 'vets'>('vaccinations')

  const TABS = [
    { id: 'vaccinations', label: 'Vaccinations', icon: Syringe, count: VACCINATIONS.filter(v => v.status === 'overdue').length, countLabel: 'overdue' },
    { id: 'diseases',     label: 'Diseases',     icon: Bug,      count: DISEASES.filter(d => d.severity === 'critical' || d.severity === 'high').length, countLabel: 'active' },
    { id: 'treatments',   label: 'Treatments',   icon: ClipboardList, count: TREATMENTS.filter(t => t.status === 'in-progress').length, countLabel: 'active' },
    { id: 'vets',         label: 'Vets',          icon: Stethoscope, count: VETS.filter(v => v.available).length, countLabel: 'available' },
  ] as const

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <header className="animate-fade-up" style={{ animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-primary" aria-hidden="true" />
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">Health Intelligence</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Health Intelligence System</h1>
        <p className="text-muted-foreground mt-1">Vaccination schedules · Disease tracking · Treatment workflows · Vet management</p>
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up delay-75" style={{ animationFillMode: 'forwards' }}>
        {[
          { label: 'Overdue Vaccines', value: VACCINATIONS.filter(v => v.status === 'overdue').length, icon: Syringe, color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
          { label: 'Active Diseases', value: DISEASES.length, icon: Thermometer, color: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400' },
          { label: 'Treatments Running', value: TREATMENTS.filter(t => t.status === 'in-progress').length, icon: Pill, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
          { label: 'Vets Available', value: VETS.filter(v => v.available).length, icon: Stethoscope, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <div key={label} className="animate-fade-up bg-card border border-border rounded-2xl p-4 flex items-center gap-3 card-hover shadow-sm" style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }} aria-label={`${label}: ${value}`}>
            <span className={`p-2.5 rounded-xl ${color} flex-shrink-0`} aria-hidden="true"><Icon className="w-4 h-4" /></span>
            <div>
              <p className="stat-number text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab nav */}
      <nav aria-label="Health system sections" className="animate-fade-up delay-100" style={{ animationFillMode: 'forwards' }}>
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-full overflow-x-auto" role="tablist">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                aria-controls={`panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 flex-1 justify-center ${active ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-primary text-primary-foreground' : 'bg-border text-muted-foreground'}`} aria-label={`${tab.count} ${tab.countLabel}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Tab panels */}
      <div role="tabpanel" id={`panel-${activeTab}`} aria-label={activeTab}>
        {activeTab === 'vaccinations' && <VaccinationPanel />}
        {activeTab === 'diseases'     && <DiseasePanel />}
        {activeTab === 'treatments'   && <TreatmentPanel />}
        {activeTab === 'vets'         && <VetPanel />}
      </div>

      <div className="h-4" aria-hidden="true" />
    </div>
  )
}