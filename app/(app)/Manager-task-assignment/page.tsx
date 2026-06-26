'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardList, Plus, X, Loader2, Users, Calendar,
  AlertCircle, CheckCircle2, RefreshCw, Trash2, Filter,
  Beef, Stethoscope, Syringe, Wrench, Egg, Droplets, Circle,
  History, ChevronDown, ChevronUp, Save, Pencil
} from 'lucide-react'

interface Worker { id: string; name: string; role: string; email: string }
interface Animal { id: string; name: string; type: string; identificationId?: string }
interface Task {
  id: string; title: string; description?: string; category: string
  status: string; priority: string; dueDate?: string; notes?: string
  createdAt: string; completedAt?: string
  assignedTo?: { id: string; name: string }
  animal?: Animal
}

const PRIORITY_STYLES: Record<string, string> = {
  URGENT:  'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300',
  HIGH:    'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300',
  MEDIUM:  'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300',
  LOW:     'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
}
const STATUS_STYLES: Record<string, string> = {
  PENDING:     'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  IN_PROGRESS: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  DONE:        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  OVERDUE:     'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  CANCELLED:   'bg-gray-100 text-gray-500',
}
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  FEEDING: Beef, CLEANING: Droplets, MEDICATION: Stethoscope,
  VACCINATION: Syringe, INSPECTION: ClipboardList,
  BREEDING: Egg, EQUIPMENT: Wrench, OTHER: Circle,
}

