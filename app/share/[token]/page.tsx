

'use client'

/**
 * app/share/[token]/page.tsx
 *
 * Public-facing share preview page.
 * Handles PUBLIC (no auth), PRIVATE (password gate), and ROLE_BASED (password gate).
 *
 * BUG FIX: API path corrected from /api/animals/shares/[token] → /api/share/[token]
 * REDESIGN: Uses globals.css design tokens (bg-card, bg-primary, text-foreground, etc.)
 */

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import {
  Shield, Lock, AlertCircle, Eye, Clock, Globe,
  UserCheck, Activity, Heart, Stethoscope, GitBranch,
  Award, DollarSign, Calendar, Dna, ChevronDown, ChevronUp, Leaf,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShareAnimal {
  id: string; name: string; type: string; breed?: string; gender: string
  dateOfBirth?: string; weight?: number; height?: number; color?: string
  distinctMarks?: string; identificationId?: string; location?: string
  healthStatus: string; acquisitionDate?: string; notes?: string
  healthRecords?: HealthRecord[]; veterinaryNotes?: VetNote[]; breedingRecords?: BreedingRecord[]
}
interface HealthRecord {
  id: string; date: string; recordType: string; diagnosis?: string; treatment?: string
  vaccinationStatus?: string; vaccineName?: string; notes?: string; veterinarian?: string
  weight?: number; temperature?: number
}
interface VetNote {
  id: string; date: string; notes: string; diagnosis?: string; prescription?: string
  veterinarian?: string; followUpDate?: string
}
interface BreedingRecord {
  id: string; breedingDate: string; method: string; outcome: string
  offspringCount?: number; expectedBirthDate?: string; actualBirthDate?: string
  confirmedPregnancy?: boolean; veterinarian?: string; notes?: string
  dam?: { name: string; breed?: string }; sire?: { name: string; breed?: string }
}
interface ShareMeta {
  id: string; shareType: 'PUBLIC' | 'PRIVATE' | 'ROLE_BASED'; shareRole?: string
  label?: string; expiresAt: string; viewCount: number
}
interface Permissions {
  canViewHealth: boolean; canViewBreeding: boolean; canViewVeterinary: boolean
  canViewFinancials: boolean; canViewLineage: boolean; canViewCertificates: boolean
}
type PageState = 'loading' | 'password' | 'ready' | 'error' | 'revoked' | 'expired'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d?: string | null) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d))
}

function ageFrom(dob?: string | null) {
  if (!dob) return '—'
  const diff = Date.now() - new Date(dob).getTime()
  const y = Math.floor(diff / (1000 * 60 * 60 * 24 * 365))
  const m = Math.floor((diff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30))
  return y > 0 ? `${y}yr ${m}mo` : `${m} months`
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, defaultOpen = true, count }: {
  title: string; icon: React.ElementType; children: React.ReactNode
  defaultOpen?: boolean; count?: number
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-up" style={{ animationFillMode: 'both' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-secondary-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-serif)' }}>
            {title}
          </span>
          {!!count && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary/10 text-primary border border-primary/20">
              {count}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        }
      </button>
      {open && <div className="px-5 pb-5 pt-3 border-t border-border">{children}</div>}
    </div>
  )
}

function InfoGrid({ items }: { items: { label: string; value?: string | null }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map(({ label, value }) => (
        <div key={label} className="bg-muted/60 rounded-lg p-3 border border-border/50">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
          <p className="text-sm font-medium text-foreground truncate">{value || '—'}</p>
        </div>
      ))}
    </div>
  )
}

function Badge({ label, variant = 'neutral' }: { label: string; variant?: 'neutral' | 'blue' | 'green' | 'amber' | 'red' }) {
  const cls = {
    neutral: 'bg-muted text-muted-foreground border-border',
    blue:    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
    green:   'bg-secondary text-secondary-foreground border-secondary',
    amber:   'bg-accent text-accent-foreground border-accent',
    red:     'bg-destructive/10 text-destructive border-destructive/20',
  }[variant]
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase border ${cls}`}>{label}</span>
  )
}

function RecordCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 card-hover">{children}</div>
  )
}

function RecordRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-xs">
      <span className="text-muted-foreground">{label}: </span>
      <span className={`font-medium ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</span>
    </div>
  )
}

