
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, Clock, AlertTriangle, Loader2, ClipboardList,
  RefreshCw, Circle, Zap, Beef, Stethoscope, Syringe, Wrench,
  Egg, Droplets, AlertCircle, CheckCheck, PlayCircle, XCircle, Filter
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Animal { id: string; name: string; type: string; identificationId?: string }
interface Task {
  id: string; title: string; description?: string; category: string
  status: string; priority: string; animal?: Animal
  dueDate?: string; completedAt?: string; notes?: string
  createdByName?: string; createdAt: string
}

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300',
  HIGH:   'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300',
  LOW:    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400',
}
const STATUS_STYLES: Record<string, string> = {
  PENDING:     'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  IN_PROGRESS: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  DONE:        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  OVERDUE:     'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  CANCELLED:   'bg-gray-50 text-gray-500 dark:bg-gray-900/40 dark:text-gray-400',
}
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  FEEDING: Beef, CLEANING: Droplets, MEDICATION: Stethoscope,
  VACCINATION: Syringe, INSPECTION: ClipboardList,
  BREEDING: Egg, EQUIPMENT: Wrench, OTHER: Circle,
}
const STATUS_ACTIONS: Record<string, { next: string; label: string; icon: React.ElementType }[]> = {
  PENDING:     [{ next: 'IN_PROGRESS', label: 'Start', icon: PlayCircle }],
  IN_PROGRESS: [{ next: 'DONE', label: 'Mark Done', icon: CheckCheck }],
  OVERDUE:     [{ next: 'IN_PROGRESS', label: 'Start', icon: PlayCircle }, { next: 'DONE', label: 'Mark Done', icon: CheckCheck }],
  DONE: [], CANCELLED: [],
}

