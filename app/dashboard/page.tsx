'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  Heart,
  Plus,
  Settings,
  TrendingUp,
  Users,
  AlertCircle,
  ArrowRight,
  Activity
} from 'lucide-react'

interface DashboardStats {
  totalAnimals: number
  healthyCount: number
  sickCount: number
  recentActivityCount: number
  memberCount: number
  organizationName: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      // Fetch analytics and org data in parallel
      const [analyticsRes, orgRes] = await Promise.all([
        fetch('/api/analytics', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/organization', { headers: { Authorization: `Bearer ${token}` } })
      ])

      if (!analyticsRes.ok || !orgRes.ok) {
        if (analyticsRes.status === 401 || orgRes.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch dashboard data')
      }

      const analyticsData = await analyticsRes.json()
      const orgData = await orgRes.json()

      setStats({
        totalAnimals: analyticsData.herd.total,
        healthyCount: analyticsData.herd.byHealth['HEALTHY'] || 0,
        sickCount: analyticsData.herd.byHealth['SICK'] || 0,
        recentActivityCount: analyticsData.health.recentRecords.length,
        memberCount: orgData.organization.memberCount || 0,
        organizationName: orgData.organization.name
      })
    } catch (err: any) {
      console.error('[v0] Dashboard fetch error:', err)
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-pulse" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive mb-4">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const quickActions = [
    { label: 'Add Animal', icon: Plus, href: '/animals/new', color: 'bg-blue-100 text-blue-600' },
    { label: 'View Analytics', icon: BarChart3, href: '/analytics', color: 'bg-purple-100 text-purple-600' },
    { label: 'Manage Team', icon: Users, href: '/settings?tab=members', color: 'bg-green-100 text-green-600' },
    { label: 'Settings', icon: Settings, href: '/settings', color: 'bg-gray-100 text-gray-600' }
  ]

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">Welcome to {stats?.organizationName}</h1>
          <p className="text-gray-600">Enterprise Livestock Management System</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Animals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalAnimals || 0}</div>
              <p className="text-xs text-gray-500 mt-1">In your herd</p>
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
              <div className="text-3xl font-bold text-green-600">{stats?.healthyCount || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Animals</p>
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
              <div className="text-3xl font-bold text-red-600">{stats?.sickCount || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Needing attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats?.recentActivityCount || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Recent records</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats?.memberCount || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Members</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and management tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <Link key={action.href} href={action.href}>
                    <Button
                      variant="outline"
                      className="w-full h-auto py-4 flex flex-col items-center gap-2"
                    >
                      <div className={`p-2 rounded-lg ${action.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-medium text-center">{action.label}</span>
                    </Button>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Feature Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Animal Management</CardTitle>
              <CardDescription>Comprehensive herd tracking and management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg mt-1">
                  <Plus className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Track Animals</p>
                  <p className="text-xs text-gray-600">Record details, breeds, genetics, and identification</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg mt-1">
                  <Heart className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Health Monitoring</p>
                  <p className="text-xs text-gray-600">Document vaccinations, treatments, and health status</p>
                </div>
              </div>
              <Link href="/animals">
                <Button variant="outline" className="w-full mt-3">
                  Manage Animals
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analytics & Reporting</CardTitle>
              <CardDescription>Data-driven insights for your farm</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg mt-1">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Herd Metrics</p>
                  <p className="text-xs text-gray-600">Track composition, health trends, and performance</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-100 rounded-lg mt-1">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Disease Tracking</p>
                  <p className="text-xs text-gray-600">Monitor disease patterns and health alerts</p>
                </div>
              </div>
              <Link href="/analytics">
                <Button variant="outline" className="w-full mt-3">
                  View Analytics
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Management</CardTitle>
              <CardDescription>Collaborate with your farm team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg mt-1">
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Role-Based Access</p>
                  <p className="text-xs text-gray-600">Admin, Manager, Veterinarian, Worker, Viewer roles</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-pink-100 rounded-lg mt-1">
                  <Settings className="w-4 h-4 text-pink-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Permissions</p>
                  <p className="text-xs text-gray-600">Granular control over who can access what</p>
                </div>
              </div>
              <Link href="/settings?tab=members">
                <Button variant="outline" className="w-full mt-3">
                  Manage Team
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>Configure your enterprise setup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-teal-100 rounded-lg mt-1">
                  <Activity className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Plan & Limits</p>
                  <p className="text-xs text-gray-600">Check your subscription and resource usage</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg mt-1">
                  <Settings className="w-4 h-4 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Organization Info</p>
                  <p className="text-xs text-gray-600">Update name, description, and branding</p>
                </div>
              </div>
              <Link href="/settings">
                <Button variant="outline" className="w-full mt-3">
                  Settings
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
