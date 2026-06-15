
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Stethoscope, AlertTriangle, Loader2, RefreshCw, CheckCircle2,
  AlertCircle, Activity, Clock, HeartPulse, Pill, ClipboardCheck,
  ChevronDown, ChevronUp, Plus, X, Save, Thermometer, Weight,
  Shield, ListChecks, CheckCheck
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Animal {
  id: string; name: string; type: string; breed?: string
  identificationId?: string; healthStatus: string
  gender?: string; dateOfBirth?: string; location?: string
}

interface RecoveryStep { step: string; done: boolean; doneAt?: string }

interface Treatment {
  id: string; condition: string; status: string; priority: string
  medication?: string; dosage?: string; frequency?: string; route?: string
  temperature?: number; weight?: number
  isolationRequired: boolean; isolationLocation?: string
  followUpDate?: string; endDate?: string; startDate: string
  completedAt?: string; notes?: string
  steps?: RecoveryStep[]
  animal: Animal
  updatedBy?: { id: string; name: string }
  createdAt: string; updatedAt: string
}

// ─── Helpers
const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300',
  HIGH:     'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300',
  MEDIUM:   'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300',
  LOW:      'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
}
const HEALTH_STYLES: Record<string, string> = {
  SICK:       'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  INJURED:    'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  RECOVERING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300',
  HEALTHY:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
}
const STATUS_STYLES: Record<string, string> = {
  PENDING:     'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300',
  IN_PROGRESS: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300',
  COMPLETED:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
  CANCELLED:   'bg-gray-50 text-gray-500',
}

