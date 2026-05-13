// File: app/api/breeding/heat-cycles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withOrgAuth, AuthContext } from '@/lib/auth/middleware'
import { z } from 'zod'
import { HeatCycleStatus, AnimalGender, HealthStatus } from '@prisma/client'

const WRITE_ROLES = ['ADMIN', 'MANAGER', 'VETERINARIAN']

const CreateHeatCycleSchema = z.object({
  animalId: z.string().min(1, 'Animal is required'),
  lastHeatDate: z.string().refine(d => !isNaN(Date.parse(d)), 'Invalid last heat date'),
  cycleLengthDays: z.number().int().min(14).max(365).default(21),
  status: z.nativeEnum(HeatCycleStatus).default('ACTIVE'),
  intensity: z.enum(['mild', 'moderate', 'strong']).optional().nullable(),
  observedBy: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

function calculateNextHeatDate(lastHeatDate: Date, cycleLengthDays: number): Date {
  const next = new Date(lastHeatDate)
  next.setDate(next.getDate() + cycleLengthDays)
  return next
}

function deriveHeatStatus(nextExpectedDate: Date, currentStatus: HeatCycleStatus): HeatCycleStatus {
  if (currentStatus === HeatCycleStatus.BRED) return HeatCycleStatus.BRED
  const now = new Date()
  const daysUntil = Math.round((nextExpectedDate.getTime() - now.getTime()) / 86400000)
  if (daysUntil < -1) return HeatCycleStatus.OVERDUE
  if (daysUntil <= 3) return HeatCycleStatus.ACTIVE
  return HeatCycleStatus.EXPECTED
}

// ── GET: List heat cycles ──────────────────────────────────────────────────────
async function getHandler(req: NextRequest, context: any, auth: AuthContext) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') as HeatCycleStatus | null
    const animalId = searchParams.get('animalId')
    const search = searchParams.get('search')?.trim()
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')))

    const where: any = { organizationId: auth.organizationId }
    if (status) where.status = status
    if (animalId) where.animalId = animalId
    if (search) {
      where.animal = { name: { contains: search, mode: 'insensitive' } }
    }

    // Auto-recalculate overdue statuses in background (best-effort)
    const overdueRecords = await prisma.heatCycle.findMany({
      where: {
        organizationId: auth.organizationId,
        status: { in: [HeatCycleStatus.EXPECTED, HeatCycleStatus.ACTIVE] },
        nextExpectedDate: { lt: new Date(Date.now() - 86400000) }, // > 1 day ago
      },
      select: { id: true },
    })
    if (overdueRecords.length > 0) {
      await prisma.heatCycle.updateMany({
        where: { id: { in: overdueRecords.map(r => r.id) } },
        data: { status: HeatCycleStatus.OVERDUE },
      })
    }

    const [cycles, total] = await Promise.all([
      prisma.heatCycle.findMany({
        where,
        include: {
          animal: {
            select: {
              id: true, name: true, type: true, breed: true,
              gender: true, identificationId: true, healthStatus: true,
            },
          },
          createdBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: { nextExpectedDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.heatCycle.count({ where }),
    ])

    return NextResponse.json({
      cycles,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error: any) {
    console.error('[breeding] GET heat-cycles error:', error)
    return NextResponse.json({ error: 'Failed to fetch heat cycles' }, { status: 500 })
  }
}

// ── POST: Create heat cycle ────────────────────────────────────────────────────
async function postHandler(req: NextRequest, context: any, auth: AuthContext) {
  try {
    if (!WRITE_ROLES.includes(auth.role)) {
      return NextResponse.json(
        { error: 'Only Admins, Managers, and Veterinarians can log heat cycles.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validated = CreateHeatCycleSchema.parse(body)

    // Validate animal exists, belongs to org, and is female
    const animal = await prisma.animal.findFirst({
      where: { id: validated.animalId, organizationId: auth.organizationId },
      select: { id: true, name: true, gender: true, healthStatus: true, type: true },
    })

    if (!animal) {
      return NextResponse.json({ error: 'Animal not found in your organization.' }, { status: 404 })
    }
    if (animal.gender !== AnimalGender.FEMALE) {
      return NextResponse.json(
        { error: `"${animal.name}" is not female. Heat cycles only apply to female animals.` },
        { status: 422 }
      )
    }
    if (animal.healthStatus === HealthStatus.DECEASED) {
      return NextResponse.json(
        { error: `"${animal.name}" is deceased and cannot have heat cycles logged.` },
        { status: 422 }
      )
    }

    const lastHeatDate = new Date(validated.lastHeatDate)
    const nextExpectedDate = calculateNextHeatDate(lastHeatDate, validated.cycleLengthDays)
    const derivedStatus = deriveHeatStatus(nextExpectedDate, validated.status)

    const cycle = await prisma.heatCycle.create({
      data: {
        animalId: validated.animalId,
        organizationId: auth.organizationId,
        lastHeatDate,
        nextExpectedDate,
        cycleLengthDays: validated.cycleLengthDays,
        status: derivedStatus,
        intensity: validated.intensity ?? null,
        observedBy: validated.observedBy ?? null,
        notes: validated.notes ?? null,
        createdById: auth.userId,
      },
      include: {
        animal: {
          select: { id: true, name: true, type: true, breed: true, gender: true, identificationId: true },
        },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    })

    return NextResponse.json({ message: 'Heat cycle logged successfully.', cycle }, { status: 201 })
  } catch (error: any) {
    console.error('[breeding] POST heat-cycles error:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to log heat cycle' }, { status: 500 })
  }
}

// ── DELETE heat cycle ──────────────────────────────────────────────────────────
async function deleteHandler(req: NextRequest, context: { params: { id: string } }, auth: AuthContext) {
  try {
    if (!WRITE_ROLES.includes(auth.role)) {
      return NextResponse.json(
        { error: 'Only Admins, Managers, and Veterinarians can delete heat cycles.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Heat cycle ID required.' }, { status: 400 })

    const existing = await prisma.heatCycle.findFirst({
      where: { id, organizationId: auth.organizationId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Heat cycle not found.' }, { status: 404 })
    }

    await prisma.heatCycle.delete({ where: { id } })
    return NextResponse.json({ message: 'Heat cycle deleted successfully.' })
  } catch (error: any) {
    console.error('[breeding] DELETE heat-cycles error:', error)
    return NextResponse.json({ error: 'Failed to delete heat cycle' }, { status: 500 })
  }
}

export const GET = withOrgAuth('breeding:read')(getHandler)
export const POST = withOrgAuth('breeding:manage')(postHandler)
export const DELETE = withOrgAuth('breeding:manage')(deleteHandler as any)