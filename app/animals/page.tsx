'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { AnimalList } from '@/components/animals/animal-list'
import { Plus, Search } from 'lucide-react'

export default function AnimalsPage() {
  const [animals, setAnimals] = useState([])
  const [filteredAnimals, setFilteredAnimals] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    fetchAnimals(token)
  }, [router])

  const fetchAnimals = async (token: string) => {
    try {
      setLoading(true)
      const response = await fetch('/api/animals', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch animals')
      }

      const data = await response.json()
      setAnimals(data.animals || [])
      setFilteredAnimals(data.animals || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load animals')
      console.error('[v0] Fetch animals error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase()
    setSearchTerm(term)

    const filtered = animals.filter((animal: any) =>
      animal.name.toLowerCase().includes(term) ||
      animal.type.toLowerCase().includes(term) ||
      animal.breed?.toLowerCase().includes(term) ||
      animal.identifier?.toLowerCase().includes(term)
    )
    setFilteredAnimals(filtered)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this animal?')) return

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`/api/animals/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to delete animal')
      }

      setAnimals(animals.filter((a: any) => a._id !== id))
      setFilteredAnimals(filteredAnimals.filter((a: any) => a._id !== id))
    } catch (err: any) {
      console.error('[v0] Delete error:', err)
      setError(err.message || 'Failed to delete animal')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto flex items-center justify-center h-screen">
          <Spinner className="w-8 h-8" />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Your Animals</h1>
              <p className="text-muted-foreground mt-1">Manage and track your livestock</p>
            </div>
            <Link href="/animals/new">
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Animal
              </Button>
            </Link>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search by name, type, breed, or ID..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10"
            />
          </div>

          {/* Animal List */}
          <AnimalList animals={filteredAnimals} onDelete={handleDelete} />

          {filteredAnimals.length === 0 && searchTerm && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No animals match your search.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
