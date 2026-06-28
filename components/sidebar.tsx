'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Beef,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Search,
  LogOut,
  Menu,
  X,
  Boxes,
  Dna,
  HeartPulse,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  Monitor,
  Activity,
  Heart,
  GitMerge,
  Syringe,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import Image from 'next/image'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string
  type: 'animal' | 'health_record' | 'breeding' | 'treatment' | 'outbreak'
  title: string
  subtitle: string
  href: string
  badge?: string
  badgeColor?: string
  meta?: string
}

// ─── Role types ───────────────────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'MANAGER' | 'VETERINARIAN' | 'WORKER' | 'VIEWER'

// ─── Navigation config ────────────────────────────────────────────────────────
//
// `badge` is no longer a hardcoded placeholder string. Each item that should
// show a "needs attention" count instead carries an `attentionKey`, which is
// resolved to a live number by useAttentionCounts() below. Items without an
// attentionKey never show a badge (e.g. Settings, Analytics).

type AttentionKey =
  | 'breeding'
  | 'health'
  | 'inventory'
  | 'workerDashboard'
  | 'vetDashboard'
  | 'managerTasks'

type NavItem = {
  href: string
  label: string
  icon: React.FC<{ className?: string }>
  attentionKey?: AttentionKey
  description: string
  /** Roles that can see this item. Undefined = visible to all. */
  allowedRoles?: UserRole[]
}

type NavGroup = {
  section: string
  items: NavItem[]
}

const NAV_ITEMS: NavGroup[] = [
  {
    section: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Farm overview & live activity', allowedRoles: ['ADMIN', 'MANAGER'] },
      { href: '/analytics', label: 'Analytics', icon: BarChart3, description: 'Performance insights & reports' },
    ],
  },
  {
    section: 'Dashboards',
    items: [
      {
        href: '/work-dashboard',
        label: 'Worker Dashboard',
        icon: Activity,
        attentionKey: 'workerDashboard',
        description: 'Daily farm operations',
        allowedRoles: ['ADMIN', 'MANAGER', 'WORKER'],
      },
      {
        href: '/Veterinary-dashboard',
        label: 'Veterinary Dashboard',
        icon: Syringe,
        attentionKey: 'vetDashboard',
        description: 'Animal health & treatments',
        allowedRoles: ['ADMIN', 'VETERINARIAN'],
      },
      {
        href: '/Manager-task-assignment',
        label: 'Manager Task Assignment',
        icon: BarChart3,
        attentionKey: 'managerTasks',
        description: 'Operations & team overview',
        allowedRoles: ['ADMIN', 'MANAGER'],
      },
    ],
  },
  {
    section: 'Livestock',
    items: [
      { href: '/animals', label: 'Animals', icon: Beef, description: 'Manage livestock records' },
      { href: '/breeding', label: 'Breeding', icon: Dna, attentionKey: 'breeding', description: 'Heat cycles & genetics' },
      { href: '/healthy', label: 'Health', icon: HeartPulse, attentionKey: 'health', description: 'Vaccinations & treatments' },
    ],
  },
  {
    section: 'Resources',
    items: [
      { href: '/inventory', label: 'Inventory', icon: Boxes, attentionKey: 'inventory', description: 'Feed, medicine & equipment' },
    ],
  },
  {
    section: 'System',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings, description: 'Preferences & configuration', allowedRoles: ['ADMIN', 'MANAGER'] },
    ],
  },
]

function getFilteredNavItems(role: UserRole): NavGroup[] {
  return NAV_ITEMS
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        !item.allowedRoles || item.allowedRoles.includes(role)
      ),
    }))
    .filter(group => group.items.length > 0)
}

// ─── Attention counts (live, role-aware) ──────────────────────────────────────
//
// Each nav item that needs a "needs attention" badge pulls its count from the
// same API endpoints that item's own page already calls — so the number the
// sidebar shows always matches what the page itself reports as urgent.
// Counts refresh on mount, on a polling interval, and whenever the route
// changes (e.g. after the user fixes something and navigates back).

const ATTENTION_POLL_MS = 60_000

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function safeJson(res: Response) {
  if (!res.ok) return null
  try { return await res.json() } catch { return null }
}

