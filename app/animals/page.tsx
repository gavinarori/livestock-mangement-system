'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { AnimalList } from '@/components/animals/animal-list'
import { Plus, Search, Beef, SlidersHorizontal } from 'lucide-react'

export default function AnimalsPage() {
  const [animals, setAnimals] = useState([])
  const [filteredAnimals, setFilteredAnimals] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    fetchAnimals(token)
  }, [router])

  const fetchAnimals = async (token: string) => {
    try {
      setLoading(true)
      const response = await fetch('/api/animals', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) {
        if (response.status === 401) { router.push('/login'); return }
        throw new Error('Failed to fetch animals')
      }
      const data = await response.json()
      setAnimals(data.animals || [])
      setFilteredAnimals(data.animals || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load animals')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase()
    setSearchTerm(term)
    setFilteredAnimals(
      animals.filter((animal: any) =>
        animal.name.toLowerCase().includes(term) ||
        animal.type.toLowerCase().includes(term) ||
        animal.breed?.toLowerCase().includes(term) ||
        animal.identifier?.toLowerCase().includes(term)
      )
    )
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this animal?')) return
    try {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }
      const response = await fetch(`/api/animals/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to delete animal')
      setAnimals(animals.filter((a: any) => a._id !== id))
      setFilteredAnimals(filteredAnimals.filter((a: any) => a._id !== id))
    } catch (err: any) {
      setError(err.message || 'Failed to delete animal')
    }
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto" aria-busy="true" aria-label="Loading animals">
        <div className="flex flex-col gap-6">
          <div className="skeleton h-10 w-48 rounded-xl" />
          <div className="skeleton h-11 w-full rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-40 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-6">

        {/* Header */}
        <header className="stagger-child animate-fade-up flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ animationFillMode: 'forwards' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Beef className="w-5 h-5 text-primary" aria-hidden="true" />
              <span className="text-xs font-semibold tracking-widest uppercase text-primary">Livestock</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Your Animals</h1>
            <p className="text-muted-foreground mt-1">
              {animals.length > 0
                ? `Managing ${animals.length.toLocaleString()} animal${animals.length !== 1 ? 's' : ''}`
                : 'Manage and track your livestock'
              }
            </p>
          </div>
          <Link href="/animals/new">
            <Button className="flex items-center gap-2 shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/25 transition-shadow" aria-label="Add new animal">
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add Animal
            </Button>
          </Link>
        </header>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="stagger-child animate-fade-up rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-2"
            style={{ animationFillMode: 'forwards' }}
          >
            <span className="w-2 h-2 rounded-full bg-destructive flex-shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        {/* Search + filter bar */}
        <div
          className="stagger-child animate-fade-up delay-100 flex gap-3"
          style={{ animationFillMode: 'forwards' }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" aria-hidden="true" />
            <label htmlFor="animal-search" className="sr-only">Search animals</label>
            <Input
              id="animal-search"
              type="search"
              placeholder="Search by name, type, breed, or ID…"
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 rounded-xl bg-card"
              aria-label="Search animals by name, type, breed, or ID"
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2 rounded-xl" aria-label="Filter options">
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Filter</span>
          </Button>
        </div>

        {/* Stats strip */}
        {animals.length > 0 && (
          <div
            className="stagger-child animate-fade-up delay-150 flex gap-4 text-sm text-muted-foreground"
            style={{ animationFillMode: 'forwards' }}
            aria-live="polite"
            aria-atomic="true"
          >
            <span>
              Showing <strong className="text-foreground">{filteredAnimals.length}</strong> of{' '}
              <strong className="text-foreground">{animals.length}</strong> animals
            </span>
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(''); setFilteredAnimals(animals) }}
                className="text-primary underline-offset-2 hover:underline"
                aria-label="Clear search filter"
              >
                Clear filter
              </button>
            )}
          </div>
        )}

        {/* Animal List */}
        <div className="stagger-child animate-fade-up delay-200" style={{ animationFillMode: 'forwards' }}>
          <AnimalList animals={filteredAnimals} onDelete={handleDelete} />
        </div>

        {/* Empty state */}
        {filteredAnimals.length === 0 && !loading && (
          <div
            className="stagger-child animate-scale-in flex flex-col items-center justify-center py-20 text-center"
            style={{ animationFillMode: 'forwards' }}
            role="status"
            aria-label={searchTerm ? 'No search results' : 'No animals yet'}
          >
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <Beef className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
            </div>
            {searchTerm ? (
              <>
                <p className="font-semibold text-foreground">No animals match "{searchTerm}"</p>
                <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
                <Button variant="outline" className="mt-4" onClick={() => { setSearchTerm(''); setFilteredAnimals(animals) }}>
                  Clear search
                </Button>
              </>
            ) : (
              <>
                <p className="font-semibold text-foreground">No animals yet</p>
                <p className="text-sm text-muted-foreground mt-1">Add your first animal to get started</p>
                <Link href="/animals/new" className="mt-4">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                    Add First Animal
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}