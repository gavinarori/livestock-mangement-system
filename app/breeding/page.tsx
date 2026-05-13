'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dna, Heart, TrendingUp, AlertTriangle, Plus, Search, ChevronRight,
  Calendar, User, Activity, GitBranch, Flame, CheckCircle2, XCircle,
  Clock, Zap, BarChart3, ArrowRight, Info, Shield, X
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
interface HeatCycle {
  _id: string
  animalId: string
  animalName: string
  lastHeatDate: string
  nextExpectedDate: string
  cycleLengthDays: number
  status: 'active' | 'expected' | 'overdue' | 'bred'
}

interface BreedingRecord {
  _id: string
  damId: string; damName: string
  sireId: string; sireName: string
  breedingDate: string
  outcome: 'pending' | 'successful' | 'unsuccessful'
  offspringCount?: number
  notes?: string
  inbreedingCoeff?: number
}

interface AnimalNode {
  _id: string; name: string; type: string; breed?: string; gender?: string
  sireId?: string; damId?: string
  sireName?: string; damName?: string
  inbreedingCoeff?: number
}

// ── Mock Heat Cycles ───────────────────────────────────────────
const mockHeatCycles: HeatCycle[] = [
  {
    _id: 'heat-001',
    animalId: 'cow-001',
    animalName: 'Bella',
    lastHeatDate: '2026-04-20',
    nextExpectedDate: '2026-05-11',
    cycleLengthDays: 21,
    status: 'active',
  },
  {
    _id: 'heat-002',
    animalId: 'cow-002',
    animalName: 'Daisy',
    lastHeatDate: '2026-04-25',
    nextExpectedDate: '2026-05-16',
    cycleLengthDays: 21,
    status: 'expected',
  },
  {
    _id: 'heat-003',
    animalId: 'goat-001',
    animalName: 'Luna',
    lastHeatDate: '2026-03-28',
    nextExpectedDate: '2026-04-18',
    cycleLengthDays: 21,
    status: 'overdue',
  },
  {
    _id: 'heat-004',
    animalId: 'cow-003',
    animalName: 'Rosie',
    lastHeatDate: '2026-04-01',
    nextExpectedDate: '2026-04-22',
    cycleLengthDays: 21,
    status: 'bred',
  },
  {
    _id: 'heat-005',
    animalId: 'sheep-001',
    animalName: 'Snow',
    lastHeatDate: '2026-04-30',
    nextExpectedDate: '2026-05-21',
    cycleLengthDays: 21,
    status: 'expected',
  },
  {
    _id: 'heat-006',
    animalId: 'cow-004',
    animalName: 'Molly',
    lastHeatDate: '2026-04-19',
    nextExpectedDate: '2026-05-10',
    cycleLengthDays: 21,
    status: 'active',
  },
]

// ── Mock Breeding Records ─────────────────────────────────────
const mockBreedingRecords: BreedingRecord[] = [
  {
    _id: 'breed-001',
    damId: 'cow-001',
    damName: 'Bella',
    sireId: 'bull-001',
    sireName: 'Titan',
    breedingDate: '2026-03-15',
    outcome: 'successful',
    offspringCount: 1,
    notes: 'Healthy calf delivered with no complications.',
    inbreedingCoeff: 0.021,
  },
  {
    _id: 'breed-002',
    damId: 'cow-002',
    damName: 'Daisy',
    sireId: 'bull-002',
    sireName: 'Maximus',
    breedingDate: '2026-04-02',
    outcome: 'pending',
    notes: 'Pregnancy confirmation scheduled next week.',
    inbreedingCoeff: 0.067,
  },
  {
    _id: 'breed-003',
    damId: 'goat-001',
    damName: 'Luna',
    sireId: 'buck-001',
    sireName: 'Rocky',
    breedingDate: '2026-02-20',
    outcome: 'unsuccessful',
    notes: 'No conception detected after scan.',
    inbreedingCoeff: 0.143,
  },
  {
    _id: 'breed-004',
    damId: 'cow-003',
    damName: 'Rosie',
    sireId: 'bull-003',
    sireName: 'Apollo',
    breedingDate: '2026-01-28',
    outcome: 'successful',
    offspringCount: 2,
    notes: 'Twin calves delivered successfully.',
    inbreedingCoeff: 0.031,
  },
  {
    _id: 'breed-005',
    damId: 'sheep-001',
    damName: 'Snow',
    sireId: 'ram-001',
    sireName: 'Blizzard',
    breedingDate: '2026-04-10',
    outcome: 'pending',
    inbreedingCoeff: 0.182,
  },
  {
    _id: 'breed-006',
    damId: 'cow-004',
    damName: 'Molly',
    sireId: 'bull-002',
    sireName: 'Maximus',
    breedingDate: '2026-03-02',
    outcome: 'successful',
    offspringCount: 1,
    notes: 'Strong calf with above-average weight.',
    inbreedingCoeff: 0.044,
  },
]