// ─── Create Task Modal ────────────────────────────────────────────────────────
function CreateTaskModal({ workers, animals, onClose, onCreated }: {
  workers: Worker[]; animals: Animal[]
  onClose: () => void; onCreated: (t: Task) => void
}) {
  const [form, setForm] = useState({
    title: '', description: '', category: 'OTHER', priority: 'MEDIUM',
    assignedToId: '', animalId: '', dueDate: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSubmit = async () => {
    if (!form.title.trim()) { setErr('Title is required'); return }
    setSaving(true); setErr('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          assignedToId: form.assignedToId || undefined,
          animalId: form.animalId || undefined,
          dueDate: form.dueDate || undefined,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const data = await res.json()
      onCreated(data.task)
      onClose()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="font-bold text-lg">Assign Task</h2>
            <p className="text-xs text-muted-foreground">Create and assign work to a team member</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {err && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{err}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Task Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Feed pen 3 cattle, morning medication…"
              className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="Additional instructions…"
              className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                {['FEEDING','CLEANING','MEDICATION','VACCINATION','INSPECTION','BREEDING','EQUIPMENT','OTHER'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              <Users className="w-3 h-3 inline mr-1" />Assign To
            </label>
            <select value={form.assignedToId} onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}
              className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Unassigned</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Linked Animal</label>
            <select value={form.animalId} onChange={e => setForm(f => ({ ...f, animalId: e.target.value }))}
              className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">No animal</option>
              {animals.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.type}){a.identificationId ? ` #${a.identificationId}` : ''}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />Due Date & Time
              </label>
              <input type="datetime-local" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Notes for Worker</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="Any specific instructions…"
              className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-5 py-4 flex gap-3 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Creating…' : 'Assign Task'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Task Modal (managers can edit every field) ──────────────────────────
function EditTaskModal({ task, workers, animals, onClose, onSaved }: {
  task: Task; workers: Worker[]; animals: Animal[]
  onClose: () => void; onSaved: (t: Task) => void
}) {
  const [form, setForm] = useState({
    title: task.title,
    description: task.description || '',
    category: task.category,
    priority: task.priority,
    status: task.status,
    assignedToId: task.assignedTo?.id || '',
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
    notes: task.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSubmit = async () => {
    if (!form.title.trim()) { setErr('Title is required'); return }
    setSaving(true); setErr('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
          priority: form.priority,
          status: form.status,
          assignedToId: form.assignedToId || null,
          dueDate: form.dueDate || null,
          notes: form.notes,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const data = await res.json()
      onSaved(data.task)
      onClose()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="font-bold text-lg">Edit Task</h2>
            <p className="text-xs text-muted-foreground">Update any field on this task</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {err && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{err}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Task Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                {['FEEDING','CLEANING','MEDICATION','VACCINATION','INSPECTION','BREEDING','EQUIPMENT','OTHER'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
              {['PENDING','IN_PROGRESS','DONE','OVERDUE','CANCELLED'].map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              <Users className="w-3 h-3 inline mr-1" />Assign To
            </label>
            <select value={form.assignedToId} onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}
              className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Unassigned</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              <Calendar className="w-3 h-3 inline mr-1" />Due Date & Time
            </label>
            <input type="datetime-local" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            <p className="text-[10px] text-muted-foreground mt-1">Editing this replaces the full notes/activity log.</p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-5 py-4 flex gap-3 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ManagerTasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [animals, setAnimals] = useState<Animal[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [filterWorker, setFilterWorker] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const fetchAll = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }

      const [tasksRes, membersRes, animalsRes] = await Promise.all([
        fetch('/api/tasks', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/organization/members', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/animals', { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (tasksRes.status === 401) { router.push('/login'); return }

      const [tasksData, membersData, animalsData] = await Promise.all([
        tasksRes.json(), membersRes.json(), animalsRes.json()
      ])

      setTasks(tasksData.tasks || [])
      setWorkers((membersData.members || []).filter((m: Worker) => ['WORKER', 'VETERINARIAN', 'MANAGER'].includes(m.role)))
      setAnimals(animalsData.animals || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleDelete = async (taskId: string) => {
    if (!confirm('Delete this task?')) return
    setDeleting(taskId)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to delete') }
      setTasks(prev => prev.filter(t => t.id !== taskId))
      showToast('Task deleted')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeleting(null)
    }
  }

  const stats = {
    total: tasks.length,
    overdue: tasks.filter(t => t.status === 'OVERDUE').length,
    done: tasks.filter(t => t.status === 'DONE').length,
    active: tasks.filter(t => t.status === 'IN_PROGRESS').length,
  }

  const filtered = tasks
    .filter(t => filterWorker === 'ALL' || t.assignedTo?.id === filterWorker)
    .filter(t => filterStatus === 'ALL' || t.status === filterStatus)
    .sort((a, b) => {
      const pOrd: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
      const sOrd: Record<string, number> = { OVERDUE: 0, IN_PROGRESS: 1, PENDING: 2, DONE: 3, CANCELLED: 4 }
      const sd = (sOrd[a.status] ?? 5) - (sOrd[b.status] ?? 5)
      if (sd !== 0) return sd
      return (pOrd[a.priority] ?? 4) - (pOrd[b.priority] ?? 4)
    })

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto animate-pulse">
          <ClipboardList className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Loading tasks…</p>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">

      {showModal && (
        <CreateTaskModal
          workers={workers}
          animals={animals}
          onClose={() => setShowModal(false)}
          onCreated={t => { setTasks(prev => [t, ...prev]); showToast('Task created!') }}
        />
      )}

      {editTask && (
        <EditTaskModal
          task={editTask}
          workers={workers}
          animals={animals}
          onClose={() => setEditTask(null)}
          onSaved={t => { setTasks(prev => prev.map(x => x.id === t.id ? t : x)); showToast('Task updated!') }}
        />
      )}

      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-emerald-600 text-white animate-fade-up">
          <CheckCircle2 className="w-4 h-4" />{toast}
        </div>
      )}

      {/* Header */}
      <header className="animate-fade-up">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="w-5 h-5 text-primary" />
              <span className="text-xs font-semibold tracking-widest uppercase text-primary">Manager</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Task Management</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">Assign, monitor and manage work across your team</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAll} className="p-2.5 rounded-xl border border-border hover:bg-muted transition-colors">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shadow-sm shadow-primary/20">
              <Plus className="w-4 h-4" />Assign Task
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up" style={{ animationDelay: '60ms' }}>
        {[
          { label: 'Total Tasks', value: stats.total, color: 'text-foreground', bg: 'bg-muted/60', icon: ClipboardList },
          { label: 'Overdue', value: stats.overdue, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', icon: AlertCircle },
          { label: 'In Progress', value: stats.active, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30', icon: RefreshCw },
          { label: 'Done', value: stats.done, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: CheckCircle2 },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 border border-border`}>
            <Icon className={`w-4 h-4 ${color} mb-2`} />
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 animate-fade-up" style={{ animationDelay: '120ms' }}>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select value={filterWorker} onChange={e => setFilterWorker(e.target.value)}
            className="border border-input rounded-xl px-3 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="ALL">All workers</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          {(['ALL', 'OVERDUE', 'IN_PROGRESS', 'PENDING', 'DONE'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors
                ${filterStatus === s ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {s === 'ALL' ? 'All Status' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Task table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-2xl border border-dashed border-border animate-fade-up">
          <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mb-4">
            <ClipboardList className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-semibold">No tasks found</p>
          <p className="text-sm text-muted-foreground mt-1">Assign a task to get started.</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm">
            <Plus className="w-4 h-4" />Assign First Task
          </button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((task, i) => {
            const Icon = CATEGORY_ICONS[task.category] || Circle
            const isDue = task.dueDate ? new Date(task.dueDate) < new Date() && task.status !== 'DONE' && task.status !== 'CANCELLED' : false
            const notesExpanded = expandedNotes === task.id
            return (
              <li key={task.id}
                className={`animate-fade-up flex flex-col gap-2 p-4 bg-card border rounded-2xl hover:shadow-sm transition-all
                  ${task.status === 'OVERDUE' ? 'border-red-200 dark:border-red-800/60' : 'border-border hover:border-primary/20'}`}
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'forwards' }}>

                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                    ${task.status === 'OVERDUE' ? 'bg-red-100 dark:bg-red-950/40' : 'bg-muted'}`}>
                    <Icon className={`w-4 h-4 ${task.status === 'OVERDUE' ? 'text-red-600' : 'text-muted-foreground'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${PRIORITY_STYLES[task.priority]}`}>
                        {task.priority}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_STYLES[task.status]}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      {task.notes?.includes('🚧 Blocker') && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300">
                          BLOCKER
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold truncate">{task.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      {task.assignedTo ? (
                        <span className="text-xs text-muted-foreground">→ {task.assignedTo.name}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                      )}
                      {task.animal && (
                        <span className="text-xs text-muted-foreground">· 🐄 {task.animal.name}</span>
                      )}
                      {task.dueDate && (
                        <span className={`text-xs font-medium flex items-center gap-1 ${isDue ? 'text-red-600' : 'text-muted-foreground'}`}>
                          <Calendar className="w-3 h-3" />
                          {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  <button onClick={() => setEditTask(task)}
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors flex-shrink-0">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(task.id)} disabled={deleting === task.id}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0">
                    {deleting === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>

                {task.notes && (
                  <div className="pl-12">
                    <button
                      onClick={() => setExpandedNotes(notesExpanded ? null : task.id)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <History className="w-3 h-3" />
                      {notesExpanded ? 'Hide' : 'View'} notes & worker updates
                      {notesExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {notesExpanded && (
                      <p className="text-xs text-muted-foreground mt-1.5 p-2.5 bg-muted/40 rounded-lg border border-border whitespace-pre-line">
                        {task.notes}
                      </p>
                    )}
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