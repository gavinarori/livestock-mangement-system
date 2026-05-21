import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withOrgAuth } from '@/lib/auth/middleware'
import { AuthContext } from '@/lib/auth/middleware'

const handler = async (
  req: NextRequest,
  context: any,
  auth: AuthContext
) => {
  try {
    // Herd statistics
    const animals = await prisma.animal.findMany({
      where: { organizationId: auth.organizationId }
    })

    const totalAnimals = animals.length

    const animalsByType = animals.reduce((acc: any, animal) => {
      acc[animal.type] = (acc[animal.type] || 0) + 1
      return acc
    }, {})

    const animalsByHealth = animals.reduce((acc: any, animal) => {
      acc[animal.healthStatus] =
        (acc[animal.healthStatus] || 0) + 1
      return acc
    }, {})

    // Recent health records
    const recentHealthRecords =
      await prisma.healthRecord.findMany({
        where: {
          organizationId: auth.organizationId
        },
        orderBy: {
          date: 'desc'
        },
        take: 10,
        include: {
          animal: true
        }
      })

    // Vaccination stats
    const vaccinationRecords =
      await prisma.healthRecord.findMany({
        where: {
          organizationId: auth.organizationId,
          vaccinationStatus: {
            not: null
          }
        },
        select: {
          vaccinationStatus: true
        }
      })

    const vaccinationStats =
      vaccinationRecords.reduce((acc: any, record) => {
        const status =
          record.vaccinationStatus || 'UNKNOWN'

        acc[status] = (acc[status] || 0) + 1

        return acc
      }, {})

    // Disease trends
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    )

    const recentDiseases =
      await prisma.healthRecord.findMany({
        where: {
          organizationId: auth.organizationId,
          date: {
            gte: thirtyDaysAgo
          },
          recordType: 'diagnosis'
        },
        include: {
          animal: true
        },
        orderBy: {
          date: 'desc'
        }
      })

    const diseaseCount = recentDiseases.reduce(
      (acc: any, record) => {
        const disease =
          record.diagnosis || 'Unknown'

        acc[disease] = (acc[disease] || 0) + 1

        return acc
      },
      {}
    )

    // Breeding records
    const breedings = await prisma.breeding.findMany({
      where: {
        organizationId: auth.organizationId
      },
      include: {
        dam: true,
        sire: true
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
    console.error('[Analytics Error]', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch analytics',
        details: error.message
      },
      { status: 500 }
    )
  }
}

export const GET =
  withOrgAuth('analytics:read')(handler)