async function fetchBreedingAttention(): Promise<number> {
  // Overdue heat cycles — mirrors BreedingPage's own "Overdue heat cycles" stat.
  const data = await safeJson(await fetch('/api/breeding/heat-cycles?limit=200', { headers: authHeaders() }))
  const cycles = data?.cycles ?? []
  return cycles.filter((c: any) => c.status === 'OVERDUE').length
}

async function fetchHealthAttention(): Promise<number> {
  // Overdue vaccinations + critical/high active treatments + active outbreaks —
  // mirrors HealthIntelligencePage's KPI strip.
  const [vacc, tx, dis] = await Promise.all([
    safeJson(await fetch('/api/health/vaccinations?limit=200', { headers: authHeaders() })),
    safeJson(await fetch('/api/health/treatments?limit=200', { headers: authHeaders() })),
    safeJson(await fetch('/api/health/diseases?isActive=true&limit=200', { headers: authHeaders() })),
  ])
  const overdueVacc = (vacc?.schedules ?? []).filter((v: any) => v.status === 'OVERDUE').length
  const urgentTx = (tx?.treatments ?? []).filter((t: any) =>
    t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && (t.priority === 'CRITICAL' || t.priority === 'HIGH')
  ).length
  const activeOutbreaks = (dis?.outbreaks ?? []).filter((d: any) => d.isActive).length
  return overdueVacc + urgentTx + activeOutbreaks
}

async function fetchInventoryAttention(): Promise<number> {
  // Low feed stock + medicine alerts + equipment issues — mirrors
  // InventoryPage's stats strip.
  const [feed, med, equip] = await Promise.all([
    safeJson(await fetch('/api/inventory/feed?limit=200', { headers: authHeaders() })),
    safeJson(await fetch('/api/inventory/medicine?limit=200', { headers: authHeaders() })),
    safeJson(await fetch('/api/inventory/equipment?limit=200', { headers: authHeaders() })),
  ])
  const lowFeed = (feed?.items ?? []).filter((f: any) => f.alerts?.includes('LOW_STOCK')).length
  const medAlerts = (med?.items ?? []).filter((m: any) => (m.alerts?.length ?? 0) > 0).length
  const equipIssues = (equip?.items ?? []).filter((e: any) => e.status !== 'OPERATIONAL').length
  return lowFeed + medAlerts + equipIssues
}

async function fetchWorkerDashboardAttention(): Promise<number> {
  // Overdue tasks assigned to the current worker.
  const data = await safeJson(await fetch('/api/tasks?assignedToMe=true', { headers: authHeaders() }))
  const tasks = data?.tasks ?? []
  return tasks.filter((t: any) => t.status === 'OVERDUE').length
}

async function fetchVetDashboardAttention(): Promise<number> {
  // Critical active treatments + sick/injured animals still missing a
  // treatment plan — mirrors VetDashboardPage's "Critical" + "Need Attention".
  const data = await safeJson(await fetch('/api/vet/treatments', { headers: authHeaders() }))
  const treatments = data?.treatments ?? []
  const sickAnimals = data?.sickAnimals ?? []
  const critical = treatments.filter((t: any) => t.priority === 'CRITICAL' && t.status !== 'COMPLETED').length
  return critical + sickAnimals.length
}

async function fetchManagerTasksAttention(): Promise<number> {
  // Overdue tasks org-wide — mirrors ManagerTasksPage's "Overdue" stat.
  const data = await safeJson(await fetch('/api/tasks', { headers: authHeaders() }))
  const tasks = data?.tasks ?? []
  return tasks.filter((t: any) => t.status === 'OVERDUE').length
}

const ATTENTION_FETCHERS: Record<AttentionKey, () => Promise<number>> = {
  breeding: fetchBreedingAttention,
  health: fetchHealthAttention,
  inventory: fetchInventoryAttention,
  workerDashboard: fetchWorkerDashboardAttention,
  vetDashboard: fetchVetDashboardAttention,
  managerTasks: fetchManagerTasksAttention,
}

/**
 * Resolves live attention counts for every AttentionKey present in
 * `visibleKeys` (i.e. only for nav items the current role can actually see —
 * no point calling an endpoint for a dashboard the user can't open). Fails
 * soft: any individual fetch error just leaves that count at 0 rather than
 * breaking the whole sidebar.
 */
