'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AnimalForm } from '@/components/animals/animal-form'
import { ArrowLeft } from 'lucide-react'

export default function NewAnimalPage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  const handleSubmit = async (data: any) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/animals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create animal')
      }

      router.push('/animals')
    } catch (err: any) {
      throw err
    }
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/animals">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <div className="space-y-2 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Add New Animal</h1>
          <p className="text-muted-foreground">Fill in the details to add a new animal to your inventory</p>
        </div>

        <AnimalForm onSubmit={handleSubmit} submitLabel="Create Animal" />
      </div>
    </main>
  )
}