// ─── New Treatment Form 
function NewTreatmentModal({
  animals, onClose, onCreated,
}: {
  animals: Animal[]
  onClose: () => void
  onCreated: (t: Treatment) => void
}) {
  const [form, setForm] = useState({
    animalId: '', condition: '', priority: 'MEDIUM',
    startDate: new Date().toISOString().split('T')[0],
    medication: '', dosage: '', frequency: '', route: '',
    isolationRequired: false, isolationLocation: '',
    followUpDate: '', notes: '',
    steps: [{ step: '', done: false }] as RecoveryStep[],
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const addStep = () => setForm(f => ({ ...f, steps: [...f.steps, { step: '', done: false }] }))
  const removeStep = (i: number) => setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }))
  const updateStep = (i: number, val: string) =>
    setForm(f => ({ ...f, steps: f.steps.map((s, idx) => idx === i ? { ...s, step: val } : s) }))

  const handleSubmit = async () => {
    if (!form.animalId || !form.condition) { setErr('Animal and condition are required'); return }
    setSaving(true); setErr('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/vet/treatments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          steps: form.steps.filter(s => s.step.trim()),
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const data = await res.json()
      onCreated(data.treatment)
      onClose()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="font-bold text-lg">New Treatment</h2>
            <p className="text-xs text-muted-foreground">Start tracking a sick or injured animal</p>
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
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Animal *
            </label>
            <select
              value={form.animalId}
              onChange={e => setForm(f => ({ ...f, animalId: e.target.value }))}
              className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select animal…</option>
              {animals.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type}){a.identificationId ? ` — #${a.identificationId}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Condition / Diagnosis *
            </label>
            <input
              value={form.condition}
              onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
              placeholder="e.g. East Coast Fever, foot-and-mouth, mastitis…"
              className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Start Date</label>
              <input type="date" value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Medication</label>
              <input value={form.medication} onChange={e => setForm(f => ({ ...f, medication: e.target.value }))}
                placeholder="Drug name"
                className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Dosage</label>
              <input value={form.dosage} onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))}
                placeholder="e.g. 5ml/kg"
                className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Frequency</label>
              <input value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                placeholder="e.g. Twice daily"
                className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Route</label>
              <input value={form.route} onChange={e => setForm(f => ({ ...f, route: e.target.value }))}
                placeholder="e.g. IM, IV, oral"
                className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border border-border rounded-xl">
            <input type="checkbox" id="isolation" checked={form.isolationRequired}
              onChange={e => setForm(f => ({ ...f, isolationRequired: e.target.checked }))}
              className="w-4 h-4 accent-primary" />
            <label htmlFor="isolation" className="text-sm font-medium flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-orange-500" /> Isolation Required
            </label>
            {form.isolationRequired && (
              <input value={form.isolationLocation} onChange={e => setForm(f => ({ ...f, isolationLocation: e.target.value }))}
                placeholder="Location…" className="flex-1 border border-input rounded-lg px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
            )}
          </div>

          {/* Recovery Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <ListChecks className="w-3.5 h-3.5" />Recovery Steps
              </label>
              <button onClick={addStep} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" />Add step
              </button>
            </div>
            <div className="space-y-2">
              {form.steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0">{i + 1}.</span>
                  <input value={s.step} onChange={e => updateStep(i, e.target.value)}
                    placeholder={`Step ${i + 1}…`}
                    className="flex-1 border border-input rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                  {form.steps.length > 1 && (
                    <button onClick={() => removeStep(i)} className="p-1 hover:text-destructive text-muted-foreground transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Follow-up Date</label>
            <input type="date" value={form.followUpDate} onChange={e => setForm(f => ({ ...f, followUpDate: e.target.value }))}
              className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="Additional observations…"
              className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-5 py-4 flex gap-3 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Start Treatment'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Treatment Card ───────────────────────────────────────────────────────────
function TreatmentCard({ treatment, onUpdate }: { treatment: Treatment; onUpdate: (t: Treatment) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localSteps, setLocalSteps] = useState<RecoveryStep[]>(treatment.steps || [])
  const [editNotes, setEditNotes] = useState(treatment.notes || '')
  const [editMed, setEditMed] = useState(treatment.medication || '')
  const [editDosage, setEditDosage] = useState(treatment.dosage || '')
  const [editFreq, setEditFreq] = useState(treatment.frequency || '')
  const [editFollowUp, setEditFollowUp] = useState(treatment.followUpDate?.split('T')[0] || '')
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const toggleStep = (i: number) => {
    setLocalSteps(prev => prev.map((s, idx) =>
      idx === i ? { ...s, done: !s.done, doneAt: !s.done ? new Date().toISOString() : undefined } : s
    ))
  }

  const handleSave = async (extraData?: Record<string, any>) => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/vet/treatments/${treatment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          steps: localSteps,
          notes: editNotes,
          medication: editMed,
          dosage: editDosage,
          frequency: editFreq,
          followUpDate: editFollowUp || null,
          ...extraData,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const data = await res.json()
      onUpdate(data.treatment)
      setEditing(false)
      showToast('✓ Treatment updated')
    } catch (e: any) {
      showToast('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = () => handleSave({ status: 'COMPLETED' })

  const stepsCompleted = localSteps.filter(s => s.done).length
  const stepsTotal = localSteps.length
  const progressPct = stepsTotal > 0 ? Math.round((stepsCompleted / stepsTotal) * 100) : 0

  return (
    <li className={`bg-card border rounded-2xl shadow-sm transition-all
      ${treatment.priority === 'CRITICAL' ? 'border-red-300 dark:border-red-800' :
        treatment.priority === 'HIGH' ? 'border-orange-200 dark:border-orange-800/60' : 'border-border'}`}>

      {toast && (
        <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />{toast}
        </div>
      )}

      {/* Card header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
            ${treatment.status === 'COMPLETED' ? 'bg-emerald-100 dark:bg-emerald-950/40' :
              treatment.priority === 'CRITICAL' ? 'bg-red-100 dark:bg-red-950/40' : 'bg-muted'}`}>
            <HeartPulse className={`w-5 h-5
              ${treatment.status === 'COMPLETED' ? 'text-emerald-600' :
                treatment.priority === 'CRITICAL' ? 'text-red-600' : 'text-primary'}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[treatment.priority]}`}>
                {treatment.priority}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[treatment.status]}`}>
                {treatment.status.replace('_', ' ')}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${HEALTH_STYLES[treatment.animal.healthStatus] || 'bg-muted text-muted-foreground'}`}>
                {treatment.animal.healthStatus}
              </span>
            </div>

            <h3 className="font-bold text-sm">{treatment.animal.name}
              {treatment.animal.identificationId && (
                <span className="text-muted-foreground font-normal"> #{treatment.animal.identificationId}</span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">{treatment.animal.type}{treatment.animal.breed ? ` · ${treatment.animal.breed}` : ''}</p>
            <p className="text-sm font-semibold mt-1.5 text-foreground/90">{treatment.condition}</p>

            {/* Progress bar for steps */}
            {stepsTotal > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">Recovery progress</span>
                  <span className="text-[10px] font-semibold text-muted-foreground">{stepsCompleted}/{stepsTotal}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            )}
          </div>

          <button onClick={() => setExpanded(e => !e)}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors flex-shrink-0">
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border px-4 sm:px-5 pb-5 pt-4 space-y-4">

          {/* Quick info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {treatment.temperature && (
              <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-xl">
                <Thermometer className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Temp</p>
                  <p className="text-xs font-semibold">{treatment.temperature}°C</p>
                </div>
              </div>
            )}
            {treatment.weight && (
              <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-xl">
                <Weight className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Weight</p>
                  <p className="text-xs font-semibold">{treatment.weight} kg</p>
                </div>
              </div>
            )}
            {treatment.followUpDate && (
              <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-xl">
                <Clock className="w-4 h-4 text-violet-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Follow-up</p>
                  <p className="text-xs font-semibold">{new Date(treatment.followUpDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                </div>
              </div>
            )}
            {treatment.isolationRequired && (
              <div className="flex items-center gap-2 p-2.5 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-800/40">
                <Shield className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-orange-600 font-semibold">Isolation</p>
                  <p className="text-xs text-muted-foreground">{treatment.isolationLocation || 'Yes'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Prescription / medication */}
          {editing ? (
            <div className="space-y-3 p-3 bg-muted/30 rounded-xl border border-border">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5" />Prescription
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input value={editMed} onChange={e => setEditMed(e.target.value)}
                  placeholder="Medication…"
                  className="border border-input rounded-lg px-2.5 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                <input value={editDosage} onChange={e => setEditDosage(e.target.value)}
                  placeholder="Dosage…"
                  className="border border-input rounded-lg px-2.5 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                <input value={editFreq} onChange={e => setEditFreq(e.target.value)}
                  placeholder="Frequency…"
                  className="border border-input rounded-lg px-2.5 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                <input type="date" value={editFollowUp} onChange={e => setEditFollowUp(e.target.value)}
                  className="border border-input rounded-lg px-2.5 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                rows={2} placeholder="Clinical notes…"
                className="w-full border border-input rounded-lg px-2.5 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>
          ) : (
            (editMed || treatment.medication) && (
              <div className="p-3 bg-muted/30 rounded-xl border border-border">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5" />Prescription
                </p>
                <div className="space-y-1">
                  {(editMed || treatment.medication) && (
                    <p className="text-xs"><span className="text-muted-foreground">Drug: </span><span className="font-medium">{editMed || treatment.medication}</span></p>
                  )}
                  {(editDosage || treatment.dosage) && (
                    <p className="text-xs"><span className="text-muted-foreground">Dosage: </span><span className="font-medium">{editDosage || treatment.dosage}</span></p>
                  )}
                  {(editFreq || treatment.frequency) && (
                    <p className="text-xs"><span className="text-muted-foreground">Frequency: </span><span className="font-medium">{editFreq || treatment.frequency}</span></p>
                  )}
                  {treatment.route && (
                    <p className="text-xs"><span className="text-muted-foreground">Route: </span><span className="font-medium">{treatment.route}</span></p>
                  )}
                </div>
              </div>
            )
          )}

          {/* Recovery steps checklist */}
          {localSteps.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <ListChecks className="w-3.5 h-3.5" />Recovery Steps
                <span className="ml-auto text-primary font-bold">{progressPct}%</span>
              </p>
              <ul className="space-y-1.5">
                {localSteps.map((s, i) => (
                  <li key={i}
                    onClick={() => treatment.status !== 'COMPLETED' && toggleStep(i)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all
                      ${s.done
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                        : 'bg-muted/30 border-border hover:border-primary/30 hover:bg-muted/50'}
                      ${treatment.status === 'COMPLETED' ? 'cursor-default' : ''}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                      ${s.done ? 'bg-emerald-600 border-emerald-600' : 'border-muted-foreground/40'}`}>
                      {s.done && <CheckCheck className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-xs flex-1 ${s.done ? 'line-through text-muted-foreground' : ''}`}>{s.step}</span>
                    {s.done && s.doneAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(s.doneAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Notes */}
          {!editing && (editNotes || treatment.notes) && (
            <div className="p-3 bg-muted/30 rounded-xl border border-border">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
              <p className="text-xs leading-relaxed">{editNotes || treatment.notes}</p>
            </div>
          )}

          {/* Actions */}
          {treatment.status !== 'COMPLETED' && treatment.status !== 'CANCELLED' && (
            <div className="flex flex-wrap gap-2 pt-1">
              {editing ? (
                <>
                  <button onClick={() => handleSave()} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 shadow-sm">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Changes
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors">
                    <X className="w-3.5 h-3.5" />Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors">
                    <ClipboardCheck className="w-3.5 h-3.5" />Update Notes / Prescription
                  </button>
                  {stepsTotal > 0 && (
                    <button onClick={() => handleSave()} disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 disabled:opacity-50 shadow-sm">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                      Save Progress
                    </button>
                  )}
                  <button onClick={handleComplete} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 shadow-sm shadow-emerald-500/20">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                    Mark Recovered
                  </button>
                </>
              )}
            </div>
          )}

          {treatment.status === 'COMPLETED' && treatment.completedAt && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Animal marked recovered on {new Date(treatment.completedAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VetDashboardPage() {
  const router = useRouter()
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [sickAnimals, setSickAnimals] = useState<Animal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'PENDING' | 'COMPLETED'>('ALL')

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }
      const res = await fetch('/api/vet/treatments', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.status === 401) { router.push('/login'); return }
      if (!res.ok) throw new Error('Failed to load data')
      const data = await res.json()
      setTreatments(data.treatments)
      setSickAnimals(data.sickAnimals)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  const handleTreatmentCreated = (t: Treatment) => {
    setTreatments(prev => [t, ...prev])
    setSickAnimals(prev => prev.filter(a => a.id !== t.animal.id))
  }
  const handleTreatmentUpdated = (updated: Treatment) => {
    setTreatments(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  const stats = {
    critical: treatments.filter(t => t.priority === 'CRITICAL' && t.status !== 'COMPLETED').length,
    active: treatments.filter(t => t.status === 'IN_PROGRESS').length,
    pending: treatments.filter(t => t.status === 'PENDING').length,
    recovered: treatments.filter(t => t.status === 'COMPLETED').length,
    needAttention: sickAnimals.length,
  }

  const filtered = statusFilter === 'ALL'
    ? treatments
    : treatments.filter(t => t.status === statusFilter)

  const sorted = [...filtered].sort((a, b) => {
    const pOrd: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    const sOrd: Record<string, number> = { IN_PROGRESS: 0, PENDING: 1, COMPLETED: 2, CANCELLED: 3 }
    const sDiff = (sOrd[a.status] ?? 4) - (sOrd[b.status] ?? 4)
    if (sDiff !== 0) return sDiff
    return (pOrd[a.priority] ?? 4) - (pOrd[b.priority] ?? 4)
  })

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto animate-pulse">
          <Stethoscope className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Loading veterinary data…</p>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">

      {showNewModal && (
        <NewTreatmentModal
          animals={[...sickAnimals, ...treatments.map(t => t.animal)].filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i)}
          onClose={() => setShowNewModal(false)}
          onCreated={handleTreatmentCreated}
        />
      )}

      {/* Header */}
      <header className="animate-fade-up">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Stethoscope className="w-5 h-5 text-primary" />
              <span className="text-xs font-semibold tracking-widest uppercase text-primary">Veterinary Dashboard</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Treatment Centre</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">Monitor sick animals, manage treatments & track recovery</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="p-2.5 rounded-xl border border-border hover:bg-muted transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shadow-sm shadow-primary/20">
              <Plus className="w-4 h-4" />New Treatment
            </button>
          </div>
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
          { label: 'Critical', value: stats.critical, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', icon: AlertTriangle },
          { label: 'Active', value: stats.active, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30', icon: Activity },
          { label: 'Need Attention', value: stats.needAttention, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30', icon: HeartPulse },
          { label: 'Recovered', value: stats.recovered, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: CheckCircle2 },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 border border-border`}>
            <Icon className={`w-4 h-4 ${color} mb-2`} />
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Sick animals needing treatment */}
      {sickAnimals.length > 0 && (
        <div className="animate-fade-up p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                {sickAnimals.length} animal{sickAnimals.length > 1 ? 's' : ''} need a treatment plan
              </p>
            </div>
            <button onClick={() => setShowNewModal(true)}
              className="text-xs font-semibold text-orange-700 dark:text-orange-400 hover:underline">
              Create treatment →
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {sickAnimals.map(a => (
              <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-card rounded-xl border border-orange-200 dark:border-orange-800/40 text-xs">
                <span className={`w-2 h-2 rounded-full flex-shrink-0
                  ${a.healthStatus === 'SICK' ? 'bg-red-500' : a.healthStatus === 'INJURED' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                <span className="font-medium">{a.name}</span>
                <span className="text-muted-foreground">· {a.type}</span>
                <span className={`font-semibold ${HEALTH_STYLES[a.healthStatus]} px-1.5 py-0.5 rounded-md text-[10px]`}>
                  {a.healthStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 animate-fade-up">
        {(['ALL', 'IN_PROGRESS', 'PENDING', 'COMPLETED'] as const).map(f => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors
              ${statusFilter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {f === 'ALL' ? 'All Cases' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Treatment list */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/30 rounded-2xl border border-dashed border-border animate-fade-up">
          <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mb-4">
            <Stethoscope className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-semibold">No treatments found</p>
          <p className="text-sm text-muted-foreground mt-1">Start a new treatment when an animal needs care.</p>
          <button onClick={() => setShowNewModal(true)}
            className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm">
            <Plus className="w-4 h-4" />New Treatment
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((t, i) => (
            <div key={t.id} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}>
              <TreatmentCard treatment={t} onUpdate={handleTreatmentUpdated} />
            </div>
          ))}
        </ul>
      )}

      <div className="h-8" />
    </div>
  )
}

