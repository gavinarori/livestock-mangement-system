'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, BarChart3, Heart, TrendingUp, Users, Activity, Leaf } from 'lucide-react'

interface HerdStats { total: number; byType: Record<string, number>; byHealth: Record<string, number> }
interface HealthStats { recentRecords: any[]; diseaseCount: Record<string, number>; recentDiseases: any[] }
interface BreedingStats { total: number; recent: any[] }
interface Analytics { herd: HerdStats; health: HealthStats; breeding: BreedingStats }

const HEALTH_COLORS: Record<string, string> = {
  HEALTHY: 'bg-emerald-500', SICK: 'bg-red-500',
  INJURED: 'bg-amber-500', RECOVERING: 'bg-blue-500',
}

function SkeletonCard() {
  return <div className="skeleton h-32 rounded-2xl" />
}

function MiniBarChart({ data }: { data: [string, number][] }) {
  const max = Math.max(...data.map(([, v]) => v), 1)
  return (
    <div className="flex items-end gap-1.5 h-16" role="img" aria-label="Disease frequency chart">
      {data.map(([label, value]) => (
        <div key={label} className="flex-1 flex flex-col items-center gap-1 group">
          <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">{value}</span>
          <div
            className="w-full bg-primary/80 rounded-t-md transition-all duration-700 hover:bg-primary"
            style={{ height: `${(value / max) * 100}%`, minHeight: '4px' }}
            title={`${label}: ${value}`}
          />
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsDashboard() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) { router.push('/login'); return }

        const response = await fetch('/api/analytics', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!response.ok) {
          if (response.status === 401) { router.push('/login'); return }
          throw new Error('Failed to fetch analytics')
        }
        setAnalytics(await response.json())
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [router])

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6" aria-busy="true" aria-label="Loading analytics">
        <div className="skeleton h-10 w-48 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="skeleton h-48 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="skeleton h-48 rounded-2xl" />
          <div className="skeleton h-48 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6" role="alert">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 text-destructive" aria-hidden="true" />
            </div>
            <p className="font-semibold">{error || 'Failed to load analytics'}</p>
            <Button onClick={() => window.location.reload()} className="w-full">Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const sickAnimals = analytics.herd.byHealth['SICK'] || 0
  const healthyAnimals = analytics.herd.byHealth['HEALTHY'] || 0
  const healthPct = analytics.herd.total > 0
    ? Math.round((healthyAnimals / analytics.herd.total) * 100)
    : 0

  const diseaseEntries = Object.entries(analytics.health.diseaseCount)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5) as [string, number][]

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <header className="stagger-child animate-fade-up" style={{ animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5 text-primary" aria-hidden="true" />
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">Insights</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">Enterprise livestock management insights</p>
      </header>

      {/* KPI cards */}
      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">Key Performance Indicators</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Animals', value: analytics.herd.total,
              icon: Activity, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
              sub: 'Across all types', delay: 0
            },
            {
              label: 'Healthy', value: healthyAnimals,
              icon: Heart, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
              sub: `${healthPct}% of herd`, delay: 100
            },
            {
              label: 'Sick / At Risk', value: sickAnimals,
              icon: AlertCircle, color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
              sub: 'Requiring attention', delay: 200
            },
            {
              label: 'Health Records', value: analytics.health.recentRecords.length,
              icon: TrendingUp, color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
              sub: 'Recent activity', delay: 300
            },
          ].map(({ label, value, icon: Icon, color, sub, delay }) => (
            <article
              key={label}
              className="stagger-child animate-fade-up card-hover bg-card border border-border rounded-2xl p-5 shadow-sm"
              style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
              aria-label={`${label}: ${value}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{label}</span>
                <span className={`p-2 rounded-xl ${color}`} aria-hidden="true"><Icon className="w-4 h-4" /></span>
              </div>
              <p className="stat-number text-4xl font-semibold">{value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Herd composition */}
      <section
        className="stagger-child animate-fade-up delay-200 bg-card border border-border rounded-2xl p-5 shadow-sm"
        style={{ animationFillMode: 'forwards' }}
        aria-labelledby="herd-comp-heading"
      >
        <div className="mb-4">
          <h2 id="herd-comp-heading" className="font-semibold text-lg">Herd Composition</h2>
          <p className="text-sm text-muted-foreground">Animals breakdown by type</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(analytics.herd.byType).map(([type, count], i) => {
            const pct = analytics.herd.total > 0 ? Math.round(((count as number) / analytics.herd.total) * 100) : 0
            return (
              <div
                key={type}
                className="stagger-child animate-scale-in p-4 border border-border rounded-xl bg-background hover:border-primary/30 transition-colors"
                style={{ animationDelay: `${300 + i * 60}ms`, animationFillMode: 'forwards' }}
                role="group"
                aria-label={`${type}: ${count as number} animals, ${pct}% of herd`}
              >
                <p className="text-xs font-semibold text-muted-foreground capitalize mb-2">{type}</p>
                <p className="stat-number text-2xl font-semibold">{count as number}</p>
                <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full bg-primary rounded-full progress-bar" style={{ '--progress-width': `${pct}%` } as React.CSSProperties} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{pct}%</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Health overview row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Disease trends */}
        <section
          className="stagger-child animate-fade-up delay-300 bg-card border border-border rounded-2xl p-5 shadow-sm"
          style={{ animationFillMode: 'forwards' }}
          aria-labelledby="disease-heading"
        >
          <div className="mb-4">
            <h2 id="disease-heading" className="font-semibold text-lg">Disease Trends</h2>
            <p className="text-sm text-muted-foreground">Last 30 days — top diagnoses</p>
          </div>

          {diseaseEntries.length > 0 ? (
            <>
              <MiniBarChart data={diseaseEntries} />
              <ul className="mt-4 space-y-2" aria-label="Disease frequency list">
                {diseaseEntries.map(([disease, count]) => {
                  const pct = Math.round(((count as number) / analytics.herd.total) * 100)
                  return (
                    <li key={disease} className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" aria-hidden="true" />
                      <span className="text-sm flex-1 truncate">{disease}</span>
                      <span className="text-sm font-semibold stat-number">{count as number}</span>
                      <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Leaf className="w-8 h-8 text-emerald-500 mb-2" aria-hidden="true" />
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">No disease records</p>
              <p className="text-xs text-muted-foreground">in the last 30 days</p>
            </div>
          )}
        </section>

        {/* Recent health records */}
        <section
          className="stagger-child animate-fade-up delay-400 bg-card border border-border rounded-2xl p-5 shadow-sm"
          style={{ animationFillMode: 'forwards' }}
          aria-labelledby="health-records-heading"
        >
          <div className="mb-4">
            <h2 id="health-records-heading" className="font-semibold text-lg">Recent Health Records</h2>
            <p className="text-sm text-muted-foreground">Latest health activities</p>
          </div>

          {analytics.health.recentRecords.length > 0 ? (
            <ul className="space-y-2.5" aria-label="Recent health records">
              {analytics.health.recentRecords.slice(0, 5).map((record: any) => (
                <li
                  key={record.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${HEALTH_COLORS[record.healthStatus] || 'bg-muted-foreground'}`} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize truncate">{record.recordType}</p>
                    <p className="text-xs text-muted-foreground truncate">{record.animal?.name}</p>
                  </div>
                  <time
                    className="text-xs text-muted-foreground flex-shrink-0"
                    dateTime={record.date}
                  >
                    {new Date(record.date).toLocaleDateString()}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">No health records yet</p>
            </div>
          )}
        </section>
      </div>

      {/* Breeding program */}
      <section
        className="stagger-child animate-fade-up delay-500 bg-card border border-border rounded-2xl p-5 shadow-sm"
        style={{ animationFillMode: 'forwards' }}
        aria-labelledby="breeding-heading"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
          <div>
            <h2 id="breeding-heading" className="font-semibold text-lg">Breeding Program</h2>
            <p className="text-sm text-muted-foreground">Active records and upcoming births</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-border rounded-xl bg-background" aria-label={`Total breedings: ${analytics.breeding.total}`}>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-2">Total Breedings</p>
            <p className="stat-number text-3xl font-semibold">{analytics.breeding.total}</p>
          </div>

          <div className="col-span-2 p-4 border border-border rounded-xl bg-background">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">Recent Records</p>
            {analytics.breeding.recent.length > 0 ? (
              <ul className="space-y-2" aria-label="Recent breeding records">
                {analytics.breeding.recent.slice(0, 3).map((breeding: any) => (
                  <li key={breeding.id} className="flex items-center gap-3 p-2.5 bg-muted/40 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{breeding.animal?.name}</span>
                        <span className="text-muted-foreground mx-1.5" aria-label="bred with">×</span>
                        <span className="font-medium">{breeding.breedingAnimal?.name}</span>
                      </p>
                    </div>
                    <time className="text-xs text-muted-foreground flex-shrink-0" dateTime={breeding.breedingDate}>
                      {new Date(breeding.breedingDate).toLocaleDateString()}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No breeding records yet</p>
            )}
          </div>
        </div>
      </section>

      <div className="h-4" aria-hidden="true" />
    </div>
  )
}