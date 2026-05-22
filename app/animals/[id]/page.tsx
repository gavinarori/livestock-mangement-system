'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  ArrowLeft,
  Edit,
  Share2,
  Check,
  Copy,
  Weight,
  Calendar,
  Tag,
  Palette,
  FileText,
  Info,
  ExternalLink,
} from 'lucide-react'

/* ─────────────────────────────────────────────
   THEME-ALIGNED METADATA
───────────────────────────────────────────── */

const ANIMAL_META: Record<string, { emoji: string; bg: string; accent: string }> = {
  cattle: { emoji: '🐄', bg: 'bg-card', accent: 'text-primary bg-secondary border-border' },
  sheep: { emoji: '🐑', bg: 'bg-card', accent: 'text-primary bg-muted border-border' },
  goat: { emoji: '🐐', bg: 'bg-card', accent: 'text-primary bg-accent border-border' },
  pig: { emoji: '🐷', bg: 'bg-card', accent: 'text-primary bg-muted border-border' },
  poultry: { emoji: '🐔', bg: 'bg-card', accent: 'text-primary bg-secondary border-border' },
  horse: { emoji: '🐴', bg: 'bg-card', accent: 'text-primary bg-accent border-border' },
  fish: { emoji: '🐟', bg: 'bg-card', accent: 'text-primary bg-muted border-border' },
  aquatic: { emoji: '🦞', bg: 'bg-card', accent: 'text-primary bg-secondary border-border' },
  other: { emoji: '🐾', bg: 'bg-card', accent: 'text-primary bg-muted border-border' },
}

const HEALTH_META: Record<string, { label: string; dot: string; badge: string }> = {
  healthy: {
    label: 'Healthy',
    dot: 'bg-primary',
    badge: 'text-primary bg-secondary border-border',
  },
  sick: {
    label: 'Sick',
    dot: 'bg-destructive',
    badge: 'text-destructive bg-muted border-border',
  },
  injured: {
    label: 'Injured',
    dot: 'bg-accent',
    badge: 'text-accent-foreground bg-accent border-border',
  },
  recovering: {
    label: 'Recovering',
    dot: 'bg-primary',
    badge: 'text-primary bg-secondary border-border',
  },
  deceased: {
    label: 'Deceased',
    dot: 'bg-muted-foreground',
    badge: 'text-muted-foreground bg-muted border-border',
  },
}

/* ─────────────────────────────────────────────
   DETAIL ITEM
───────────────────────────────────────────── */

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | number | undefined | null
}) {
  if (!value && value !== 0) return null

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border shadow-sm hover:shadow-md transition-all">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="w-4 h-4" />
      </span>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground break-words">
          {value}
        </p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */

export default function AnimalDetailPage() {
  const router = useRouter()
  const params = useParams()

  const [animal, setAnimal] = useState<any>(null)
  const [share, setShare] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return router.push('/login')
    fetchData(params.id as string, token)
  }, [params.id])

  const fetchData = async (id: string, token: string) => {
    try {
      setLoading(true)

      const [animalRes, shareRes] = await Promise.all([
        fetch(`/api/animals/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/animals/${id}/share`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (!animalRes.ok) {
        if (animalRes.status === 401) return router.push('/login')
        if (animalRes.status === 404) return setError('Animal not found')
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
    } finally {
      setLoading(false)
    }
  }



  const copyShareLink = () => {
    if (!share?.shareCode) return
    navigator.clipboard.writeText(
      `${window.location.origin}/share/${share.shareCode}`
    )
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  /* ───────────────── LOADING ───────────────── */

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="w-8 h-8 text-muted-foreground" />
      </main>
    )
  }

  /* ───────────────── ERROR ───────────────── */

  if (error || !animal) {
    return (
      <main className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/animals">
            <Button variant="ghost" size="sm" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>

          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-destructive font-medium">
              {error || 'Animal not found'}
            </p>
          </div>
        </div>
      </main>
    )
  }

  /* ───────────────── DATA ───────────────── */

  const type = (animal.type ?? 'other').toLowerCase()
  const healthStatus = (animal.healthStatus ?? 'healthy').toLowerCase()

  const meta = ANIMAL_META[type] ?? ANIMAL_META.other
  const health = HEALTH_META[healthStatus] ?? HEALTH_META.healthy

  const age = animal.dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(animal.dateOfBirth).getTime()) /
          (1000 * 60 * 60 * 24 * 365)
      ) + ' yrs'
    : null

  /* ───────────────── UI ───────────────── */

  return (
    <main className="min-h-screen bg-background">
      {/* TOP BAR */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center justify-between p-4">
          <Link href="/animals">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Animals
            </Button>
          </Link>

          <div className="flex gap-2">

  <Link href={`/animals/${animal.id ?? animal._id}/shares`}>
    <Button variant="outline" size="sm">
      <ExternalLink className="w-4 h-4 mr-2" />
      Shares
    </Button>
  </Link>

  <Link href={`/animals/${animal.id ?? animal._id}/edit`}>
    <Button size="sm">
      <Edit className="w-4 h-4" />
    </Button>
  </Link>
</div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-3xl mx-auto p-6 space-y-6">

        {/* HERO */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex gap-4">
            <div className="text-4xl">{meta.emoji}</div>

            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {animal.name}
              </h1>

              <div className="flex gap-2 mt-2 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-xs border ${meta.accent}`}>
                  {type}
                </span>

                <span className={`px-3 py-1 rounded-full text-xs border ${health.badge}`}>
                  {health.label}
                </span>

                {animal.gender && (
                  <span className="px-3 py-1 rounded-full text-xs bg-muted border border-border text-foreground">
                    {animal.gender}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground flex gap-4">
            {animal.breed && <span>{animal.breed}</span>}
            {age && <span>{age}</span>}
            {animal.weight && <span>{animal.weight} kg</span>}
          </div>
        </div>

        {/* DETAILS */}
        <div className="grid sm:grid-cols-2 gap-3">
          <DetailItem icon={Tag} label="ID" value={animal.identificationId} />
          <DetailItem icon={Calendar} label="DOB" value={animal.dateOfBirth} />
          <DetailItem icon={Weight} label="Weight" value={animal.weight} />
          <DetailItem icon={Palette} label="Color" value={animal.color} />
          <DetailItem icon={Info} label="Location" value={animal.location} />
        </div>

        {/* NOTES */}
        {animal.notes && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex gap-3">
              <FileText className="w-4 h-4 text-muted-foreground mt-1" />
              <p className="text-sm text-foreground">{animal.notes}</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}