// ── Mock Animal Lineage Data ──────────────────────────────────
const mockAnimals: AnimalNode[] = [
  {
    _id: 'cow-001',
    name: 'Bella',
    type: 'cow',
    breed: 'Friesian',
    gender: 'female',
    sireId: 'bull-001',
    damId: 'cow-010',
    sireName: 'Titan',
    damName: 'Grace',
    inbreedingCoeff: 0.021,
  },
  {
    _id: 'cow-002',
    name: 'Daisy',
    type: 'cow',
    breed: 'Jersey',
    gender: 'female',
    sireId: 'bull-002',
    damId: 'cow-011',
    sireName: 'Maximus',
    damName: 'Ruby',
    inbreedingCoeff: 0.067,
  },
  {
    _id: 'cow-003',
    name: 'Rosie',
    type: 'cow',
    breed: 'Ayrshire',
    gender: 'female',
    sireId: 'bull-003',
    damId: 'cow-012',
    sireName: 'Apollo',
    damName: 'Misty',
    inbreedingCoeff: 0.031,
  },
  {
    _id: 'cow-004',
    name: 'Molly',
    type: 'cow',
    breed: 'Friesian',
    gender: 'female',
    sireId: 'bull-002',
    damId: 'cow-010',
    sireName: 'Maximus',
    damName: 'Grace',
    inbreedingCoeff: 0.044,
  },
  {
    _id: 'goat-001',
    name: 'Luna',
    type: 'goat',
    breed: 'Boer',
    gender: 'female',
    sireId: 'buck-001',
    damId: 'goat-010',
    sireName: 'Rocky',
    damName: 'Pearl',
    inbreedingCoeff: 0.143,
  },
  {
    _id: 'sheep-001',
    name: 'Snow',
    type: 'sheep',
    breed: 'Merino',
    gender: 'female',
    sireId: 'ram-001',
    damId: 'sheep-010',
    sireName: 'Blizzard',
    damName: 'Wooly',
    inbreedingCoeff: 0.182,
  },

  // ── Parents ──
  {
    _id: 'bull-001',
    name: 'Titan',
    type: 'bull',
    breed: 'Friesian',
    gender: 'male',
    inbreedingCoeff: 0.011,
  },
  {
    _id: 'bull-002',
    name: 'Maximus',
    type: 'bull',
    breed: 'Jersey',
    gender: 'male',
    inbreedingCoeff: 0.025,
  },
  {
    _id: 'bull-003',
    name: 'Apollo',
    type: 'bull',
    breed: 'Ayrshire',
    gender: 'male',
    inbreedingCoeff: 0.019,
  },
  {
    _id: 'buck-001',
    name: 'Rocky',
    type: 'buck',
    breed: 'Boer',
    gender: 'male',
    inbreedingCoeff: 0.088,
  },
  {
    _id: 'ram-001',
    name: 'Blizzard',
    type: 'ram',
    breed: 'Merino',
    gender: 'male',
    inbreedingCoeff: 0.151,
  },
  {
    _id: 'cow-010',
    name: 'Grace',
    type: 'cow',
    breed: 'Friesian',
    gender: 'female',
    inbreedingCoeff: 0.018,
  },
  {
    _id: 'cow-011',
    name: 'Ruby',
    type: 'cow',
    breed: 'Jersey',
    gender: 'female',
    inbreedingCoeff: 0.041,
  },
  {
    _id: 'cow-012',
    name: 'Misty',
    type: 'cow',
    breed: 'Ayrshire',
    gender: 'female',
    inbreedingCoeff: 0.023,
  },
  {
    _id: 'goat-010',
    name: 'Pearl',
    type: 'goat',
    breed: 'Boer',
    gender: 'female',
    inbreedingCoeff: 0.072,
  },
  {
    _id: 'sheep-010',
    name: 'Wooly',
    type: 'sheep',
    breed: 'Merino',
    gender: 'female',
    inbreedingCoeff: 0.132,
  },
]
// ── Sub-components ─────────────────────────────────────────────
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

