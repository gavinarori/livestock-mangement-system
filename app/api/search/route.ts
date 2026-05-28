

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withOrgAuth, AuthContext } from '@/lib/auth/middleware'

export interface SearchResult {
  id: string
  type: 'animal' | 'health_record' | 'breeding' | 'treatment' | 'outbreak'
  title: string
  subtitle: string
  href: string
  badge?: string
  badgeColor?: string
  meta?: string
}

const handler = async (
  req: NextRequest,
  context: any,
  auth: AuthContext
) => {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim()

    if (!q || q.length < 2) {
      return NextResponse.json({
        results: [],
        total: 0,
        query: q ?? '',
      })
    }

    const orgId = auth.organizationId

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 401 }
      )
    }



    const [animals, healthRecords, breedings, treatments, outbreaks] =
      await Promise.all([
        // Animals
        prisma.animal.findMany({
          where: {
            organizationId: orgId,
            OR: [
              {
                name: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
              {
                identificationId: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
              {
                breed: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
              {
                location: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
            ],
          },
          select: {
            id: true,
            name: true,
            identificationId: true,
            type: true,
            breed: true,
            healthStatus: true,
            location: true,
          },
          take: 6,
        }),

        // Health records
        prisma.healthRecord.findMany({
          where: {
            organizationId: orgId,
            OR: [
              {
                diagnosis: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
              {
                notes: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
              {
                treatment: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
            ],
          },
          select: {
            id: true,
            diagnosis: true,
            recordType: true,
            date: true,
            animal: {
              select: {
                id: true,
                name: true,
                identificationId: true,
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
          take: 4,
        }),

        // Breedings
        prisma.breeding.findMany({
          where: {
            organizationId: orgId,
            OR: [
              {
                dam: {
                  is: {
                    name: {
                      contains: q,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                sire: {
                  is: {
                    name: {
                      contains: q,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                notes: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
              {
                veterinarian: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
            ],
          },
          select: {
            id: true,
            breedingDate: true,
            outcome: true,
            method: true,
            dam: {
              select: {
                id: true,
                name: true,
              },
            },
            sire: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            breedingDate: 'desc',
          },
          take: 3,
        }),

        // Treatments
        prisma.treatment.findMany({
          where: {
            organizationId: orgId,
            OR: [
              {
                condition: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
              {
                medication: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
              {
                notes: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
              {
                assignedVetName: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
            ],
          },
          select: {
            id: true,
            condition: true,
            status: true,
            priority: true,
            startDate: true,
            animal: {
              select: {
                id: true,
                name: true,
                identificationId: true,
              },
            },
          },
          orderBy: {
            startDate: 'desc',
          },
          take: 3,
        }),

        // Disease outbreaks
        prisma.diseaseOutbreak.findMany({
          where: {
            organizationId: orgId,
            OR: [
              {
                name: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
              {
                notes: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
              {
                containmentNotes: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
              {
                treatmentProtocol: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
            ],
          },
          select: {
            id: true,
            name: true,
            severity: true,
            isActive: true,
            category: true,
            firstCaseDate: true,
          },
          orderBy: {
            firstCaseDate: 'desc',
          },
          take: 3,
        }),
      ])



    const results: SearchResult[] = []

    const healthBadgeColor: Record<string, string> = {
      HEALTHY: 'emerald',
      SICK: 'red',
      INJURED: 'orange',
      RECOVERING: 'blue',
      DECEASED: 'gray',
    }

    // Animals
    for (const a of animals) {
      results.push({
        id: a.id,
        type: 'animal',
        title: a.name,
        subtitle: [a.type, a.breed].filter(Boolean).join(' · '),
        href: `/animals/${a.id}`,
        badge: a.healthStatus,
        badgeColor: healthBadgeColor[a.healthStatus] ?? 'gray',
        meta: a.identificationId
          ? `ID: ${a.identificationId}`
          : a.location
          ? `Location: ${a.location}`
          : undefined,
      })
    }

    // Health records
    for (const hr of healthRecords) {
      results.push({
        id: hr.id,
        type: 'health_record',
        title: hr.diagnosis ?? `${hr.recordType} record`,
        subtitle: hr.animal
          ? `${hr.animal.name} (${hr.animal.identificationId ?? 'No ID'})`
          : 'Unknown animal',
        href: `/animals/${hr.animal?.id}?tab=health`,
        badge: hr.recordType,
        badgeColor: 'purple',
        meta: hr.date
          ? new Date(hr.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : undefined,
      })
    }

    // Breedings
    for (const b of breedings) {
      results.push({
        id: b.id,
        type: 'breeding',
        title: `${b.dam?.name ?? 'Dam'} × ${b.sire?.name ?? 'Sire'}`,
        subtitle: `${b.method} · ${b.outcome}`,
        href: `/breeding/${b.id}`,
        badge: b.outcome,
        badgeColor:
          b.outcome === 'SUCCESSFUL'
            ? 'emerald'
            : b.outcome === 'PENDING'
            ? 'amber'
            : 'red',
        meta: b.breedingDate
          ? new Date(b.breedingDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : undefined,
      })
    }

    // Treatments
    for (const t of treatments) {
      results.push({
        id: t.id,
        type: 'treatment',
        title: t.condition,
        subtitle: t.animal
          ? `${t.animal.name} (${t.animal.identificationId ?? 'No ID'})`
          : 'Unknown animal',
        href: `/animals/${t.animal?.id}?tab=treatments`,
        badge: t.priority,
        badgeColor:
          t.priority === 'CRITICAL'
            ? 'red'
            : t.priority === 'HIGH'
            ? 'orange'
            : t.priority === 'MEDIUM'
            ? 'amber'
            : 'blue',
        meta: t.status,
      })
    }

    // Outbreaks
    for (const o of outbreaks) {
      results.push({
        id: o.id,
        type: 'outbreak',
        title: o.name,
        subtitle: `${o.category} · ${o.severity}`,
        href: `/health?outbreak=${o.id}`,
        badge: o.isActive ? 'ACTIVE' : 'RESOLVED',
        badgeColor: o.isActive ? 'red' : 'emerald',
        meta: o.firstCaseDate
          ? `Since ${new Date(o.firstCaseDate).toLocaleDateString(
              'en-US',
              {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }
            )}`
          : undefined,
      })
    }

    return NextResponse.json({
      results,
      total: results.length,
      query: q,
    })
  } catch (error: any) {
    console.error('[Search Error Full]', {
      message: error?.message,
      stack: error?.stack,
      error,
    })

    return NextResponse.json(
      {
        error: 'Search failed',
        details: error?.message ?? 'Unknown error',
        stack:
          process.env.NODE_ENV === 'development'
            ? error?.stack
            : undefined,
      },
      { status: 500 }
    )
  }
}

export const GET = withOrgAuth('analytics:read')(handler)

