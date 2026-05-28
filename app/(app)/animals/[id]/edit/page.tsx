'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { AnimalForm } from '@/components/animals/animal-form'
import { ArrowLeft } from 'lucide-react'

export default function EditAnimalPage() {
  const router = useRouter()
  const params = useParams()
  const [animal, setAnimal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    fetchAnimal(params.id as string, token)
  }, [params.id, router])

  const fetchAnimal = async (id: string, token: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/animals/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        if (response.status === 404) {
          setError('Animal not found')
          return
        }
        throw new Error('Failed to fetch animal')
      }

      const data = await response.json()
      setAnimal(data.animal)
    } catch (err: any) {
      setError(err.message || 'Failed to load animal')
      console.error('[v0] Fetch animal error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: any) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`/api/animals/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update animal')
      }

      router.push(`/animals/${params.id}`)
    } catch (err: any) {
      throw err
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto flex items-center justify-center h-screen">
          <Spinner className="w-8 h-8" />
        </div>
      </main>
    )
  }

  if (error || !animal) {
    return (
      <main className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/animals">
            <Button variant="ghost" size="sm" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <p className="text-destructive">{error || 'Animal not found'}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Link href={`/animals/${params.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <div className="space-y-2 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Edit Animal</h1>
          <p className="text-muted-foreground">Update the details for {(animal as any).name}</p>
        </div>

        <AnimalForm
          initialData={animal}
          onSubmit={handleSubmit}
          submitLabel="Update Animal"
        />
      </div>
    </main>
  )
}