const HeatStatusBadge = ({ status }: { status: HeatCycle['status'] }) => {
  const map: Record<string, { cls: string; label: string }> = {
    active: { cls: 'badge-healthy', label: '🔥 In heat' },
    expected: { cls: 'badge-recovering', label: '📅 Due soon' },
    overdue: { cls: 'badge-sick', label: '⚠ Overdue' },
    bred: { cls: 'badge-injured', label: '✓ Bred' },
  }
  const { cls, label } = map[status] ?? map.expected
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
}

const OutcomeBadge = ({ outcome }: { outcome: BreedingRecord['outcome'] }) => {
  if (outcome === 'successful') return <span className="badge-healthy px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Success</span>
  if (outcome === 'unsuccessful') return <span className="badge-sick px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"><XCircle className="w-3 h-3" />Unsuccessful</span>
  return <span className="badge-recovering px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"><Clock className="w-3 h-3" />Pending</span>
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
      <span className="text-muted-foreground w-16 text-right">{coeff.toFixed(3)} ({label})</span>
    </div>
  )
}

// ── Simple visual lineage tree ─────────────────────────────────
const LineageNode = ({ animal, animals, depth = 0, maxDepth = 3 }: { animal: AnimalNode; animals: AnimalNode[]; depth?: number; maxDepth?: number }) => {
  if (depth >= maxDepth) return null
  const sire = animals.find(a => a._id === animal.sireId)
  const dam = animals.find(a => a._id === animal.damId)
  const hasParents = sire || dam

  return (
    <div className="flex flex-col gap-1">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors
        ${depth === 0 ? 'bg-primary/10 border-primary/30 font-semibold' : 'bg-card border-border'}`}>
        <span className="text-base">{animal.gender === 'female' ? '♀' : animal.gender === 'male' ? '♂' : '◈'}</span>
        <div>
          <div className="font-medium leading-tight">{animal.name}</div>
          {animal.breed && <div className="text-xs text-muted-foreground">{animal.breed}</div>}
        </div>
        {animal.inbreedingCoeff !== undefined && animal.inbreedingCoeff > 0 && (
          <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${animal.inbreedingCoeff > 0.15 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
            F={animal.inbreedingCoeff.toFixed(2)}
          </span>
        )}
      </div>
      {hasParents && (
        <div className="ml-4 pl-3 border-l-2 border-dashed border-border flex flex-col gap-1.5 mt-1">
          {sire && (
            <div>
              <div className="text-xs text-muted-foreground mb-0.5 ml-1">Sire</div>
              <LineageNode animal={sire} animals={animals} depth={depth + 1} maxDepth={maxDepth} />
            </div>
          )}
          {dam && (
            <div>
              <div className="text-xs text-muted-foreground mb-0.5 ml-1">Dam</div>
              <LineageNode animal={dam} animals={animals} depth={depth + 1} maxDepth={maxDepth} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function BreedingPage() {
  const [tab, setTab] = useState<'heat' | 'records' | 'lineage' | 'analytics'>('heat')
  const [heatCycles, setHeatCycles] = useState<HeatCycle[]>([])
  const [breedingRecords, setBreedingRecords] = useState<BreedingRecord[]>([])
  const [animals, setAnimals] = useState<AnimalNode[]>([])
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
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
    setHeatCycles(mockHeatCycles)
    setBreedingRecords(mockBreedingRecords)
    setAnimals(mockAnimals)
    setSelectedAnimal(mockAnimals[0])

    setLoading(false)
  }, 1200)
}, [])

  const loadAll = async (token: string) => {
    try {
      setLoading(true)
      const headers = { Authorization: `Bearer ${token}` }
      const [hRes, bRes, aRes] = await Promise.all([
        fetch('/api/breeding/heat-cycles', { headers }),
        fetch('/api/breeding/records', { headers }),
        fetch('/api/animals', { headers }),
      ])
      if (hRes.ok) { const d = await hRes.json(); setHeatCycles(d.cycles || []) }
      if (bRes.ok) { const d = await bRes.json(); setBreedingRecords(d.records || []) }
      if (aRes.ok) { const d = await aRes.json(); setAnimals(d.animals || []) }
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  // Analytics
  const analytics = useMemo(() => {
    const total = breedingRecords.length
    const successful = breedingRecords.filter(r => r.outcome === 'successful').length
    const successRate = total ? Math.round((successful / total) * 100) : 0
    const inHeat = heatCycles.filter(h => h.status === 'active').length
    const overdue = heatCycles.filter(h => h.status === 'overdue').length
    const highInbreeding = animals.filter(a => (a.inbreedingCoeff ?? 0) > 0.15).length
    const avgInbreeding = animals.length ? animals.reduce((s, a) => s + (a.inbreedingCoeff ?? 0), 0) / animals.length : 0
    return { total, successful, successRate, inHeat, overdue, highInbreeding, avgInbreeding }
  }, [breedingRecords, heatCycles, animals])

  const filteredHeat = heatCycles.filter(h => h.animalName?.toLowerCase().includes(search.toLowerCase()))
  const filteredRecords = breedingRecords.filter(r =>
    r.damName?.toLowerCase().includes(search.toLowerCase()) ||
    r.sireName?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredAnimals = animals.filter(a => a.name?.toLowerCase().includes(search.toLowerCase()))

  const TABS = [
    { id: 'heat', label: 'Heat Cycles', icon: Flame },
    { id: 'records', label: 'Breeding Records', icon: Heart },
    { id: 'lineage', label: 'Lineage Tree', icon: GitBranch },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ] as const

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
              <Dna className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-primary">Genetics</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Breeding & Genetics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Heat cycles, lineage, and reproductive analytics</p>
          </div>
          <div className="flex gap-2">
            <Link href="/breeding/new-record">
              <Button className="gap-2 rounded-xl shadow-sm shadow-primary/20 hover:shadow-md transition-shadow">
                <Plus className="w-4 h-4" /> Log Breeding
              </Button>
            </Link>
          </div>
        </header>

        {error && (
          <div role="alert" className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-center gap-2" style={{ animationFillMode: 'forwards' }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
            <button className="ml-auto" onClick={() => setError('')}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Stats */}
        <div className="animate-fade-up delay-75 grid grid-cols-2 md:grid-cols-4 gap-3" style={{ animationFillMode: 'forwards' }}>
          <StatCard icon={Flame} label="Currently in heat" value={analytics.inHeat} color="destructive" />
          <StatCard icon={TrendingUp} label="Breeding success rate" value={`${analytics.successRate}%`} sub={`${analytics.successful} / ${analytics.total} attempts`} />
          <StatCard icon={AlertTriangle} label="Overdue heat cycles" value={analytics.overdue} color="destructive" />
          <StatCard icon={Shield} label="High inbreeding risk" value={analytics.highInbreeding} sub={`Avg F = ${analytics.avgInbreeding.toFixed(3)}`} color="destructive" />
        </div>

        {/* Tabs */}
        <div className="animate-fade-up delay-100 flex gap-1 p-1 bg-muted rounded-2xl w-fit flex-wrap" style={{ animationFillMode: 'forwards' }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-9 rounded-xl bg-card h-9 text-sm" />
        </div>

        {/* ── HEAT CYCLES TAB ── */}
        {tab === 'heat' && (
          <div className="animate-fade-up flex flex-col gap-3" style={{ animationFillMode: 'forwards' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Heat Cycle Tracker</h2>
              <Link href="/breeding/log-heat">
                <Button variant="outline" size="sm" className="gap-1.5 rounded-xl h-8 text-xs"><Plus className="w-3.5 h-3.5" />Log Heat</Button>
              </Link>
            </div>
            {filteredHeat.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground"><Flame className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No heat cycles recorded</p></div>
            ) : (
              <div className="rounded-2xl border border-border overflow-hidden bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Animal</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Heat</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next Expected</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cycle (days)</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredHeat.map(h => {
                        const daysUntil = Math.round((new Date(h.nextExpectedDate).getTime() - Date.now()) / 86400000)
                        return (
                          <tr key={h._id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-medium">{h.animalName}</td>
                            <td className="px-4 py-3 text-muted-foreground">{new Date(h.lastHeatDate).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-foreground">{new Date(h.nextExpectedDate).toLocaleDateString()}</span>
                                {daysUntil > 0 && daysUntil <= 7 && <span className="text-xs text-chart-3 font-medium">(in {daysUntil}d)</span>}
                                {daysUntil <= 0 && <span className="text-xs text-destructive font-medium">({Math.abs(daysUntil)}d ago)</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{h.cycleLengthDays}d</td>
                            <td className="px-4 py-3"><HeatStatusBadge status={h.status} /></td>
                            <td className="px-4 py-3 text-right">
                              <Link href={`/breeding/heat/${h._id}/breed`}>
                                <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg gap-1">
                                  <Heart className="w-3 h-3" />Breed
                                </Button>
                              </Link>
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
            <h2 className="font-semibold text-foreground">Breeding Records</h2>
            {filteredRecords.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground"><Heart className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No breeding records yet</p></div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredRecords.map(r => (
                  <div key={r._id} className="card-hover bg-card border border-border rounded-2xl p-4">
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold">{r.sireName}</span>
                          <span className="text-muted-foreground text-sm">♂ × ♀</span>
                          <span className="font-semibold">{r.damName}</span>
                          <OutcomeBadge outcome={r.outcome} />
                        </div>
                        <div className="text-sm text-muted-foreground flex flex-wrap gap-3 mt-1">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(r.breedingDate).toLocaleDateString()}</span>
                          {r.offspringCount !== undefined && <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" />{r.offspringCount} offspring</span>}
                        </div>
                        {r.notes && <p className="text-xs text-muted-foreground mt-1.5 italic">"{r.notes}"</p>}
                      </div>
                      {r.inbreedingCoeff !== undefined && (
                        <div className="w-48 flex-shrink-0">
                          <div className="text-xs text-muted-foreground mb-1 font-medium">Inbreeding coefficient</div>
                          <InbreedingMeter coeff={r.inbreedingCoeff} />
                        </div>
                      )}
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
              {/* Animal selector */}
              <div className="w-full sm:w-64 flex-shrink-0">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Select Animal</h3>
                <div className="flex flex-col gap-1 max-h-80 overflow-y-auto rounded-xl border border-border bg-card p-2">
                  {filteredAnimals.map(a => (
                    <button key={a._id} onClick={() => setSelectedAnimal(a)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${selectedAnimal?._id === a._id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
                      <span>{a.gender === 'female' ? '♀' : a.gender === 'male' ? '♂' : '◈'}</span>
                      <div>
                        <div className="leading-tight">{a.name}</div>
                        {a.breed && <div className="text-xs text-muted-foreground">{a.breed}</div>}
                      </div>
                      {(a.inbreedingCoeff ?? 0) > 0.15 && <AlertTriangle className="w-3.5 h-3.5 text-destructive ml-auto flex-shrink-0" />}
                    </button>
                  ))}
                  {filteredAnimals.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No animals found</p>}
                </div>
              </div>

              {/* Tree view */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Genetic Lineage</h3>
                  {selectedAnimal?.inbreedingCoeff !== undefined && selectedAnimal.inbreedingCoeff > 0.1 && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-3 py-1 rounded-full border border-destructive/20">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Inbreeding risk detected (F={selectedAnimal.inbreedingCoeff.toFixed(3)})
                    </div>
                  )}
                </div>
                {selectedAnimal ? (
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <LineageNode animal={selectedAnimal} animals={animals} depth={0} maxDepth={3} />
                    {!selectedAnimal.sireId && !selectedAnimal.damId && (
                      <p className="text-xs text-muted-foreground mt-3 text-center">No parent records found. <Link href={`/animals/${selectedAnimal._id}/edit`} className="text-primary hover:underline">Add lineage →</Link></p>
                    )}
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

            {/* Success rate donut-style */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-destructive" /><span className="text-muted-foreground">Unsuccessful:</span><strong>{analytics.total - analytics.successful - breedingRecords.filter(r => r.outcome === 'pending').length}</strong></div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-chart-3" /><span className="text-muted-foreground">Pending:</span><strong>{breedingRecords.filter(r => r.outcome === 'pending').length}</strong></div>
                  </div>
                </div>
              </div>

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

            {/* High inbreeding alerts */}
            {analytics.highInbreeding > 0 && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                <div className="flex items-center gap-2 mb-3 text-destructive font-semibold"><AlertTriangle className="w-4 h-4" />Inbreeding Alerts</div>
                <div className="flex flex-col gap-2">
                  {animals.filter(a => (a.inbreedingCoeff ?? 0) >= 0.15).map(a => (
                    <div key={a._id} className="flex items-center gap-3 text-sm bg-card rounded-xl px-3 py-2 border border-destructive/15">
                      <span className="font-medium">{a.name}</span>
                      <span className="text-muted-foreground">{a.breed}</span>
                      <InbreedingMeter coeff={a.inbreedingCoeff} />
                      <Link href={`/animals/${a._id}`} className="ml-auto text-primary hover:underline text-xs flex items-center gap-0.5">
                        View <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}