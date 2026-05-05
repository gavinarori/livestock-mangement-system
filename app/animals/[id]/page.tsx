'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft, Edit, Share2 } from 'lucide-react'

const ANIMAL_COLORS: Record<string, string> = {
  cattle: 'bg-amber-100 text-amber-800',
  sheep: 'bg-gray-100 text-gray-800',
  goat: 'bg-orange-100 text-orange-800',
  pig: 'bg-pink-100 text-pink-800',
  poultry: 'bg-yellow-100 text-yellow-800',
  horse: 'bg-red-100 text-red-800',
  other: 'bg-slate-100 text-slate-800'
}

const HEALTH_COLORS: Record<string, string> = {
  healthy: 'bg-green-100 text-green-800',
  sick: 'bg-red-100 text-red-800',
  injured: 'bg-yellow-100 text-yellow-800',
  recovering: 'bg-blue-100 text-blue-800'
}

export default function AnimalDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [animal, setAnimal] = useState(null)
  const [share, setShare] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    fetchData(params.id as string, token)
  }, [params.id, router])

  const fetchData = async (id: string, token: string) => {
    try {
      setLoading(true)
      const [animalRes, shareRes] = await Promise.all([
        fetch(`/api/animals/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/animals/${id}/share`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      if (!animalRes.ok) {
        if (animalRes.status === 401) {
          router.push('/login')
          return
        }
        if (animalRes.status === 404) {
          setError('Animal not found')
          return
        }
        throw new Error('Failed to fetch animal')
      }

      const animalData = await animalRes.json()
      setAnimal(animalData.animal)

      if (shareRes.ok) {
        const shareData = await shareRes.json()
        setShare(shareData.share)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load animal')
      console.error('[v0] Fetch data error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    try {
      setShareLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`/api/animals/${params.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isPublic: true })
      })

      if (!response.ok) {
        throw new Error('Failed to create share link')
      }

      const data = await response.json()
      setShare(data.share)
    } catch (err: any) {
      console.error('[v0] Share error:', err)
      setError(err.message || 'Failed to create share link')
    } finally {
      setShareLoading(false)
    }
  }

  const copyShareLink = () => {
    if (share?.shareCode) {
      const url = `${window.location.origin}/share/${share.shareCode}`
      navigator.clipboard.writeText(url).then(() => {
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      })
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
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">{error || 'Animal not found'}</p>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  const animal_: any = animal

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-2 mb-6">
          <Link href="/animals">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex gap-2">
            {share?.shareCode ? (
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={copyShareLink}
              >
                <Share2 className="w-4 h-4" />
                {copySuccess ? 'Copied!' : 'Share'}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={handleShare}
                disabled={shareLoading}
              >
                <Share2 className="w-4 h-4" />
                {shareLoading ? 'Creating...' : 'Share'}
              </Button>
            )}
            <Link href={`/animals/${animal_._id}/edit`}>
              <Button className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div>
                <CardTitle className="text-3xl">{animal_.name}</CardTitle>
                <div className="flex gap-2 mt-2">
                  <Badge className={ANIMAL_COLORS[animal_.type]}>
                    {animal_.type}
                  </Badge>
                  {animal_.healthStatus && (
                    <Badge className={HEALTH_COLORS[animal_.healthStatus]}>
                      {animal_.healthStatus}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {animal_.breed && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Breed</p>
                  <p className="text-foreground">{animal_.breed}</p>
                </div>
              )}
              {animal_.identifier && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ID / Tag Number</p>
                  <p className="text-foreground">{animal_.identifier}</p>
                </div>
              )}
              {animal_.dateOfBirth && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                  <p className="text-foreground">
                    {new Date(animal_.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
              )}
              {animal_.weight && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Weight</p>
                  <p className="text-foreground">{animal_.weight} kg</p>
                </div>
              )}
              {animal_.color && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Color / Markings</p>
                  <p className="text-foreground">{animal_.color}</p>
                </div>
              )}
            </div>

            {animal_.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
                <p className="text-foreground whitespace-pre-wrap">{animal_.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
