import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withOrgAuth } from '@/lib/auth/middleware'
import { AuthContext } from '@/lib/auth/middleware'
import { HealthStatus } from '@prisma/client'

const handler = async (
  req: NextRequest,
  context: any,
  auth: AuthContext
) => {
  try {
    // Get herd statistics
    const animals = await prisma.animal.findMany({
      where: { organizationId: auth.organizationId }
    })

    const totalAnimals = animals.length
    const animalsByType = animals.reduce((acc: any, animal: any) => {
      acc[animal.type] = (acc[animal.type] || 0) + 1
      return acc
    }, {})

    const animalsByHealth = animals.reduce((acc: any, animal: any) => {
      acc[animal.healthStatus] = (acc[animal.healthStatus] || 0) + 1
      return acc
    }, {})

    // Get recent health records
    const recentHealthRecords = await prisma.healthRecord.findMany({
      where: { organizationId: auth.organizationId },
      orderBy: { date: 'desc' },
      take: 10,
      include: { animal: true }
    })

    // Get vaccination status
    const vaccinationStats = await prisma.healthRecord.groupBy({
      by: ['vaccinationStatus'],
      where: { organizationId: auth.organizationId },
      _count: true
    })

    // Get disease trends (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentDiseases = await prisma.healthRecord.findMany({
      where: {
        organizationId: auth.organizationId,
        date: { gte: thirtyDaysAgo },
        recordType: 'diagnosis'
      },
      include: { animal: true },
      orderBy: { date: 'desc' }
    })

    const diseaseCount = recentDiseases.reduce((acc: any, record: any) => {
      const disease = record.diagnosis || 'Unknown'
      acc[disease] = (acc[disease] || 0) + 1
      return acc
    }, {})

    // Get breeding records
    const breedings = await prisma.breeding.findMany({
      where: { organizationId: auth.organizationId },
      include: {
        animal: true,
        breedingAnimal: true
      }
    })

    return NextResponse.json({
      herd: {
        total: totalAnimals,
        byType: animalsByType,
        byHealth: animalsByHealth
      },
      health: {
        recentRecords: recentHealthRecords,
        vaccinationStats,
        diseaseCount,
        recentDiseases: recentDiseases.slice(0, 5)
      },
      breeding: {
        total: breedings.length,
        recent: breedings.slice(0, 5)
      }
    })
  } catch (error: any) {
    console.error('[v0] Analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}

export const GET = withOrgAuth('analytics:read')(handler)
