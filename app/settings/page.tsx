'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, CheckCircle2, Loader2, Users, Building2, Shield, Crown } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Organization {
  id: string; name: string; slug: string; description?: string;
  logo?: string; subscription: string; maxAnimals: number;
  maxMembers: number; memberCount?: number; animalCount?: number;
}
interface Member {
  id: string; email: string; name: string;
  role: string; isActive: boolean; createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  MANAGER: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
  VETERINARIAN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  WORKER: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  VIEWER: 'bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-400',
}

export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('organization')
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({ name: '', description: '', logo: '' })
  const [newMember, setNewMember] = useState({ email: '', name: '', role: 'VIEWER' })
  const [addingMember, setAddingMember] = useState(false)

  useEffect(() => {
    // Check for ?tab= query param
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab === 'members') setActiveTab('members')
    fetchOrganization()
    fetchMembers()
  }, [])

  const fetchOrganization = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }
      const response = await fetch('/api/organization', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) {
        if (response.status === 401) { router.push('/login'); return }
        throw new Error('Failed to fetch organization')
      }
      const data = await response.json()
      setOrganization(data.organization)
      setFormData({
        name: data.organization.name,
        description: data.organization.description || '',
        logo: data.organization.logo || ''
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const response = await fetch('/api/organization/members', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setMembers(data.members)
      }
    } catch {}
  }

  const handleUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess('')
    try {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }
      const response = await fetch('/api/organization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update organization')
      }
      const data = await response.json()
      setOrganization(data.organization)
      setSuccess('Organization updated successfully')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: any) {
      setError(err.message || 'Failed to update organization')
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess(''); setAddingMember(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }
      const response = await fetch('/api/organization/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newMember)
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add member')
      }
      setSuccess('Member added successfully')
      setNewMember({ email: '', name: '', role: 'VIEWER' })
      await fetchMembers()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: any) {
      setError(err.message || 'Failed to add member')
    } finally {
      setAddingMember(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" aria-busy="true" aria-label="Loading settings">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="text-sm text-muted-foreground">Loading settings…</p>
        </div>
      </div>
    )
  }

  const animalUsagePct = organization
    ? Math.min(Math.round(((organization.animalCount || 0) / organization.maxAnimals) * 100), 100)
    : 0
  const memberUsagePct = organization
    ? Math.min(Math.round(((organization.memberCount || 0) / organization.maxMembers) * 100), 100)
    : 0

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <header className="stagger-child animate-fade-up" style={{ animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-5 h-5 text-primary" aria-hidden="true" />
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">Configuration</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Organization Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your organization and team members</p>
      </header>

      {/* Alerts */}
      {error && (
        <div role="alert" className="stagger-child animate-fade-up flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm" style={{ animationFillMode: 'forwards' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
      {success && (
        <div role="status" aria-live="polite" className="stagger-child animate-fade-up flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-400 text-sm" style={{ animationFillMode: 'forwards' }}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {success}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 rounded-xl" aria-label="Settings sections">
          <TabsTrigger value="organization" className="rounded-lg flex items-center gap-2">
            <Building2 className="w-4 h-4" aria-hidden="true" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="members" className="rounded-lg flex items-center gap-2">
            <Users className="w-4 h-4" aria-hidden="true" />
            Members
            {members.length > 0 && (
              <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium" aria-label={`${members.length} members`}>
                {members.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Organization tab ── */}
        <TabsContent value="organization" className="space-y-5 mt-5">

          {/* Org details form */}
          <section
            className="stagger-child animate-fade-up bg-card border border-border rounded-2xl p-5 shadow-sm"
            style={{ animationFillMode: 'forwards' }}
            aria-labelledby="org-details-heading"
          >
            <div className="mb-5">
              <h2 id="org-details-heading" className="font-semibold text-lg">Organization Details</h2>
              <p className="text-sm text-muted-foreground">Update your organization information</p>
            </div>
            <form onSubmit={handleUpdateOrganization} className="space-y-4" aria-label="Organization details form">
              <div>
                <label htmlFor="org-name" className="text-sm font-medium block mb-1.5">
                  Organization Name <span className="text-destructive" aria-label="required">*</span>
                </label>
                <Input
                  id="org-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="rounded-xl"
                  aria-required="true"
                />
              </div>
              <div>
                <label htmlFor="org-desc" className="text-sm font-medium block mb-1.5">Description</label>
                <Textarea
                  id="org-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your organization…"
                  rows={3}
                  className="rounded-xl resize-none"
                />
              </div>
              <div>
                <label htmlFor="org-logo" className="text-sm font-medium block mb-1.5">Logo URL</label>
                <Input
                  id="org-logo"
                  type="url"
                  value={formData.logo}
                  onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="rounded-xl"
                />
              </div>
              <Button type="submit" className="shadow-sm shadow-primary/20">Save Changes</Button>
            </form>
          </section>

          {/* Plan & limits */}
          <section
            className="stagger-child animate-fade-up delay-100 bg-card border border-border rounded-2xl p-5 shadow-sm"
            style={{ animationFillMode: 'forwards' }}
            aria-labelledby="plan-heading"
          >
            <div className="mb-5">
              <h2 id="plan-heading" className="font-semibold text-lg">Plan & Limits</h2>
              <p className="text-sm text-muted-foreground">Current subscription and resource usage</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Subscription badge */}
              <div className="p-4 border border-border rounded-xl bg-background flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-950/40 rounded-xl" aria-hidden="true">
                  <Crown className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Subscription Plan</p>
                  <p className="font-semibold capitalize">{organization?.subscription}</p>
                </div>
              </div>

              {/* Org ID */}
              <div className="p-4 border border-border rounded-xl bg-background">
                <p className="text-xs text-muted-foreground mb-1">Organization ID</p>
                <p className="text-xs font-mono truncate text-muted-foreground" title={organization?.id}>{organization?.id}</p>
              </div>

              {/* Animals usage */}
              <div className="p-4 border border-border rounded-xl bg-background" aria-label={`Animals: ${organization?.animalCount || 0} of ${organization?.maxAnimals}`}>
                <div className="flex justify-between items-baseline mb-2">
                  <p className="text-xs text-muted-foreground">Animals</p>
                  <p className="text-sm font-semibold stat-number">
                    {organization?.animalCount || 0}<span className="text-muted-foreground font-normal">/{organization?.maxAnimals}</span>
                  </p>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={animalUsagePct} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    className={`h-full rounded-full progress-bar transition-colors ${animalUsagePct > 85 ? 'bg-destructive' : 'bg-primary'}`}
                    style={{ '--progress-width': `${animalUsagePct}%` } as React.CSSProperties}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{animalUsagePct}% used</p>
              </div>

              {/* Members usage */}
              <div className="p-4 border border-border rounded-xl bg-background" aria-label={`Members: ${organization?.memberCount || 0} of ${organization?.maxMembers}`}>
                <div className="flex justify-between items-baseline mb-2">
                  <p className="text-xs text-muted-foreground">Members</p>
                  <p className="text-sm font-semibold stat-number">
                    {organization?.memberCount || 0}<span className="text-muted-foreground font-normal">/{organization?.maxMembers}</span>
                  </p>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={memberUsagePct} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    className={`h-full rounded-full progress-bar transition-colors ${memberUsagePct > 85 ? 'bg-destructive' : 'bg-primary'}`}
                    style={{ '--progress-width': `${memberUsagePct}%` } as React.CSSProperties}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{memberUsagePct}% used</p>
              </div>
            </div>
          </section>
        </TabsContent>

        {/* ── Members tab ── */}
        <TabsContent value="members" className="space-y-5 mt-5">

          {/* Add member */}
          <section
            className="stagger-child animate-fade-up bg-card border border-border rounded-2xl p-5 shadow-sm"
            style={{ animationFillMode: 'forwards' }}
            aria-labelledby="add-member-heading"
          >
            <div className="mb-5">
              <h2 id="add-member-heading" className="font-semibold text-lg">Invite Team Member</h2>
              <p className="text-sm text-muted-foreground">Add a new member to your organization</p>
            </div>
            <form onSubmit={handleAddMember} className="space-y-4" aria-label="Invite member form">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="member-name" className="text-sm font-medium block mb-1.5">
                    Full Name <span className="text-destructive" aria-label="required">*</span>
                  </label>
                  <Input
                    id="member-name"
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                    placeholder="Jane Smith"
                    required
                    className="rounded-xl"
                    aria-required="true"
                  />
                </div>
                <div>
                  <label htmlFor="member-email" className="text-sm font-medium block mb-1.5">
                    Email Address <span className="text-destructive" aria-label="required">*</span>
                  </label>
                  <Input
                    id="member-email"
                    type="email"
                    value={newMember.email}
                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                    placeholder="jane@farm.com"
                    required
                    className="rounded-xl"
                    aria-required="true"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="member-role" className="text-sm font-medium block mb-1.5">Role</label>
                <select
                  id="member-role"
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  className="w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  aria-label="Select member role"
                >
                  <option value="VIEWER">Viewer — Read-only access</option>
                  <option value="WORKER">Worker — Basic operations</option>
                  <option value="VETERINARIAN">Veterinarian — Health record access</option>
                  <option value="MANAGER">Manager — Full management</option>
                  <option value="ADMIN">Admin — All access</option>
                </select>
              </div>
              <Button type="submit" disabled={addingMember} className="shadow-sm shadow-primary/20" aria-busy={addingMember}>
                {addingMember ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                    Adding…
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" aria-hidden="true" />
                    Invite Member
                  </>
                )}
              </Button>
            </form>
          </section>

          {/* Member list */}
          <section
            className="stagger-child animate-fade-up delay-100 bg-card border border-border rounded-2xl p-5 shadow-sm"
            style={{ animationFillMode: 'forwards' }}
            aria-labelledby="team-members-heading"
          >
            <div className="mb-5">
              <h2 id="team-members-heading" className="font-semibold text-lg">Team Members</h2>
              <p className="text-sm text-muted-foreground">
                {members.length} member{members.length !== 1 ? 's' : ''} in your organization
              </p>
            </div>

            {members.length > 0 ? (
              <ul className="space-y-2.5" aria-label="Team member list">
                {members.map((member, i) => (
                  <li
                    key={member.id}
                    className="stagger-child animate-fade-up flex items-center justify-between p-4 border border-border rounded-xl bg-background hover:border-primary/20 transition-colors"
                    style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"
                        aria-hidden="true"
                      >
                        <span className="text-xs font-bold text-primary">
                          {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[member.role] || 'bg-muted text-muted-foreground'}`}
                        aria-label={`Role: ${member.role}`}
                      >
                        {member.role}
                      </span>
                      {!member.isActive && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full" aria-label="Account inactive">
                          Inactive
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center" role="status">
                <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center mb-3">
                  <Shield className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
                </div>
                <p className="font-medium">No team members yet</p>
                <p className="text-sm text-muted-foreground mt-1">Invite your first team member above</p>
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>

      <div className="h-4" aria-hidden="true" />
    </div>
  )
}