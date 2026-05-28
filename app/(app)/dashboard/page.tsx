'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart3, Heart, Plus, Settings, TrendingUp, Users,
  AlertCircle, ArrowRight, Activity, Leaf, Zap, Wind
} from 'lucide-react'

interface DashboardStats {
  totalAnimals: number
  healthyCount: number
  sickCount: number
  recentActivityCount: number
  memberCount: number
  organizationName: string
}

// Animated counter hook
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === 0) return
    const steps = 40
    const increment = target / steps
    let current = 0
    const timer = setInterval(() => {
      current = Math.min(current + increment, target)
      setValue(Math.round(current))
      if (current >= target) clearInterval(timer)
    }, duration / steps)
    return () => clearInterval(timer)
  }, [target, duration])
  return value
}

function StatCard({
  label, value, icon: Icon, color, subtext, delay = 0, healthPct
}: {
  label: string; value: number; icon: any; color: string;
  subtext: string; delay?: number; healthPct?: number
}) {
  const count = useCountUp(value)

  return (
    <article
      className={`stagger-child animate-fade-up card-hover bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 shadow-sm`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{label}</span>
        <span className={`p-2 rounded-xl ${color}`} aria-hidden="true">
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div>
        <p className="stat-number text-4xl font-semibold leading-none">{count.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-1.5">{subtext}</p>
      </div>
      {healthPct !== undefined && (
        <div role="progressbar" aria-valuenow={healthPct} aria-valuemin={0} aria-valuemax={100} aria-label={`${healthPct}% healthy`}>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 progress-bar"
              style={{ '--progress-width': `${healthPct}%` } as React.CSSProperties}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{healthPct}% of herd</p>
        </div>
      )}
    </article>
  )
}

// Skeleton loader
function DashboardSkeleton() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8" aria-busy="true" aria-label="Loading dashboard">
      <div className="skeleton h-10 w-64 rounded-xl" />
      <div className="skeleton h-4 w-40 rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

const QUICK_ACTIONS = [
  { label: 'Add Animal', icon: Plus, href: '/animals/new', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400', desc: 'Register new livestock' },
  { label: 'Analytics', icon: BarChart3, href: '/analytics', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400', desc: 'View herd insights' },
  { label: 'Manage Team', icon: Users, href: '/settings?tab=members', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', desc: 'Invite & manage staff' },
  { label: 'Settings', icon: Settings, href: '/settings', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400', desc: 'Configure your org' },
]

const FEATURES = [
  {
    title: 'Animal Management', desc: 'Comprehensive herd tracking',
    icon: Leaf, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    items: [
      { icon: Plus, label: 'Track Animals', sub: 'Record breeds, genetics, identification tags' },
      { icon: Heart, label: 'Health Monitoring', sub: 'Vaccinations, treatments, health status' },
    ],
    href: '/animals', cta: 'Manage Animals'
  },
  {
    title: 'Analytics & Reporting', desc: 'Data-driven farm insights',
    icon: BarChart3, color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
    items: [
      { icon: BarChart3, label: 'Herd Metrics', sub: 'Composition, health trends, performance' },
      { icon: TrendingUp, label: 'Disease Tracking', sub: 'Pattern monitoring and health alerts' },
    ],
    href: '/analytics', cta: 'View Analytics'
  },
  {
    title: 'Team Management', desc: 'Collaborate with your farm team',
    icon: Users, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    items: [
      { icon: Users, label: 'Role-Based Access', sub: 'Admin, Manager, Vet, Worker, Viewer' },
      { icon: Settings, label: 'Granular Permissions', sub: 'Control who can access what' },
    ],
    href: '/settings?tab=members', cta: 'Manage Team'
  },
  {
    title: 'Organization Setup', desc: 'Configure your enterprise',
    icon: Zap, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    items: [
      { icon: Activity, label: 'Plan & Limits', sub: 'Subscription and resource usage' },
      { icon: Settings, label: 'Organization Info', sub: 'Update name, description, branding' },
    ],
    href: '/settings', cta: 'Open Settings'
  },
]

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }

      const [analyticsRes, orgRes] = await Promise.all([
        fetch('/api/analytics', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/organization', { headers: { Authorization: `Bearer ${token}` } })
      ])

      if (!analyticsRes.ok || !orgRes.ok) {
        if (analyticsRes.status === 401 || orgRes.status === 401) { router.push('/login'); return }
        throw new Error('Failed to fetch dashboard data')
      }

      const analyticsData = await analyticsRes.json()
      const orgData = await orgRes.json()

      setStats({
        totalAnimals: analyticsData.herd.total,
        healthyCount: analyticsData.herd.byHealth['HEALTHY'] || 0,
        sickCount: analyticsData.herd.byHealth['SICK'] || 0,
        recentActivityCount: analyticsData.health.recentRecords.length,
        memberCount: orgData.organization.memberCount || 0,
        organizationName: orgData.organization.name
      })
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6" role="alert">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 text-destructive" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Something went wrong</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button onClick={() => window.location.reload()} className="w-full" aria-label="Retry loading dashboard">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const healthPct = stats && stats.totalAnimals > 0
    ? Math.round((stats.healthyCount / stats.totalAnimals) * 100)
    : 0

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">

      {/* ── Header ── */}
      <header className="stagger-child animate-fade-up space-y-1" style={{ animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-primary animate-leaf" aria-hidden="true" />
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">HerdWise Enterprise</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Welcome back,{' '}
          <span className="text-primary">{stats?.organizationName}</span>
        </h1>
        <p className="text-muted-foreground">Your livestock operation at a glance — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </header>

      {/* ── Eco Banner ── */}
      <div
        className="eco-banner stagger-child animate-fade-up delay-100 rounded-2xl p-4 flex items-center gap-4"
        style={{ animationFillMode: 'forwards' }}
        role="complementary"
        aria-label="Sustainability status"
      >
        <div className="p-2.5 bg-white/60 dark:bg-white/10 rounded-xl">
          <Wind className="w-5 h-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Sustainability Score: Excellent</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">Your herd management practices are carbon-efficient this quarter.</p>
        </div>
        <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 stat-number hidden sm:block" aria-label="96 out of 100">96/100</span>
      </div>

      {/* ── Key Metrics ── */}
      <section aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="sr-only">Key Metrics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Animals" value={stats?.totalAnimals || 0} icon={Activity}
            color="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
            subtext="In your herd" delay={0} />
          <StatCard label="Healthy" value={stats?.healthyCount || 0} icon={Heart}
            color="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
            subtext="Animals well" delay={100} healthPct={healthPct} />
          <StatCard label="Attention" value={stats?.sickCount || 0} icon={AlertCircle}
            color="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
            subtext="Needing care" delay={200} />
          <StatCard label="Activity" value={stats?.recentActivityCount || 0} icon={TrendingUp}
            color="bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400"
            subtext="Recent records" delay={300} />
          <StatCard label="Team" value={stats?.memberCount || 0} icon={Users}
            color="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
            subtext="Active members" delay={400} />
        </div>
      </section>

      {/* ── Quick Actions ── */}
      <section
        className="stagger-child animate-fade-up delay-300 bg-card border border-border rounded-2xl p-5 shadow-sm"
        style={{ animationFillMode: 'forwards' }}
        aria-labelledby="quick-actions-heading"
      >
        <div className="mb-4">
          <h2 id="quick-actions-heading" className="font-semibold text-lg">Quick Actions</h2>
          <p className="text-sm text-muted-foreground">Common tasks and management tools</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href}>
                <div className="card-hover group border border-border rounded-xl p-4 flex flex-col items-start gap-3 cursor-pointer bg-background hover:border-primary/30 transition-all duration-200 focus-within:ring-2 focus-within:ring-ring">
                  <span className={`p-2 rounded-xl ${action.color} transition-transform duration-200 group-hover:scale-110`} aria-hidden="true">
                    <Icon className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{action.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section aria-labelledby="features-heading">
        <h2 id="features-heading" className="font-semibold text-lg mb-4">Feature Overview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {FEATURES.map((feature, i) => {
            const FeatureIcon = feature.icon
            return (
              <article
                key={feature.title}
                className={`stagger-child animate-fade-up card-hover bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-4`}
                style={{ animationDelay: `${400 + i * 80}ms`, animationFillMode: 'forwards' }}
              >
                <div className="flex items-center gap-3">
                  <span className={`p-2.5 rounded-xl ${feature.color}`} aria-hidden="true">
                    <FeatureIcon className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-base">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {feature.items.map(({ icon: ItemIcon, label, sub }) => (
                    <div key={label} className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/40">
                      <ItemIcon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href={feature.href} className="mt-auto">
                  <Button variant="outline" className="w-full group hover:bg-primary hover:text-primary-foreground transition-colors" aria-label={`${feature.cta} — ${feature.title}`}>
                    {feature.cta}
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                  </Button>
                </Link>
              </article>
            )
          })}
        </div>
      </section>

      {/* ── Bottom padding for mobile ── */}
      <div className="h-4" aria-hidden="true" />
    </div>
  )
}