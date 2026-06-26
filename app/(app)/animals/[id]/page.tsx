'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  ArrowLeft,
  Edit,
  Share2,
  Check,
  Copy,
  Weight,
  Calendar,
  Tag,
  Palette,
  FileText,
  Info,
  ExternalLink,
  HeartPulse,
  Syringe,
  Stethoscope,
  ClipboardList,
  Clock,
  AlertTriangle,
  Pill,
  Shield,
  Beef,
  Droplets,
  Wrench,
  Egg,
  Circle,
} from 'lucide-react'

/* ─────────────────────────────────────────────
   THEME-ALIGNED METADATA
───────────────────────────────────────────── */

const ANIMAL_META: Record<string, { emoji: string; bg: string; accent: string }> = {
  cattle: { emoji: '🐄', bg: 'bg-card', accent: 'text-primary bg-secondary border-border' },
  sheep: { emoji: '🐑', bg: 'bg-card', accent: 'text-primary bg-muted border-border' },
  goat: { emoji: '🐐', bg: 'bg-card', accent: 'text-primary bg-accent border-border' },
  pig: { emoji: '🐷', bg: 'bg-card', accent: 'text-primary bg-muted border-border' },
  poultry: { emoji: '🐔', bg: 'bg-card', accent: 'text-primary bg-secondary border-border' },
  horse: { emoji: '🐴', bg: 'bg-card', accent: 'text-primary bg-accent border-border' },
  fish: { emoji: '🐟', bg: 'bg-card', accent: 'text-primary bg-muted border-border' },
  aquatic: { emoji: '🦞', bg: 'bg-card', accent: 'text-primary bg-secondary border-border' },
  other: { emoji: '🐾', bg: 'bg-card', accent: 'text-primary bg-muted border-border' },
}

const HEALTH_META: Record<string, { label: string; dot: string; badge: string }> = {
  healthy: {
    label: 'Healthy',
    dot: 'bg-primary',
    badge: 'text-primary bg-secondary border-border',
  },
  sick: {
    label: 'Sick',
    dot: 'bg-destructive',
    badge: 'text-destructive bg-muted border-border',
  },
  injured: {
    label: 'Injured',
    dot: 'bg-accent',
    badge: 'text-accent-foreground bg-accent border-border',
  },
  recovering: {
    label: 'Recovering',
    dot: 'bg-primary',
    badge: 'text-primary bg-secondary border-border',
  },
  deceased: {
    label: 'Deceased',
    dot: 'bg-muted-foreground',
    badge: 'text-muted-foreground bg-muted border-border',
  },
}

const TASK_CATEGORY_ICONS: Record<string, React.ElementType> = {
  FEEDING: Beef, CLEANING: Droplets, MEDICATION: Stethoscope,
  VACCINATION: Syringe, INSPECTION: ClipboardList,
  BREEDING: Egg, EQUIPMENT: Wrench, OTHER: Circle,
}

const PRIORITY_BADGE: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300',
  CRITICAL: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300',
  LOW: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300',
  EXPECTED: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300',
  OVERDUE: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
  UPCOMING: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300',
  PENDING: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300',
  IN_PROGRESS: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300',
}

