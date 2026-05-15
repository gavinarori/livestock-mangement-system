// app/api/health/diseases/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'
import { z } from 'zod'

const WRITE_ROLES = ['ADMIN', 'MANAGER', 'VETERINARIAN']

function auth(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  return verifyToken(token)
}

const CreateDiseaseSchema = z.object({
  name: z.string().min(1, 'Disease name required'),
  category: z.enum(['INFECTIOUS', 'GENETIC', 'NUTRITIONAL', 'ENVIRONMENTAL', 'PARASITIC', 'OTHER']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  trend: z.enum(['RISING', 'STABLE', 'FALLING']).default('STABLE'),
  firstCaseDate: z.string().refine(d => !isNaN(Date.parse(d))),
  lastCaseDate: z.string().refine(d => !isNaN(Date.parse(d))),
  isActive: z.boolean().default(true),
  quarantineActive: z.boolean().default(false),
  quarantineZone: z.string().optional().nullable(),
  containmentNotes: z.string().optional().nullable(),
  treatmentProtocol: z.string().optional().nullable(),
  preventionMeasures: z.string().optional().nullable(),
  labReference: z.string().optional().nullable(),
  reportedToAuthorities: z.boolean().default(false),
  // affected animals: array of { animalId, dateAffected, notes? }
  affectedAnimalIds: z.array(z.object({
    animalId: z.string(),
    dateAffected: z.string(),
    notes: z.string().optional().nullable(),
  })).optional().default([]),
  notes: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const isActive = searchParams.get('isActive')
    const severity = searchParams.get('severity')
    const search = searchParams.get('search')?.trim()
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))

    const where: any = { organizationId: payload.organizationId }
    if (isActive !== null) where.isActive = isActive === 'true'
    if (severity) where.severity = severity
    if (search) where.name = { contains: search, mode: 'insensitive' }

    const [outbreaks, total] = await Promise.all([
      prisma.diseaseOutbreak.findMany({
        where,
        include: {
          affectedAnimals: {
            include: {
              animal: { select: { id: true, name: true, type: true, breed: true, identificationId: true, healthStatus: true } },
            },
          },
          createdBy: { select: { id: true, name: true, role: true } },
          updatedBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: [{ severity: 'desc' }, { lastCaseDate: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.diseaseOutbreak.count({ where }),
    ])

    return NextResponse.json({ outbreaks, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (e: any) {
    console.error('[health/diseases] GET:', e)
    return NextResponse.json({ error: 'Failed to fetch disease outbreaks' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Only Admins, Managers, and Veterinarians can log disease outbreaks.' }, { status: 403 })
    }

    const body = await req.json()
    const v = CreateDiseaseSchema.parse(body)

    // Validate all affected animals belong to org
    if (v.affectedAnimalIds.length > 0) {
      const animalIds = v.affectedAnimalIds.map(a => a.animalId)
      const animals = await prisma.animal.findMany({
        where: { id: { in: animalIds }, organizationId: payload.organizationId },
        select: { id: true },
      })
      const foundIds = new Set(animals.map(a => a.id))
      const missing = animalIds.filter(id => !foundIds.has(id))
      if (missing.length > 0) {
        return NextResponse.json({ error: `Some animals not found: ${missing.join(', ')}` }, { status: 404 })
      }
    }

    const outbreak = await prisma.diseaseOutbreak.create({
      data: {
        organizationId: payload.organizationId,
        name: v.name,
        category: v.category,
        severity: v.severity,
        trend: v.trend,
        firstCaseDate: new Date(v.firstCaseDate),
        lastCaseDate: new Date(v.lastCaseDate),
        isActive: v.isActive,
        quarantineActive: v.quarantineActive,
        quarantineZone: v.quarantineZone ?? null,
        containmentNotes: v.containmentNotes ?? null,
        treatmentProtocol: v.treatmentProtocol ?? null,
        preventionMeasures: v.preventionMeasures ?? null,
        labReference: v.labReference ?? null,
        reportedToAuthorities: v.reportedToAuthorities,
        notes: v.notes ?? null,
        createdById: payload.userId,
        affectedAnimals: v.affectedAnimalIds.length > 0 ? {
          create: v.affectedAnimalIds.map(a => ({
            animalId: a.animalId,
            dateAffected: new Date(a.dateAffected),
            notes: a.notes ?? null,
          })),
        } : undefined,
      },
      include: {
        affectedAnimals: {
          include: {
            animal: { select: { id: true, name: true, type: true, breed: true, identificationId: true, healthStatus: true } },
          },
        },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    })

    // Update affected animals' health status to SICK
    if (v.affectedAnimalIds.length > 0) {
      await prisma.animal.updateMany({
        where: {
          id: { in: v.affectedAnimalIds.map(a => a.animalId) },
          organizationId: payload.organizationId,
          healthStatus: 'HEALTHY',
        },
        data: { healthStatus: 'SICK' },
      })
    }

    return NextResponse.json({ message: 'Disease outbreak logged.', outbreak }, { status: 201 })
  } catch (e: any) {
    console.error('[health/diseases] POST:', e)
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Failed to log disease outbreak' }, { status: 500 })
  }
}