'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, BarChart3, Heart, TrendingUp, Users, Activity } from 'lucide-react'

interface HerdStats {
  total: number
  byType: Record<string, number>
  byHealth: Record<string, number>
}

interface HealthStats {
  recentRecords: any[]
  diseaseCount: Record<string, number>
  recentDiseases: any[]
}

interface BreedingStats {
  total: number
  recent: any[]
}

interface Analytics {
  herd: HerdStats
  health: HealthStats
  breeding: BreedingStats
}

export default function AnalyticsDashboard() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/login')
          return
        }

        const response = await fetch('/api/analytics', {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login')
            return
          }
          throw new Error('Failed to fetch analytics')
        }

        const data = await response.json()
        setAnalytics(data)
      } catch (err: any) {
        console.error('[v0] Analytics fetch error:', err)
        setError(err.message || 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-pulse">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Loading analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive mb-4">
              <AlertCircle className="w-5 h-5" />
              <p>{error || 'Failed to load analytics'}</p>
            </div>
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const sickAnimals = analytics.herd.byHealth['SICK'] || 0
  const healthyAnimals = analytics.herd.byHealth['HEALTHY'] || 0

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Enterprise livestock management insights</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Animals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.herd.total}</div>
              <p className="text-xs text-gray-500 mt-1">Across all types</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Heart className="w-4 h-4 text-green-600" />
                Healthy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{healthyAnimals}</div>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.herd.total > 0 ? Math.round((healthyAnimals / analytics.herd.total) * 100) : 0}% of herd
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Sick
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{sickAnimals}</div>
              <p className="text-xs text-gray-500 mt-1">Requiring attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.health.recentRecords.length}</div>
              <p className="text-xs text-gray-500 mt-1">Health records</p>
            </CardContent>
          </Card>
        </div>

        {/* Animals by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Herd Composition</CardTitle>
            <CardDescription>Animals breakdown by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(analytics.herd.byType).map(([type, count]) => (
                <div key={type} className="p-3 border rounded-lg">
                  <p className="text-sm font-medium text-gray-600">{type}</p>
                  <p className="text-2xl font-bold mt-2">{count as number}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Health Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Disease Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Disease Trends (30 Days)</CardTitle>
              <CardDescription>Recent diagnoses in your herd</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.entries(analytics.health.diseaseCount).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(analytics.health.diseaseCount)
                    .sort(([, a]: any, [, b]: any) => b - a)
                    .slice(0, 5)
                    .map(([disease, count]) => (
                      <div key={disease} className="flex items-center justify-between">
                        <span className="text-sm">{disease}</span>
                        <span className="font-medium">{count as number}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No disease records in the last 30 days</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Health Records */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Health Records</CardTitle>
              <CardDescription>Latest health activities</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.health.recentRecords.length > 0 ? (
                <div className="space-y-3">
                  {analytics.health.recentRecords.slice(0, 5).map((record: any) => (
                    <div key={record.id} className="p-2 border rounded text-sm">
                      <div className="flex justify-between mb-1">
                        <p className="font-medium capitalize">{record.recordType}</p>
                        <p className="text-gray-500 text-xs">
                          {new Date(record.date).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-gray-600">{record.animal.name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No health records yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Breeding Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Breeding Program
            </CardTitle>
            <CardDescription>Active breeding records and upcoming births</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 border rounded-lg">
                <p className="text-sm font-medium text-gray-600">Total Breedings</p>
                <p className="text-2xl font-bold mt-2">{analytics.breeding.total}</p>
              </div>
              <div className="p-3 border rounded-lg col-span-2">
                <p className="text-sm font-medium text-gray-600 mb-3">Recent Breeding Records</p>
                {analytics.breeding.recent.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.breeding.recent.slice(0, 3).map((breeding: any) => (
                      <div key={breeding.id} className="text-xs p-2 bg-gray-50 rounded">
                        <p><span className="font-medium">{breeding.animal.name}</span> × <span className="font-medium">{breeding.breedingAnimal.name}</span></p>
                        <p className="text-gray-500">{new Date(breeding.breedingDate).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No breeding records</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