function fmtDate(d?: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

/* ─────────────────────────────────────────────
   DETAIL ITEM
───────────────────────────────────────────── */

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | number | undefined | null
}) {
  if (!value && value !== 0) return null

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border shadow-sm hover:shadow-md transition-all">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="w-4 h-4" />
      </span>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground break-words">
          {value}
        </p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   OVERVIEW SECTION (shared shell for the 4 lists)
───────────────────────────────────────────── */

function OverviewSection({
  icon: Icon,
  title,
  count,
  emptyLabel,
  children,
}: {
  icon: React.ElementType
  title: string
  count: number
  emptyLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="w-3.5 h-3.5" />
        </span>
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        {count > 0 && (
          <span className="ml-auto text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      {count === 0 ? (
        <p className="text-xs text-muted-foreground py-2">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */

export default function AnimalDetailPage() {
  const router = useRouter()
  const params = useParams()

  const [animal, setAnimal] = useState<any>(null)
  const [share, setShare] = useState<any>(null)
  const [overview, setOverview] = useState<{
    heatCycles: any[]; vaccinationSchedules: any[]; treatments: any[]; tasks: any[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return router.push('/login')
    fetchData(params.id as string, token)
  }, [params.id])

  const fetchData = async (id: string, token: string) => {
    try {
      setLoading(true)

      const [animalRes, shareRes, overviewRes] = await Promise.all([
        fetch(`/api/animals/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/animals/${id}/share`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/animals/${id}/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (!animalRes.ok) {
        if (animalRes.status === 401) return router.push('/login')
        if (animalRes.status === 404) return setError('Animal not found')
        throw new Error('Failed to fetch animal')
      }

      const animalData = await animalRes.json()
      setAnimal(animalData.animal)

      if (shareRes.ok) {
        const shareData = await shareRes.json()
        setShare(shareData.share)
      }

      if (overviewRes.ok) {
        const overviewData = await overviewRes.json()
        setOverview(overviewData)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load animal')
    } finally {
      setLoading(false)
    }
  }



  const copyShareLink = () => {
    if (!share?.shareCode) return
    navigator.clipboard.writeText(
      `${window.location.origin}/share/${share.shareCode}`
    )
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  /* ───────────────── LOADING ───────────────── */

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="w-8 h-8 text-muted-foreground" />
      </main>
    )
  }

  /* ───────────────── ERROR ───────────────── */

  if (error || !animal) {
    return (
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/animals">
            <Button variant="ghost" size="sm" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>

          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-destructive font-medium">
              {error || 'Animal not found'}
            </p>
          </div>
        </div>
      </main>
    )
  }

  /* ───────────────── DATA ───────────────── */

  const type = (animal.type ?? 'other').toLowerCase()
  const healthStatus = (animal.healthStatus ?? 'healthy').toLowerCase()

  const meta = ANIMAL_META[type] ?? ANIMAL_META.other
  const health = HEALTH_META[healthStatus] ?? HEALTH_META.healthy

  const age = animal.dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(animal.dateOfBirth).getTime()) /
          (1000 * 60 * 60 * 24 * 365)
      ) + ' yrs'
    : null

  const heatCycles = overview?.heatCycles ?? []
  const vaccinationSchedules = overview?.vaccinationSchedules ?? []
  const treatments = overview?.treatments ?? []
  const tasks = overview?.tasks ?? []

  /* ───────────────── UI ───────────────── */

  return (
    <main className="min-h-screen bg-background">
      {/* TOP BAR */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center justify-between p-4">
          <Link href="/animals">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Animals
            </Button>
          </Link>

          <div className="flex gap-2">

  <Link href={`/animals/${animal.id ?? animal._id}/shares`}>
    <Button variant="outline" size="sm">
      <ExternalLink className="w-4 h-4 mr-2" />
      Shares
    </Button>
  </Link>

  <Link href={`/animals/${animal.id ?? animal._id}/edit`}>
    <Button size="sm">
      <Edit className="w-4 h-4" />
    </Button>
  </Link>
</div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-3xl mx-auto p-6 space-y-6">

        {/* HERO */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex gap-4">
            <div className="text-4xl">{meta.emoji}</div>

            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {animal.name}
              </h1>

              <div className="flex gap-2 mt-2 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-xs border ${meta.accent}`}>
                  {type}
                </span>

                <span className={`px-3 py-1 rounded-full text-xs border ${health.badge}`}>
                  {health.label}
                </span>

                {animal.gender && (
                  <span className="px-3 py-1 rounded-full text-xs bg-muted border border-border text-foreground">
                    {animal.gender}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground flex gap-4">
            {animal.breed && <span>{animal.breed}</span>}
            {age && <span>{age}</span>}
            {animal.weight && <span>{animal.weight} kg</span>}
          </div>
        </div>

        {/* DETAILS */}
        <div className="grid sm:grid-cols-2 gap-3">
          <DetailItem icon={Tag} label="ID" value={animal.identificationId} />
          <DetailItem icon={Calendar} label="DOB" value={animal.dateOfBirth} />
          <DetailItem icon={Weight} label="Weight" value={animal.weight} />
          <DetailItem icon={Palette} label="Color" value={animal.color} />
          <DetailItem icon={Info} label="Location" value={animal.location} />
        </div>

        {/* NOTES */}
        {animal.notes && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex gap-3">
              <FileText className="w-4 h-4 text-muted-foreground mt-1" />
              <p className="text-sm text-foreground">{animal.notes}</p>
            </div>
          </div>
        )}

        {/* ───────── CURRENT ACTIVITY OVERVIEW ───────── */}
        <div>
          <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
            Current Activity
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">

            {/* Active Treatments */}
            <OverviewSection
              icon={Stethoscope}
              title="Active Treatments"
              count={treatments.length}
              emptyLabel="No active treatments."
            >
              {treatments.map((t: any) => (
                <li key={t.id} className="p-3 bg-muted/40 rounded-xl border border-border">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${PRIORITY_BADGE[t.priority] || PRIORITY_BADGE.MEDIUM}`}>
                      {t.priority}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[t.status] || 'bg-muted text-muted-foreground'}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{t.condition}</p>
                  {(t.medication || t.dosage) && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Pill className="w-3 h-3" />
                      {[t.medication, t.dosage].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {t.isolationRequired && (
                    <p className="text-xs text-orange-600 mt-0.5 flex items-center gap-1">
                      <Shield className="w-3 h-3" />Isolation: {t.isolationLocation || 'required'}
                    </p>
                  )}
                  {t.followUpDate && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />Follow-up {fmtDate(t.followUpDate)}
                    </p>
                  )}
                </li>
              ))}
            </OverviewSection>

            {/* Upcoming / Overdue Vaccinations */}
            <OverviewSection
              icon={Syringe}
              title="Vaccinations"
              count={vaccinationSchedules.length}
              emptyLabel="No upcoming or overdue vaccinations."
            >
              {vaccinationSchedules.map((v: any) => (
                <li key={v.id} className="p-3 bg-muted/40 rounded-xl border border-border">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[v.status] || 'bg-muted text-muted-foreground'}`}>
                      {v.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{v.vaccineName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{v.vaccineType}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />Due {fmtDate(v.dueDate)}
                  </p>
                </li>
              ))}
            </OverviewSection>

            {/* Heat Cycles */}
            <OverviewSection
              icon={HeartPulse}
              title="Heat Cycles"
              count={heatCycles.length}
              emptyLabel="No active or expected heat cycles."
            >
              {heatCycles.map((h: any) => (
                <li key={h.id} className="p-3 bg-muted/40 rounded-xl border border-border">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[h.status] || 'bg-muted text-muted-foreground'}`}>
                      {h.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />Last heat {fmtDate(h.lastHeatDate)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />Next expected {fmtDate(h.nextExpectedDate)}
                  </p>
                  {h.intensity && (
                    <p className="text-xs text-muted-foreground mt-0.5">Intensity: {h.intensity}</p>
                  )}
                </li>
              ))}
            </OverviewSection>

            {/* Outstanding Tasks */}
            <OverviewSection
              icon={ClipboardList}
              title="Outstanding Tasks"
              count={tasks.length}
              emptyLabel="No outstanding tasks for this animal."
            >
              {tasks.map((task: any) => {
                const TaskIcon = TASK_CATEGORY_ICONS[task.category] || Circle
                return (
                  <li key={task.id} className="p-3 bg-muted/40 rounded-xl border border-border">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.MEDIUM}`}>
                        {task.priority}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[task.status] || (task.status === 'OVERDUE' ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300' : 'bg-muted text-muted-foreground')}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <TaskIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      {task.title}
                    </p>
                    {task.assignedTo && (
                      <p className="text-xs text-muted-foreground mt-0.5">→ {task.assignedTo.name}</p>
                    )}
                    {task.dueDate && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />Due {fmtDate(task.dueDate)}
                      </p>
                    )}
                  </li>
                )
              })}
            </OverviewSection>

          </div>
        </div>
      </div>
    </main>
  )
}