function formatDue(dateStr?: string) {
  if (!dateStr) return { label: 'No due date', urgent: false, overdue: false }
  const d = new Date(dateStr), now = new Date()
  const diffH = (d.getTime() - now.getTime()) / 3600000
  if (diffH < 0) return { label: `Overdue ${Math.abs(Math.round(diffH / 24))}d`, urgent: false, overdue: true }
  if (diffH < 4) return { label: `Due in ${Math.round(diffH)}h`, urgent: true, overdue: false }
  if (diffH < 24) return { label: `Due today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, urgent: true, overdue: false }
  const days = Math.round(diffH / 24)
  if (days === 1) return { label: 'Due tomorrow', urgent: false, overdue: false }
  return { label: `Due ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`, urgent: false, overdue: false }
}

export default function WorkerDashboardPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'OVERDUE' | 'DONE'>('ALL')
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchTasks = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }
      const res = await fetch('/api/tasks?assignedToMe=true', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.status === 401) { router.push('/login'); return }
      if (!res.ok) throw new Error('Failed to load tasks')
      const data = await res.json()
      setTasks(data.tasks)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setUpdating(taskId)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const data = await res.json()
      setTasks(prev => prev.map(t => t.id === taskId ? data.task : t))
      showToast(newStatus === 'DONE' ? '✓ Task completed!' : 'Task updated')
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setUpdating(null)
    }
  }

  const stats = {
    total: tasks.length,
    overdue: tasks.filter(t => t.status === 'OVERDUE').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    done: tasks.filter(t => t.status === 'DONE').length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
  }

  const filtered = filter === 'ALL'
    ? tasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED')
    : tasks.filter(t => t.status === filter)

  const sorted = [...filtered].sort((a, b) => {
    const pOrd: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1
    if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1
    return (pOrd[a.priority] ?? 4) - (pOrd[b.priority] ?? 4)
  })

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto animate-pulse">
          <ClipboardList className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Loading your tasks…</p>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-up
          ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-destructive text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="animate-fade-up">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="w-5 h-5 text-primary" />
              <span className="text-xs font-semibold tracking-widest uppercase text-primary">Worker Dashboard</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">Track and complete your assigned work</p>
          </div>
          <button onClick={fetchTasks} className="p-2.5 rounded-xl border border-border hover:bg-muted transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up" style={{ animationDelay: '60ms' }}>
        {[
          { label: 'Overdue', value: stats.overdue, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', icon: AlertTriangle },
          { label: 'In Progress', value: stats.inProgress, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30', icon: Zap },
          { label: 'Pending', value: stats.pending, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', icon: Clock },
          { label: 'Completed', value: stats.done, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: CheckCircle2 },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 border border-border`}>
            <Icon className={`w-4 h-4 ${color} mb-2`} />
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {stats.overdue > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl animate-fade-up">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {stats.overdue} overdue task{stats.overdue > 1 ? 's' : ''} need attention
            </p>
            <p className="text-xs text-red-600/70 mt-0.5">Please complete or notify your manager.</p>
          </div>
          <button onClick={() => setFilter('OVERDUE')}
            className="ml-auto text-xs font-semibold text-red-700 dark:text-red-400 hover:underline flex-shrink-0">
            View all
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 animate-fade-up" style={{ animationDelay: '120ms' }}>
        <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        {(['ALL', 'OVERDUE', 'IN_PROGRESS', 'PENDING', 'DONE'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors
              ${filter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {f === 'ALL' ? 'Active' : f.replace('_', ' ')}
            {f === 'OVERDUE' && stats.overdue > 0 && (
              <span className="ml-1.5 bg-red-500 text-white rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px]">
                {stats.overdue}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task list */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-2xl border border-dashed border-border animate-fade-up">
          <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mb-4">
            <CheckCircle2 className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-semibold">{filter === 'ALL' ? 'No active tasks' : `No ${filter.replace('_', ' ').toLowerCase()} tasks`}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === 'ALL' ? 'Check back later or ask your manager to assign work.' : 'All clear in this category!'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((task, i) => {
            const Icon = CATEGORY_ICONS[task.category] || Circle
            const { label: dueLabel, urgent, overdue: isDuePast } = formatDue(task.dueDate)
            const actions = STATUS_ACTIONS[task.status] || []
            const isUpdating = updating === task.id

            return (
              <li key={task.id}
                className={`animate-fade-up bg-card border rounded-2xl p-4 sm:p-5 shadow-sm transition-all hover:shadow-md
                  ${task.status === 'OVERDUE' ? 'border-red-200 dark:border-red-800/60' : 'border-border hover:border-primary/20'}`}
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}>

                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5
                    ${task.status === 'OVERDUE' ? 'bg-red-100 dark:bg-red-950/40' : 'bg-muted'}`}>
                    <Icon className={`w-5 h-5 ${task.status === 'OVERDUE' ? 'text-red-600' : 'text-muted-foreground'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[task.priority]}`}>
                        {task.priority}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[task.status]}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      {task.animal && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          🐄 {task.animal.name}{task.animal.identificationId ? ` #${task.animal.identificationId}` : ''}
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-sm leading-tight">{task.title}</h3>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className={`flex items-center gap-1 text-xs font-medium
                        ${isDuePast ? 'text-red-600 dark:text-red-400' : urgent ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>
                        <Clock className="w-3 h-3" />{dueLabel}
                      </span>
                      {task.createdByName && (
                        <span className="text-xs text-muted-foreground">Assigned by {task.createdByName}</span>
                      )}
                    </div>

                    {task.notes && (
                      <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/40 rounded-lg border border-border">
                        📝 {task.notes}
                      </p>
                    )}
                  </div>
                </div>

                {actions.length > 0 && (
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                    {actions.map(({ next, label, icon: ActionIcon }) => (
                      <button key={next} onClick={() => handleStatusChange(task.id, next)}
                        disabled={isUpdating}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50
                          ${next === 'DONE'
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-500/20'
                            : 'bg-primary text-primary-foreground hover:opacity-90 shadow-sm shadow-primary/20'}`}>
                        {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ActionIcon className="w-3.5 h-3.5" />}
                        {label}
                      </button>
                    ))}
                    {task.status === 'IN_PROGRESS' && (
                      <button onClick={() => handleStatusChange(task.id, 'PENDING')} disabled={isUpdating}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors">
                        <XCircle className="w-3.5 h-3.5" />Pause
                      </button>
                    )}
                  </div>
                )}

                {task.status === 'DONE' && task.completedAt && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs text-emerald-600 font-medium">
                      Completed {new Date(task.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <div className="h-8" />
    </div>
  )
}


