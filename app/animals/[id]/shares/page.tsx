'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Copy, Check, Shield, Eye, Clock, Globe,
  Lock, UserCheck, Trash2, RefreshCw, AlertTriangle, ChevronRight,
  Activity, FileDown, Users, Key, Calendar, BarChart2, X,
  Filter, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

// ─── Types ──────────────────────────────────────────────────────────────────

interface AnimalShare {
  id: string
  token: string
  shareType: 'PUBLIC' | 'PRIVATE' | 'ROLE_BASED'
  shareRole?: 'VET' | 'INSPECTOR' | 'BUYER' | 'PARTNER' | 'ADMIN'
  label?: string
  expiresAt: string
  isRevoked: boolean
  revokedAt?: string
  viewCount: number
  lastAccessedAt?: string
  createdAt: string
  passwordHash?: string
  allowedEmails: string[]
  canViewHealth: boolean
  canViewBreeding: boolean
  canViewVeterinary: boolean
  canViewFinancials: boolean
  canViewLineage: boolean
  canViewCertificates: boolean
  creator: { name: string; email: string }
}

interface AccessLog {
  id: string
  ip?: string
  userAgent?: string
  accessedAt: string
  duration?: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr))
}

function shareUrl(token: string) {
  return `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${token}`
}

const TYPE_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  PUBLIC: { label: 'Public', icon: Globe, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
  PRIVATE: { label: 'Private', icon: Lock, cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' },
  ROLE_BASED: { label: 'Role-Based', icon: UserCheck, cls: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800' },
}

const ROLE_META: Record<string, { label: string; cls: string }> = {
  VET: { label: 'Veterinarian', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800' },
  INSPECTOR: { label: 'Inspector', cls: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800' },
  BUYER: { label: 'Buyer/Trader', cls: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800' },
  PARTNER: { label: 'Partner', cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800' },
  ADMIN: { label: 'Admin', cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800' },
}

// ─── Create Share Modal ───────────────────────────────────────────────────────

const PERMISSION_PRESETS: Record<string, Partial<CreateShareForm>> = {
  VET: { canViewHealth: true, canViewVeterinary: true, canViewBreeding: true, canViewCertificates: true },
  INSPECTOR: { canViewHealth: true, canViewCertificates: true, canViewLineage: true },
  BUYER: { canViewHealth: true, canViewLineage: true, canViewBreeding: false },
  PARTNER: { canViewHealth: true, canViewBreeding: true, canViewLineage: true },
  ADMIN: { canViewHealth: true, canViewVeterinary: true, canViewBreeding: true, canViewFinancials: true, canViewLineage: true, canViewCertificates: true },
  PUBLIC: { canViewHealth: true },
}

interface CreateShareForm {
  shareType: 'PUBLIC' | 'PRIVATE' | 'ROLE_BASED'
  shareRole?: string
  label: string
  password: string
  expiresInDays: number
  allowedEmails: string
  canViewHealth: boolean
  canViewBreeding: boolean
  canViewVeterinary: boolean
  canViewFinancials: boolean
  canViewLineage: boolean
  canViewCertificates: boolean
}

function CreateShareModal({ animalId, onCreated, onClose }: {
  animalId: string
  onCreated: (share: AnimalShare) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<CreateShareForm>({
    shareType: 'PUBLIC',
    label: '',
    password: '',
    expiresInDays: 14,
    allowedEmails: '',
    canViewHealth: true,
    canViewBreeding: false,
    canViewVeterinary: false,
    canViewFinancials: false,
    canViewLineage: false,
    canViewCertificates: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key: keyof CreateShareForm, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const applyPreset = (role: string) => {
    const preset = PERMISSION_PRESETS[role] || {}
    setForm(prev => ({
      ...prev,
      canViewHealth: false,
      canViewVeterinary: false,
      canViewBreeding: false,
      canViewFinancials: false,
      canViewLineage: false,
      canViewCertificates: false,
      ...preset,
    }))
  }

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const body: any = {
        shareType: form.shareType,
        shareRole: form.shareRole || undefined,
        label: form.label || undefined,
        expiresInDays: form.expiresInDays,
        allowedEmails: form.allowedEmails ? form.allowedEmails.split(',').map(e => e.trim()).filter(Boolean) : [],
        canViewHealth: form.canViewHealth,
        canViewBreeding: form.canViewBreeding,
        canViewVeterinary: form.canViewVeterinary,
        canViewFinancials: form.canViewFinancials,
        canViewLineage: form.canViewLineage,
        canViewCertificates: form.canViewCertificates,
      }
      if (form.shareType !== 'PUBLIC' && form.password) body.password = form.password

      const res = await fetch(`/api/animals/${animalId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create share')
      }
      const { share } = await res.json()
      onCreated(share)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const perms = [
    { key: 'canViewHealth', label: 'Health Records', desc: 'Vaccinations, treatments, diagnoses' },
    { key: 'canViewVeterinary', label: 'Veterinary Notes', desc: 'Vet examinations, prescriptions' },
    { key: 'canViewBreeding', label: 'Breeding Records', desc: 'Heat cycles, genetics, offspring' },
    { key: 'canViewLineage', label: 'Lineage & Pedigree', desc: 'Family tree, ancestry data' },
    { key: 'canViewCertificates', label: 'Certifications', desc: 'Compliance, health certificates' },
    { key: 'canViewFinancials', label: 'Financial Data', desc: 'Purchase price, valuations' },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Create Share Link</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Configure access and permissions</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Share Type */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Share Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['PUBLIC', 'PRIVATE', 'ROLE_BASED'] as const).map(type => {
                const meta = TYPE_META[type]
                const Icon = meta.icon
                return (
                  <button
                    key={type}
                    onClick={() => {
                      set('shareType', type)
                      if (type === 'PUBLIC') applyPreset('PUBLIC')
                    }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-xs font-medium ${
                      form.shareType === type
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Role (if ROLE_BASED) */}
          {form.shareType === 'ROLE_BASED' && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Assign Role</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(ROLE_META).map(([role, meta]) => (
                  <button
                    key={role}
                    onClick={() => { set('shareRole', role); applyPreset(role) }}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      form.shareRole === role
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    {meta.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Label */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Label (optional)</label>
            <input
              type="text"
              placeholder="e.g. Dr. Sarah's Access, Buyer Preview..."
              value={form.label}
              onChange={e => set('label', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Expiry */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Expires In: <span className="text-foreground">{form.expiresInDays} days</span>
            </label>
            <div className="flex gap-2">
              {[7, 14, 30, 60, 90].map(d => (
                <button
                  key={d}
                  onClick={() => set('expiresInDays', d)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    form.expiresInDays === d
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {/* Password (PRIVATE / ROLE_BASED) */}
          {form.shareType !== 'PUBLIC' && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Password Protection (optional)</label>
              <input
                type="password"
                placeholder="Leave blank for no password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {/* Email restriction */}
          {form.shareType === 'PRIVATE' && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Restrict to Emails (comma-separated)</label>
              <input
                type="text"
                placeholder="vet@clinic.com, buyer@farm.com"
                value={form.allowedEmails}
                onChange={e => set('allowedEmails', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {/* Permissions matrix */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Data Access Permissions</label>
            <div className="space-y-2 rounded-xl border border-border p-3 bg-muted/30">
              {perms.map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <button
                    onClick={() => set(key as keyof CreateShareForm, !form[key as keyof CreateShareForm])}
                    className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${
                      form[key as keyof CreateShareForm] ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      form[key as keyof CreateShareForm] ? 'translate-x-4' : ''
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
              {loading ? <Spinner className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Link
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Share Card ───────────────────────────────────────────────────────────────

function ShareCard({ share, onRevoke }: { share: AnimalShare; onRevoke: (token: string) => void }) {
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState(false)

  const days = daysUntil(share.expiresAt)
  const isExpired = days <= 0
  const isActive = !share.isRevoked && !isExpired
  const typeMeta = TYPE_META[share.shareType]
  const TypeIcon = typeMeta.icon

  const copy = () => {
    navigator.clipboard.writeText(shareUrl(share.token))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const revoke = async () => {
    if (!confirm('Revoke this share link? This cannot be undone.')) return
    setRevoking(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/shares/${share.token}/revoke`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) onRevoke(share.token)
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div className={`bg-card border rounded-2xl p-4 transition-all ${
      share.isRevoked ? 'border-border opacity-60' : isExpired ? 'border-amber-200 dark:border-amber-800' : 'border-border hover:shadow-md'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${typeMeta.cls}`}>
            <TypeIcon className="w-3 h-3" />
            {typeMeta.label}
          </span>
          {share.shareRole && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${ROLE_META[share.shareRole]?.cls}`}>
              {ROLE_META[share.shareRole]?.label}
            </span>
          )}
          {share.isRevoked && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">Revoked</span>
          )}
          {!share.isRevoked && isExpired && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400">Expired</span>
          )}
          {share.passwordHash && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground border border-border">
              <Key className="w-2.5 h-2.5" /> Password
            </span>
          )}
        </div>

        {isActive && (
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={copy}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              title="Copy link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
            <a href={shareUrl(share.token)} target="_blank" rel="noreferrer"
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              title="Open link"
            >
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </a>
            <button
              onClick={revoke}
              disabled={revoking}
              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
              title="Revoke"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </button>
          </div>
        )}
      </div>

      {share.label && (
        <p className="text-sm font-medium text-foreground mb-2">{share.label}</p>
      )}

      {/* Share URL preview */}
      {isActive && (
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 mb-3 border border-border">
          <span className="text-xs text-muted-foreground font-mono truncate flex-1">
            /share/{share.token}
          </span>
          <button onClick={copy} className="text-xs text-primary hover:underline flex-shrink-0">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Eye className="w-3 h-3" /> {share.viewCount} views
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {share.isRevoked ? `Revoked ${formatDate(share.revokedAt!)}` :
            isExpired ? 'Expired' :
              `${days}d left`}
        </span>
        {share.lastAccessedAt && (
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3" /> {formatDate(share.lastAccessedAt)}
          </span>
        )}
        <span className="flex items-center gap-1 ml-auto">
          <Users className="w-3 h-3" /> {share.creator.name}
        </span>
      </div>

      {/* Permissions pills */}
      <div className="flex flex-wrap gap-1 mt-3">
        {share.canViewHealth && <PermPill label="Health" />}
        {share.canViewVeterinary && <PermPill label="Veterinary" />}
        {share.canViewBreeding && <PermPill label="Breeding" />}
        {share.canViewLineage && <PermPill label="Lineage" />}
        {share.canViewCertificates && <PermPill label="Certificates" />}
        {share.canViewFinancials && <PermPill label="Financials" />}
      </div>
    </div>
  )
}

function PermPill({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
      {label}
    </span>
  )
}

// ─── Audit Log Tab ────────────────────────────────────────────────────────────

function AuditLogTab({ animalId, shares }: { animalId: string; shares: AnimalShare[] }) {
  const [logs, setLogs] = useState<Array<AccessLog & { shareLabel?: string; shareType?: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const token = localStorage.getItem('token')
      const allLogs: any[] = []

      for (const share of shares.slice(0, 10)) {
        try {
          const res = await fetch(`/api/shares/${share.token}/logs?limit=20`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            const { logs: shareLogs } = await res.json()
            allLogs.push(...shareLogs.map((l: AccessLog) => ({
              ...l,
              shareLabel: share.label || `${TYPE_META[share.shareType].label} Link`,
              shareType: share.shareType,
            })))
          }
        } catch { /* continue */ }
      }

      allLogs.sort((a, b) => new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime())
      setLogs(allLogs.slice(0, 100))
      setLoading(false)
    }
    load()
  }, [shares])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="w-5 h-5 text-muted-foreground" />
      </div>
    )
  }

  if (!logs.length) {
    return (
      <div className="text-center py-12">
        <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No access activity yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {logs.map(log => (
        <div key={log.id} className="flex items-start gap-3 p-3 bg-card border border-border rounded-xl">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground">{log.shareLabel}</span>
              <span className="text-xs text-muted-foreground">{formatDate(log.accessedAt)}</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span>{log.ip || 'Unknown IP'}</span>
              {log.duration && <span>{log.duration}s session</span>}
              {log.userAgent && <span className="truncate max-w-[200px]">{log.userAgent.split(' ')[0]}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnimalSharesPage() {
  const router = useRouter()
  const params = useParams()
  const animalId = params.id as string

  const [animal, setAnimal] = useState<any>(null)
  const [shares, setShares] = useState<AnimalShare[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState<'active' | 'history' | 'audit'>('active')

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    setLoading(true)
    try {
      const [animalRes, sharesRes] = await Promise.all([
        fetch(`/api/animals/${animalId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/animals/${animalId}/share`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (!animalRes.ok) { router.push('/animals'); return }
      const { animal: a } = await animalRes.json()
      setAnimal(a)
      if (sharesRes.ok) {
        const { shares: s } = await sharesRes.json()
        setShares(s)
      }
    } finally {
      setLoading(false)
    }
  }, [animalId, router])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRevoke = (token: string) => {
    setShares(prev => prev.map(s => s.token === token ? { ...s, isRevoked: true, revokedAt: new Date().toISOString() } : s))
  }

  const activeShares = shares.filter(s => !s.isRevoked && daysUntil(s.expiresAt) > 0)
  const historyShares = shares.filter(s => s.isRevoked || daysUntil(s.expiresAt) <= 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="w-6 h-6 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {showCreate && (
        <CreateShareModal
          animalId={animalId}
          onCreated={share => { setShares(prev => [share as any, ...prev]); setShowCreate(false) }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link href={`/animals/${animalId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {animal?.name ?? 'Animal'}
              </Button>
            </Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-primary" /> Share Management
            </span>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Share
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-6">

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active Links', value: activeShares.length, icon: Globe, cls: 'text-emerald-600' },
            { label: 'Total Views', value: shares.reduce((a, s) => a + s.viewCount, 0), icon: Eye, cls: 'text-primary' },
            { label: 'Total Links', value: shares.length, icon: BarChart2, cls: 'text-violet-600' },
          ].map(stat => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${stat.cls}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            )
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl border border-border">
          {([['active', 'Active Links'], ['history', 'History'], ['audit', 'Audit Log']] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === t ? 'bg-card shadow text-foreground border border-border' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
              {t === 'active' && activeShares.length > 0 && (
                <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">{activeShares.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'active' && (
          <div className="space-y-3">
            {activeShares.length === 0 ? (
              <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl">
                <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground mb-1">No active share links</p>
                <p className="text-xs text-muted-foreground mb-4">Create a link to share this animal profile</p>
                <Button size="sm" onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Create First Link
                </Button>
              </div>
            ) : (
              activeShares.map(share => (
                <ShareCard key={share.id} share={share} onRevoke={handleRevoke} />
              ))
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-3">
            {historyShares.length === 0 ? (
              <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl">
                <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No expired or revoked links yet</p>
              </div>
            ) : (
              historyShares.map(share => (
                <ShareCard key={share.id} share={share} onRevoke={handleRevoke} />
              ))
            )}
          </div>
        )}

        {tab === 'audit' && <AuditLogTab animalId={animalId} shares={shares} />}
      </div>
    </div>
  )
}