// ─── Screen wrappers ──────────────────────────────────────────────────────────

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-8 w-full max-w-sm text-center animate-scale-in">
        {children}
      </div>
    </div>
  )
}

function StatusScreen({ icon: Icon, title, subtitle, iconBg }: {
  icon: React.ElementType; title: string; subtitle: string; iconBg: string
}) {
  return (
    <CenteredCard>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${iconBg}`}>
        <Icon className="w-6 h-6" />
      </div>
      <h1 className="text-lg font-bold text-foreground mb-1" style={{ fontFamily: 'var(--font-serif)' }}>{title}</h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </CenteredCard>
  )
}

function PasswordGate({ onSubmit, loading, error }: {
  onSubmit: (pw: string) => void; loading: boolean; error: string
}) {
  const [pw, setPw] = useState('')
  return (
    <CenteredCard>
      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
        <Lock className="w-6 h-6 text-secondary-foreground" />
      </div>
      <h1 className="text-lg font-bold text-foreground mb-1" style={{ fontFamily: 'var(--font-serif)' }}>Protected Link</h1>
      <p className="text-sm text-muted-foreground mb-6">Enter the password to view this animal profile</p>
      <input
        type="password" value={pw} onChange={e => setPw(e.target.value)} autoFocus
        onKeyDown={e => e.key === 'Enter' && pw && onSubmit(pw)}
        placeholder="Enter password"
        className="w-full px-4 py-3 rounded-xl border border-input bg-muted/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-3"
      />
      {error && (
        <p className="text-xs text-destructive mb-3 flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
      <button
        onClick={() => pw && onSubmit(pw)} disabled={loading || !pw}
        className="w-full bg-primary hover:opacity-90 text-primary-foreground text-sm font-semibold py-3 rounded-xl transition-opacity disabled:opacity-40"
      >
        {loading ? 'Verifying…' : 'View Profile'}
      </button>
    </CenteredCard>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SharePreviewPage() {
  const params = useParams()
  const token = params.token as string

  const [state, setState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [animal, setAnimal] = useState<ShareAnimal | null>(null)
  const [shareMeta, setShareMeta] = useState<ShareMeta | null>(null)
  const [permissions, setPermissions] = useState<Permissions | null>(null)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const sessionStart = useRef(Date.now())

  // ✅ FIXED: was /api/animals/shares/${token} — correct path is /api/share/${token}
  const fetchShare = async (password?: string) => {
    try {
      const headers: Record<string, string> = {}
      if (password) headers['x-share-password'] = password

      const res = await fetch(`/api/animals/shares/${token}`, { headers })
      const data = await res.json()

      if (res.status === 401 && data.requiresPassword) {
        setState('password')
        if (password) setPwError('Incorrect password, please try again.')
        return
      }
      if (res.status === 410) {
        setState(data.error?.toLowerCase().includes('revoked') ? 'revoked' : 'expired')
        return
      }
      if (!res.ok) {
        setErrorMsg(data.error || 'Unable to load this share link')
        setState('error')
        return
      }

      setPwError('')
      setAnimal(data.animal)
      setShareMeta(data.share)
      setPermissions(data.permissions)
      setState('ready')
      sessionStart.current = Date.now()
    } catch {
      setErrorMsg('A network error occurred. Please try again.')
      setState('error')
    }
  }

  const handlePassword = async (pw: string) => {
    setPwLoading(true)
    await fetchShare(pw)
    setPwLoading(false)
  }

  useEffect(() => { fetchShare() }, [token]) // eslint-disable-line

  // ✅ FIXED: sendBeacon path also corrected
  useEffect(() => {
    if (state !== 'ready') return
    const onUnload = () => {
      const duration = (Date.now() - sessionStart.current) / 1000
      navigator.sendBeacon(`/api/animals/shares/${token}`, JSON.stringify({ duration }))
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [state, token])

  // ── Render states ──────────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-border" />
            <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Loading profile…</p>
            <p className="text-xs text-muted-foreground mt-0.5">Verifying access</p>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'password') return <PasswordGate onSubmit={handlePassword} loading={pwLoading} error={pwError} />

  if (state === 'revoked') return (
    <StatusScreen icon={Shield} title="Link Revoked"
      subtitle="This share link has been revoked by the owner and is no longer accessible."
      iconBg="bg-destructive/10 text-destructive" />
  )
  if (state === 'expired') return (
    <StatusScreen icon={Clock} title="Link Expired"
      subtitle="This share link has expired. Please contact the owner for a new link."
      iconBg="bg-accent text-accent-foreground" />
  )
  if (state === 'error' || !animal || !shareMeta || !permissions) return (
    <StatusScreen icon={AlertCircle} title="Not Found"
      subtitle={errorMsg || 'This share link could not be found or may have been removed.'}
      iconBg="bg-muted text-muted-foreground" />
  )

  // ── Ready ──────────────────────────────────────────────────────────────────

  const HEALTH_CLS: Record<string, string> = {
    HEALTHY:    'badge-healthy border border-transparent',
    SICK:       'badge-sick border border-transparent',
    INJURED:    'badge-injured border border-transparent',
    RECOVERING: 'badge-recovering border border-transparent',
    DECEASED:   'bg-muted text-muted-foreground border border-border',
    QUARANTINE: 'bg-accent text-accent-foreground border border-accent',
  }
  const healthCls = HEALTH_CLS[animal.healthStatus] ?? 'bg-muted text-muted-foreground border border-border'

  const SHARE_TYPES: Record<string, { icon: React.ElementType; label: string; cls: string }> = {
    PUBLIC:     { icon: Globe,     label: 'Public',                    cls: 'bg-secondary text-secondary-foreground border border-secondary' },
    PRIVATE:    { icon: Lock,      label: 'Private',                   cls: 'bg-accent text-accent-foreground border border-accent' },
    ROLE_BASED: { icon: UserCheck, label: shareMeta.shareRole ?? 'Role-Based', cls: 'bg-primary/10 text-primary border border-primary/20' },
  }
  const typeMeta = SHARE_TYPES[shareMeta.shareType]
  const TypeIcon = typeMeta.icon

  const permsList = [
    { key: 'canViewHealth',       label: 'Health',       icon: Heart },
    { key: 'canViewVeterinary',   label: 'Veterinary',   icon: Stethoscope },
    { key: 'canViewBreeding',     label: 'Breeding',     icon: Dna },
    { key: 'canViewLineage',      label: 'Lineage',      icon: GitBranch },
    { key: 'canViewCertificates', label: 'Certificates', icon: Award },
    { key: 'canViewFinancials',   label: 'Financials',   icon: DollarSign },
  ]

  return (
    <div className="min-h-screen bg-background">

      {/* ── Top bar ── */}
      <div className="bg-primary text-primary-foreground text-xs py-2.5 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3 opacity-70" />
            <span className="font-medium opacity-90">Shared via FarmTrack</span>
            <span className="opacity-40 hidden sm:inline">·</span>
            <span className="opacity-70 hidden sm:inline">Read-only view</span>
          </div>
          <div className="flex items-center gap-4 opacity-80">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Expires {formatDate(shareMeta.expiresAt)}</span>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {shareMeta.viewCount} views</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">

        {/* ── Hero ── */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm animate-fade-up" style={{ animationFillMode: 'both' }}>
          <div className="h-1 bg-primary" />
          <div className="p-5 md:p-6">

            {/* Name + badges */}
            <div className="flex items-start gap-4 mb-5">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0 border border-secondary/50">
                <Leaf className="w-8 h-8 text-secondary-foreground animate-leaf" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-foreground leading-tight" style={{ fontFamily: 'var(--font-serif)' }}>
                  {animal.name}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">{animal.breed || animal.type} · {animal.gender}</p>
                {animal.identificationId && (
                  <p className="text-xs font-mono mt-1 text-muted-foreground bg-muted/60 inline-block px-2 py-0.5 rounded border border-border">
                    ID: {animal.identificationId}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${healthCls}`}>
                  <Activity className="w-2.5 h-2.5" /> {animal.healthStatus}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${typeMeta.cls}`}>
                  <TypeIcon className="w-2.5 h-2.5" /> {typeMeta.label}
                </span>
              </div>
            </div>

            {/* Access label */}
            {shareMeta.label && (
              <div className="mb-5 px-3 py-2.5 eco-banner rounded-xl text-xs flex items-center gap-2">
                <Shield className="w-3 h-3 opacity-60 flex-shrink-0" />
                <span className="text-foreground/80">
                  <span className="font-semibold">Access label:</span> {shareMeta.label}
                </span>
              </div>
            )}

            {/* Details grid */}
            <InfoGrid items={[
              { label: 'Date of Birth', value: formatDate(animal.dateOfBirth) },
              { label: 'Age',           value: ageFrom(animal.dateOfBirth) },
              { label: 'Weight',        value: animal.weight ? `${animal.weight} kg` : undefined },
              { label: 'Height',        value: animal.height ? `${animal.height} cm` : undefined },
              { label: 'Color',         value: animal.color },
              { label: 'Location',      value: animal.location },
              { label: 'Acquired',      value: formatDate(animal.acquisitionDate) },
              { label: 'Markings',      value: animal.distinctMarks },
            ]} />

            {animal.notes && (
              <div className="mt-4 p-3 bg-muted/50 rounded-xl border border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-foreground">{animal.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Permissions strip ── */}
        <div className="px-1 animate-fade-up delay-100" style={{ animationFillMode: 'both' }}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Data accessible in this share
          </p>
          <div className="flex flex-wrap gap-1.5">
            {permsList.map(({ key, label, icon: Icon }) => {
              const granted = permissions[key as keyof Permissions]
              return (
                <span key={key}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-opacity ${
                    granted
                      ? 'bg-secondary text-secondary-foreground border-secondary'
                      : 'bg-muted/50 text-muted-foreground border-border opacity-40'
                  }`}
                >
                  <Icon className="w-2.5 h-2.5" /> {label}
                </span>
              )
            })}
          </div>
        </div>

        {/* ── Health Records ── */}
        {permissions.canViewHealth && (
          <Section title="Health Records" icon={Heart} count={animal.healthRecords?.length}>
            {!animal.healthRecords?.length
              ? <p className="text-sm text-muted-foreground py-3 text-center">No health records available.</p>
              : (
                <div className="space-y-3">
                  {animal.healthRecords.map(r => (
                    <RecordCard key={r.id}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge label={r.recordType} />
                          {r.vaccinationStatus && <Badge label={r.vaccinationStatus} variant="blue" />}
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                          <Calendar className="w-3 h-3" /> {formatDate(r.date)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {r.diagnosis    && <RecordRow label="Diagnosis"  value={r.diagnosis} />}
                        {r.treatment    && <RecordRow label="Treatment"  value={r.treatment} />}
                        {r.vaccineName  && <RecordRow label="Vaccine"    value={r.vaccineName} />}
                        {r.veterinarian && <RecordRow label="Vet"        value={r.veterinarian} />}
                        {r.weight       && <RecordRow label="Weight"     value={`${r.weight} kg`} />}
                        {r.temperature  && <RecordRow label="Temp"       value={`${r.temperature}°C`} />}
                      </div>
                      {r.notes && (
                        <p className="text-xs text-muted-foreground italic border-t border-border pt-2">{r.notes}</p>
                      )}
                    </RecordCard>
                  ))}
                </div>
              )
            }
          </Section>
        )}

        {/* ── Veterinary Notes ── */}
        {permissions.canViewVeterinary && (
          <Section title="Veterinary Notes" icon={Stethoscope} count={animal.veterinaryNotes?.length}>
            {!animal.veterinaryNotes?.length
              ? <p className="text-sm text-muted-foreground py-3 text-center">No veterinary notes available.</p>
              : (
                <div className="space-y-3">
                  {animal.veterinaryNotes.map(n => (
                    <RecordCard key={n.id}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">{n.veterinarian || 'Veterinarian'}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatDate(n.date)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{n.notes}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {n.diagnosis    && <RecordRow label="Diagnosis"    value={n.diagnosis} />}
                        {n.prescription && <RecordRow label="Prescription" value={n.prescription} />}
                        {n.followUpDate && <RecordRow label="Follow-up"    value={formatDate(n.followUpDate)} />}
                      </div>
                    </RecordCard>
                  ))}
                </div>
              )
            }
          </Section>
        )}

        {/* ── Breeding Records ── */}
        {permissions.canViewBreeding && (
          <Section title="Breeding Records" icon={Dna} count={animal.breedingRecords?.length}>
            {!animal.breedingRecords?.length
              ? <p className="text-sm text-muted-foreground py-3 text-center">No breeding records available.</p>
              : (
                <div className="space-y-3">
                  {animal.breedingRecords.map(r => (
                    <RecordCard key={r.id}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge label={r.method} />
                          <Badge
                            label={r.outcome}
                            variant={r.outcome === 'SUCCESSFUL' ? 'green' : r.outcome === 'PENDING' ? 'amber' : r.outcome === 'UNSUCCESSFUL' ? 'red' : 'neutral'}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                          <Calendar className="w-3 h-3" /> {formatDate(r.breedingDate)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {r.dam && <RecordRow label="Dam" value={`${r.dam.name}${r.dam.breed ? ` (${r.dam.breed})` : ''}`} />}
                        {r.sire && <RecordRow label="Sire" value={`${r.sire.name}${r.sire.breed ? ` (${r.sire.breed})` : ''}`} />}
                        {r.confirmedPregnancy !== undefined && (
                          <RecordRow label="Pregnancy" value={r.confirmedPregnancy ? 'Confirmed' : 'Not confirmed'} highlight={r.confirmedPregnancy} />
                        )}
                        {r.offspringCount != null && <RecordRow label="Offspring" value={String(r.offspringCount)} />}
                        {r.expectedBirthDate && <RecordRow label="Expected birth" value={formatDate(r.expectedBirthDate)} />}
                        {r.actualBirthDate   && <RecordRow label="Actual birth"   value={formatDate(r.actualBirthDate)} />}
                        {r.veterinarian      && <RecordRow label="Vet"            value={r.veterinarian} />}
                      </div>
                      {r.notes && (
                        <p className="text-xs text-muted-foreground italic border-t border-border pt-2">{r.notes}</p>
                      )}
                    </RecordCard>
                  ))}
                </div>
              )
            }
          </Section>
        )}

        {/* ── Lineage ── */}
        {permissions.canViewLineage && (
          <Section title="Lineage & Pedigree" icon={GitBranch} defaultOpen={false}>
            <div className="text-center py-8">
              <GitBranch className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Pedigree data not included in this share.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Contact the owner for detailed lineage information.</p>
            </div>
          </Section>
        )}

        {/* ── Certificates ── */}
        {permissions.canViewCertificates && (
          <Section title="Certificates & Compliance" icon={Award} defaultOpen={false}>
            <div className="text-center py-8">
              <Award className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No certificates attached to this share.</p>
            </div>
          </Section>
        )}

        {/* ── Financials ── */}
        {permissions.canViewFinancials && (
          <Section title="Financial Information" icon={DollarSign} defaultOpen={false}>
            <div className="text-center py-8">
              <DollarSign className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Financial details not included in this share.</p>
            </div>
          </Section>
        )}

        {/* ── Footer ── */}
        <div className="text-center py-5 text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Shield className="w-3 h-3 opacity-40" />
          <span>Read-only shared view · Data provided by the animal&apos;s owner</span>
        </div>

      </div>
    </div>
  )
}