function useAttentionCounts(visibleKeys: AttentionKey[]) {
  const [counts, setCounts] = useState<Partial<Record<AttentionKey, number>>>({})
  const pathname = usePathname()
  const keysRef = useRef(visibleKeys)
  // eslint-disable-next-line react-hooks/refs
  keysRef.current = visibleKeys

  const refresh = useCallback(async () => {
    const keys = keysRef.current
    if (keys.length === 0) return
    const results = await Promise.all(
      keys.map(async key => {
        try {
          return [key, await ATTENTION_FETCHERS[key]()] as const
        } catch {
          return [key, undefined] as const
        }
      })
    )
    setCounts(prev => {
      const next = { ...prev }
      for (const [key, value] of results) {
        if (value !== undefined) next[key] = value
      }
      return next
    })
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, ATTENTION_POLL_MS)
    return () => clearInterval(interval)
    // Re-run when the set of visible keys changes (e.g. role loads in after mount).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, visibleKeys.join(',')])

  // Also refresh whenever the user navigates — picks up changes they just made.
  useEffect(() => { refresh() }, [pathname, refresh])

  return counts
}

// ─── Result type icon map ──────────────────────────────────────────────────────

const TYPE_ICON: Record<SearchResult['type'], React.FC<{ className?: string }>> = {
  animal: Beef,
  health_record: Activity,
  breeding: GitMerge,
  treatment: Heart,
  outbreak: AlertTriangle,
}

const TYPE_LABEL: Record<SearchResult['type'], string> = {
  animal: 'Animal',
  health_record: 'Health Record',
  breeding: 'Breeding',
  treatment: 'Treatment',
  outbreak: 'Outbreak',
}

const BADGE_COLORS: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

// ─── Global Search ────────────────────────────────────────────────────────────

function GlobalSearch() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    setLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      if (res.ok) {
        const data = await res.json()
        setResults(data.results ?? [])
        setOpen(true)
        setSelectedIdx(-1)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(() => doSearch(val), 280)
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && selectedIdx >= 0) {
      e.preventDefault()
      const hit = results[selectedIdx]
      if (hit) navigate(hit)
    } else if (e.key === 'Escape') {
      close()
    }
  }

  const navigate = (result: SearchResult) => {
    router.push(result.href)
    close()
  }

  const close = () => {
    setOpen(false)
    setSelectedIdx(-1)
    inputRef.current?.blur()
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        close()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Group results by type
  const grouped = results.reduce((acc: Record<string, SearchResult[]>, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  const flatResults = results // for keyboard index

  return (
    <div className="flex-1 max-w-md relative" role="search">
      <label htmlFor="global-search" className="sr-only">
        Search animals, records, reports
      </label>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id="global-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search animals, records… (⌘K)"
          aria-autocomplete="list"
          aria-controls="search-dropdown"
          aria-expanded={open}
          aria-activedescendant={selectedIdx >= 0 ? `search-result-${selectedIdx}` : undefined}
          className="w-full pl-9 pr-10 py-2 text-sm bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-all placeholder:text-muted-foreground"
        />
        {loading && (
          <Loader2
            className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin"
            aria-hidden="true"
          />
        )}
        {!loading && query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          id="search-dropdown"
          role="listbox"
          aria-label="Search results"
          className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-2xl shadow-2xl shadow-black/10 z-50 overflow-hidden max-h-[480px] overflow-y-auto"
        >
          {results.length === 0 && !loading && (
            <div className="px-4 py-8 text-center">
              <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">No results found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try a different search term
              </p>
            </div>
          )}

          {Object.entries(grouped).map(([type, items]) => {
            const TypeIcon = TYPE_ICON[type as SearchResult['type']]
            return (
              <div key={type}>
                {/* Section header */}
                <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                  <TypeIcon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                  <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                    {TYPE_LABEL[type as SearchResult['type']]}
                  </span>
                </div>

                {items.map((result) => {
                  const globalIdx = flatResults.indexOf(result)
                  const isSelected = globalIdx === selectedIdx
                  return (
                    <div
                      key={result.id}
                      id={`search-result-${globalIdx}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setSelectedIdx(globalIdx)}
                      onMouseLeave={() => setSelectedIdx(-1)}
                    >
                      <Link
                        href={result.href}
                        onClick={close}
                        className={`
                          flex items-center gap-3 px-4 py-2.5 transition-colors
                          ${isSelected ? 'bg-accent' : 'hover:bg-muted/50'}
                        `}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">
                              {result.title}
                            </p>
                            {result.badge && (
                              <span
                                className={`
                                  flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full
                                  ${BADGE_COLORS[result.badgeColor ?? 'gray']}
                                `}
                              >
                                {result.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {result.subtitle}
                            {result.meta && (
                              <span className="ml-2 opacity-60">· {result.meta}</span>
                            )}
                          </p>
                        </div>
                        <ArrowRight
                          className={`
                            w-3.5 h-3.5 flex-shrink-0 transition-all
                            ${isSelected ? 'text-foreground translate-x-0' : 'text-muted-foreground/0 -translate-x-1'}
                          `}
                          aria-hidden="true"
                        />
                      </Link>
                    </div>
                  )
                })}
              </div>
            )
          })}

          {results.length > 0 && (
            <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">
                {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
              </p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <kbd className="px-1 py-0.5 bg-background border border-border rounded text-[9px]">↑↓</kbd>
                <span>navigate</span>
                <kbd className="px-1 py-0.5 bg-background border border-border rounded text-[9px]">↵</kbd>
                <span>select</span>
                <kbd className="px-1 py-0.5 bg-background border border-border rounded text-[9px]">Esc</kbd>
                <span>close</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Theme toggle button ──────────────────────────────────────────────────────

function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const themes = [
    { key: 'light', icon: Sun, label: 'Light' },
    { key: 'dark', icon: Moon, label: 'Dark' },
    { key: 'system', icon: Monitor, label: 'System' },
  ]

  if (collapsed) {
    const current = themes.findIndex(t => t.key === theme)
    const next = themes[(current + 1) % themes.length]
    const CurrentIcon = themes[current]?.icon ?? Sun
    return (
      <button
        onClick={() => setTheme(next.key)}
        aria-label={`Theme: ${theme}. Click to switch to ${next.label}`}
        title={`Theme: ${theme}`}
        className="w-full flex items-center justify-center p-2.5 rounded-xl text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
      >
        <CurrentIcon className="w-4 h-4" />
      </button>
    )
  }

  return (
    <div className="px-1">
      <p className="px-2 mb-1.5 text-[10px] font-bold tracking-[0.15em] uppercase text-sidebar-foreground/40">Theme</p>
      <div className="flex items-center gap-1 bg-sidebar-accent/50 rounded-xl p-1">
        {themes.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTheme(key)}
            aria-label={`Switch to ${label} theme`}
            aria-pressed={theme === key}
            title={label}
            className={`
              flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium
              transition-all duration-200
              ${theme === key
                ? 'bg-sidebar text-sidebar-foreground shadow-sm'
                : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/80'
              }
            `}
          >
            <Icon className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Online status ─────────────────────────────────────────────────────────────

function OnlineStatus() {
  const [online, setOnline] = useState(true)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])

  if (online) {
    return (
      <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-full border border-emerald-200 dark:border-emerald-800" role="status" aria-label="Connected">
        <Wifi className="w-3 h-3" aria-hidden="true" />
        <span>Live</span>
      </span>
    )
  }
  return (
    <span className="hidden sm:flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/30 rounded-full border border-amber-200 dark:border-amber-800 animate-pulse" role="alert" aria-label="Offline">
      <WifiOff className="w-3 h-3" aria-hidden="true" />
      <span>Offline</span>
    </span>
  )
}

// ─── Farm avatar ──────────────────────────────────────────────────────────────

function FarmAvatar({ logoUrl, farmName }: { logoUrl?: string | null; farmName?: string | null }) {
  const initials = farmName
    ? farmName.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'HW'

  if (logoUrl) {
    return (
      <div className="w-8 h-8 rounded-xl overflow-hidden border border-primary/20 cursor-pointer hover:opacity-90 transition-opacity">
        <Image src={logoUrl} alt={farmName ?? 'Farm logo'} width={32} height={32} className="object-cover w-full h-full" />
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors" role="img" aria-label={`${farmName ?? 'Farm'} profile`}>
      <span className="text-xs font-bold text-primary">{initials}</span>
    </div>
  )
}

// ─── Main sidebar + layout ────────────────────────────────────────────────────

export function AppSidebar({
  children,
  orgLogoUrl,
  orgName,
  userRole = 'VIEWER',
}: {
  children: React.ReactNode
  orgLogoUrl?: string | null
  orgName?: string | null
  userRole?: UserRole
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const filteredNavItems = getFilteredNavItems(userRole)

  // Only fetch attention counts for keys actually visible to this role —
  // e.g. a WORKER never calls the manager-tasks or vet-dashboard endpoints.
  const visibleAttentionKeys = filteredNavItems
    .flatMap(g => g.items)
    .map(i => i.attentionKey)
    .filter((k): k is AttentionKey => !!k)
  const attentionCounts = useAttentionCounts(visibleAttentionKeys)

  const handleSignOut = async () => {
    
    router.push('/login')
  }

  const SidebarContent = () => (
    <aside
      aria-label="Main navigation"
      className={`flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-64'}`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-sidebar-border ${collapsed ? 'justify-center' : ''}`}>
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Leaf className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
          </div>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-sidebar animate-pulse" aria-hidden="true" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm text-sidebar-foreground leading-tight tracking-tight">Herd</p>
            <p className="text-[10px] text-sidebar-foreground/50 tracking-widest uppercase">Enterprise</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto" aria-label="Primary navigation">
        <div className="space-y-6">
          {filteredNavItems.map(group => (
            <div key={group.section}>
              {!collapsed && (
                <p className="px-3 mb-2 text-[10px] font-bold tracking-[0.2em] uppercase text-sidebar-foreground/40">
                  {group.section}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map(({ href, label, icon: Icon, attentionKey, description }) => {
                  const active = pathname.startsWith(href)
                  const count = attentionKey ? attentionCounts[attentionKey] : undefined
                  const needsAttention = !!count && count > 0
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed && needsAttention ? `${label} — ${count} need${count === 1 ? 's' : ''} attention` : undefined}
                      className={`
                        group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                        transition-all duration-200 relative overflow-hidden
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring
                        ${active
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        }
                        ${collapsed ? 'justify-center' : ''}
                      `}
                    >
                      {active && <span className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" aria-hidden="true" />}
                      <span className="relative flex-shrink-0">
                        <Icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-sidebar-primary-foreground' : ''}`} aria-hidden="true" />
                        {/* Collapsed-sidebar indicator: a small dot keeps the
                            attention signal visible even when there's no room
                            for a numeric badge next to the label. */}
                        {collapsed && needsAttention && (
                          <span
                            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive border border-sidebar animate-pulse"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                      {!collapsed && (
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{label}</div>
                          <div className={`text-[11px] truncate ${active ? 'text-sidebar-primary-foreground/70' : 'text-sidebar-foreground/40'}`}>{description}</div>
                        </div>
                      )}
                      {!collapsed && needsAttention && (
                        <span
                          className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          aria-label={`${count} item${count === 1 ? '' : 's'} need attention`}
                        >
                          {count > 99 ? '99+' : count}
                        </span>
                      )}
                      {collapsed && <span className="sr-only">{label}{needsAttention ? ` — ${count} need attention` : ''}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div className="px-2 py-4 border-t border-sidebar-border space-y-3">
        <ThemeToggle collapsed={collapsed} />
        <button
          onClick={handleSignOut}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {!collapsed && <span>Sign Out</span>}
          {collapsed && <span className="sr-only">Sign Out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-sidebar border border-sidebar-border rounded-full items-center justify-center shadow-sm hover:bg-sidebar-accent transition-colors z-10"
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3 text-sidebar-foreground/70" aria-hidden="true" />
          : <ChevronLeft className="w-3 h-3 text-sidebar-foreground/70" aria-hidden="true" />
        }
      </button>
    </aside>
  )

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:block relative flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="relative w-64 h-full">
            <SidebarContent />
            <button onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="absolute top-4 right-4 p-1 rounded-lg hover:bg-sidebar-accent">
              <X className="w-4 h-4 text-sidebar-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-4 md:px-6 py-3 bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-30" role="banner">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* ✅ Global search with dropdown */}
          <GlobalSearch />

          <div className="flex items-center gap-2 ml-auto">
            <OnlineStatus />
            <FarmAvatar logoUrl={orgLogoUrl} farmName={orgName} />
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="flex-1 overflow-y-auto" tabIndex={-1}>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg">
            Skip to main content
          </a>
          {children}
        </main>
      </div>
    </div>
  )
}