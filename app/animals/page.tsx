'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Plus, Search, Beef, SlidersHorizontal, LayoutGrid, List, Table2,
  ArrowUpDown, ArrowUp, ArrowDown, Trash2, Pencil, Eye, ChevronDown,
  Filter, X, Check, MoreHorizontal, Tag, Weight, Calendar, Hash
} from 'lucide-react'

type SortField = 'name' | 'type' | 'breed' | 'weight' | 'dob' | 'status'
type SortDir = 'asc' | 'desc'
type ViewMode = 'grid' | 'list' | 'table'

const STATUS_COLORS: Record<string, string> = {
  healthy: 'badge-healthy',
  sick: 'badge-sick',
  injured: 'badge-injured',
  recovering: 'badge-recovering',
}

const TYPE_ICONS: Record<string, string> = {
  cattle: '🐄', sheep: '🐑', goat: '🐐', pig: '🐖',
  chicken: '🐔', horse: '🐎', rabbit: '🐇', default: '🐾'
}

function getTypeIcon(type: string) {
  return TYPE_ICONS[type?.toLowerCase()] ?? TYPE_ICONS.default
}

export default function AnimalsPage() {
  const [animals, setAnimals] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    fetchAnimals(token)
  }, [router])

  const fetchAnimals = async (token: string) => {
    try {
      setLoading(true)
      const res = await fetch('/api/animals', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) { if (res.status === 401) { router.push('/login'); return } throw new Error('Failed to fetch') }
      const data = await res.json()
      setAnimals(data.animals || [])
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this animal?')) return
    try {
      const token = localStorage.getItem('token')!
      const res = await fetch(`/api/animals/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to delete')
      setAnimals(p => p.filter(a => a._id !== id))
      setSelectedIds(p => { const n = new Set(p); n.delete(id); return n })
    } catch (err: any) { setError(err.message) }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} animals?`)) return
    for (const id of selectedIds) await handleDelete(id)
    setSelectedIds(new Set())
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map((a: any) => a._id)))
  }

  const allTypes = useMemo(() => ['all', ...Array.from(new Set(animals.map((a: any) => a.type).filter(Boolean)))], [animals])
  const allStatuses = useMemo(() => ['all', ...Array.from(new Set(animals.map((a: any) => a.status).filter(Boolean)))], [animals])

  const filtered = useMemo(() => {
    let list = animals.filter((a: any) => {
      const q = searchTerm.toLowerCase()
      const matchSearch = !q || [a.name, a.type, a.breed, a.identifier].some(v => v?.toLowerCase().includes(q))
      const matchType = typeFilter === 'all' || a.type === typeFilter
      const matchStatus = statusFilter === 'all' || a.status === statusFilter
      return matchSearch && matchType && matchStatus
    })
    list = [...list].sort((a, b) => {
      const av = a[sortField] ?? ''; const bv = b[sortField] ?? ''
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [animals, searchTerm, typeFilter, statusFilter, sortField, sortDir])

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />
    return sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
  }

  if (loading) return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-5">
        <div className="skeleton h-10 w-52 rounded-xl" />
        <div className="skeleton h-11 w-full rounded-xl" />
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    </div>
  )

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-5">

        {/* ── Header ── */}
        <header className="animate-fade-up flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ animationFillMode: 'forwards' }}>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Beef className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-primary">Livestock</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Animals</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {animals.length > 0 ? `${animals.length.toLocaleString()} registered` : 'No animals yet'}
            </p>
          </div>
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Button variant="destructive" onClick={handleBulkDelete} className="gap-2 rounded-xl">
                <Trash2 className="w-4 h-4" /> Delete {selectedIds.size}
              </Button>
            )}
            <Link href="/animals/new">
              <Button className="gap-2 rounded-xl shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/25 transition-shadow">
                <Plus className="w-4 h-4" /> Add Animal
              </Button>
            </Link>
          </div>
        </header>

        {/* ── Error ── */}
        {error && (
          <div role="alert" className="animate-fade-up rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-center gap-2" style={{ animationFillMode: 'forwards' }}>
            <span className="w-2 h-2 rounded-full bg-destructive flex-shrink-0" />
            {error}
            <button className="ml-auto" onClick={() => setError('')}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="animate-fade-up delay-75 flex flex-col gap-3" style={{ animationFillMode: 'forwards' }}>
          <div className="flex gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
              <Input
                type="search"
                placeholder="Search name, type, breed, ID…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl bg-card h-10"
              />
            </div>
            {/* Filter toggle */}
            <Button
              variant={showFilters ? 'default' : 'outline'}
              className="gap-2 rounded-xl h-10"
              onClick={() => setShowFilters(p => !p)}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {(typeFilter !== 'all' || statusFilter !== 'all') && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
              )}
            </Button>
            {/* View switcher */}
            <div className="flex rounded-xl border border-border overflow-hidden h-10">
              {([['table', Table2], ['list', List], ['grid', LayoutGrid]] as [ViewMode, any][]).map(([mode, Icon]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 flex items-center transition-colors ${viewMode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                  aria-label={`${mode} view`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="animate-fade-up flex flex-wrap gap-3 p-3 rounded-xl bg-card border border-border" style={{ animationFillMode: 'forwards' }}>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block font-medium">Type</label>
                <div className="flex gap-1.5 flex-wrap">
                  {allTypes.map(t => (
                    <button key={t} onClick={() => setTypeFilter(t)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors capitalize ${typeFilter === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}>
                      {t === 'all' ? 'All types' : `${getTypeIcon(t)} ${t}`}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block font-medium">Status</label>
                <div className="flex gap-1.5 flex-wrap">
                  {allStatuses.map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors capitalize ${statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}>
                      {s === 'all' ? 'All statuses' : s}
                    </button>
                  ))}
                </div>
              </div>
              {(typeFilter !== 'all' || statusFilter !== 'all') && (
                <button onClick={() => { setTypeFilter('all'); setStatusFilter('all') }}
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline self-end">
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Stats strip ── */}
        {animals.length > 0 && (
          <div className="animate-fade-up delay-100 flex gap-3 text-sm text-muted-foreground items-center" style={{ animationFillMode: 'forwards' }}>
            <span>Showing <strong className="text-foreground">{filtered.length}</strong> of <strong className="text-foreground">{animals.length}</strong></span>
            {selectedIds.size > 0 && <span className="text-primary font-medium">• {selectedIds.size} selected</span>}
            {(searchTerm || typeFilter !== 'all' || statusFilter !== 'all') && (
              <button onClick={() => { setSearchTerm(''); setTypeFilter('all'); setStatusFilter('all') }}
                className="text-primary underline-offset-2 hover:underline flex items-center gap-1">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        )}

        {/* ── TABLE VIEW ── */}
        {viewMode === 'table' && filtered.length > 0 && (
          <div className="animate-fade-up delay-150 rounded-2xl border border-border overflow-hidden bg-card shadow-sm" style={{ animationFillMode: 'forwards' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 w-8">
                      <button onClick={toggleSelectAll} className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.size === filtered.length && filtered.length > 0 ? 'bg-primary border-primary' : 'border-border hover:border-primary/60'}`}>
                        {selectedIds.size === filtered.length && filtered.length > 0 && <Check className="w-3 h-3 text-primary-foreground" />}
                      </button>
                    </th>
                    {([['name', 'Animal', Hash], ['type', 'Type', Tag], ['breed', 'Breed', Tag], ['weight', 'Weight', Weight], ['dob', 'Born', Calendar], ['status', 'Status', null]] as [SortField, string, any][]).map(([field, label, Icon]) => (
                      <th key={field} className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                        <button onClick={() => toggleSort(field)} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                          {Icon && <Icon className="w-3.5 h-3.5" />}
                          {label} <SortIcon field={field} />
                        </button>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-muted-foreground font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((animal: any) => (
                    <tr key={animal._id} className={`group hover:bg-muted/30 transition-colors ${selectedIds.has(animal._id) ? 'bg-primary/5' : ''}`}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleSelect(animal._id)} className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.has(animal._id) ? 'bg-primary border-primary' : 'border-border hover:border-primary/60'}`}>
                          {selectedIds.has(animal._id) && <Check className="w-3 h-3 text-primary-foreground" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-lg" aria-hidden="true">{getTypeIcon(animal.type)}</span>
                          <div>
                            <div className="font-semibold text-foreground leading-tight">{animal.name}</div>
                            {animal.identifier && <div className="text-xs text-muted-foreground font-mono">{animal.identifier}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{animal.type || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{animal.breed || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{animal.weight ? `${animal.weight} kg` : '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{animal.dob ? new Date(animal.dob).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3">
                        {animal.status ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[animal.status?.toLowerCase()] || 'badge-healthy'}`}>
                            {animal.status}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/animals/${animal._id}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg"><Eye className="w-3.5 h-3.5" /></Button>
                          </Link>
                          <Link href={`/animals/${animal._id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg"><Pencil className="w-3.5 h-3.5" /></Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive hover:text-destructive" onClick={() => handleDelete(animal._id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {viewMode === 'list' && filtered.length > 0 && (
          <div className="animate-fade-up delay-150 flex flex-col gap-2" style={{ animationFillMode: 'forwards' }}>
            {filtered.map((animal: any) => (
              <div key={animal._id} className={`group card-hover flex items-center gap-4 p-4 rounded-2xl border bg-card cursor-pointer ${selectedIds.has(animal._id) ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                <button onClick={() => toggleSelect(animal._id)} className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${selectedIds.has(animal._id) ? 'bg-primary border-primary' : 'border-border'}`}>
                  {selectedIds.has(animal._id) && <Check className="w-3 h-3 text-primary-foreground" />}
                </button>
                <div className="text-2xl flex-shrink-0">{getTypeIcon(animal.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{animal.name}</span>
                    {animal.identifier && <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{animal.identifier}</span>}
                    {animal.status && <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[animal.status?.toLowerCase()] || ''}`}>{animal.status}</span>}
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5 capitalize">
                    {[animal.type, animal.breed, animal.weight && `${animal.weight} kg`, animal.dob && new Date(animal.dob).getFullYear()].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/animals/${animal._id}`}><Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl"><Eye className="w-4 h-4" /></Button></Link>
                  <Link href={`/animals/${animal._id}/edit`}><Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl"><Pencil className="w-4 h-4" /></Button></Link>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive hover:text-destructive" onClick={() => handleDelete(animal._id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── GRID VIEW ── */}
        {viewMode === 'grid' && filtered.length > 0 && (
          <div className="animate-fade-up delay-150 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" style={{ animationFillMode: 'forwards' }}>
            {filtered.map((animal: any) => (
              <div key={animal._id} className={`group card-hover relative rounded-2xl border bg-card overflow-hidden ${selectedIds.has(animal._id) ? 'border-primary/60 ring-1 ring-primary/30' : 'border-border'}`}>
                {/* Selection */}
                <button onClick={() => toggleSelect(animal._id)} className={`absolute top-3 left-3 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedIds.has(animal._id) ? 'bg-primary border-primary opacity-100' : 'border-white/70 opacity-0 group-hover:opacity-100 bg-black/20'}`}>
                  {selectedIds.has(animal._id) && <Check className="w-3 h-3 text-white" />}
                </button>
                {/* Header band */}
                <div className="h-20 bg-gradient-to-br from-primary/10 via-secondary to-accent/20 flex items-center justify-center text-4xl">
                  {getTypeIcon(animal.type)}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground leading-tight">{animal.name}</h3>
                      {animal.identifier && <p className="text-xs font-mono text-muted-foreground">{animal.identifier}</p>}
                    </div>
                    {animal.status && (
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold capitalize flex-shrink-0 ${STATUS_COLORS[animal.status?.toLowerCase()] || ''}`}>{animal.status}</span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground capitalize space-y-0.5">
                    {animal.type && <div className="flex items-center gap-1"><Tag className="w-3 h-3" /> {animal.type}{animal.breed ? ` · ${animal.breed}` : ''}</div>}
                    {animal.weight && <div className="flex items-center gap-1"><Weight className="w-3 h-3" /> {animal.weight} kg</div>}
                    {animal.dob && <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(animal.dob).toLocaleDateString()}</div>}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/animals/${animal._id}`} className="flex-1"><Button variant="outline" size="sm" className="w-full h-7 text-xs rounded-lg gap-1"><Eye className="w-3 h-3" />View</Button></Link>
                    <Link href={`/animals/${animal._id}/edit`}><Button variant="outline" size="icon" className="h-7 w-7 rounded-lg"><Pencil className="w-3 h-3" /></Button></Link>
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg text-destructive hover:text-destructive hover:border-destructive/40" onClick={() => handleDelete(animal._id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {filtered.length === 0 && !loading && (
          <div className="animate-scale-in flex flex-col items-center justify-center py-24 text-center" style={{ animationFillMode: 'forwards' }}>
            <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mb-4 text-4xl">🐾</div>
            {searchTerm || typeFilter !== 'all' || statusFilter !== 'all' ? (
              <>
                <p className="font-semibold text-foreground">No animals match your filters</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting the search or filters above</p>
                <Button variant="outline" className="mt-4 rounded-xl" onClick={() => { setSearchTerm(''); setTypeFilter('all'); setStatusFilter('all') }}>Clear all filters</Button>
              </>
            ) : (
              <>
                <p className="font-semibold text-foreground">No animals yet</p>
                <p className="text-sm text-muted-foreground mt-1">Add your first animal to get started</p>
                <Link href="/animals/new" className="mt-4">
                  <Button className="rounded-xl"><Plus className="w-4 h-4 mr-2" />Add First Animal</Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}