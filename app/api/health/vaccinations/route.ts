// app/api/health/vaccinations/route.ts
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

const CreateVaccSchema = z.object({
  animalId: z.string().min(1),
  vaccineName: z.string().min(1, 'Vaccine name required'),
  vaccineType: z.string().min(1, 'Vaccine type required'),
  dueDate: z.string().refine(d => !isNaN(Date.parse(d))),
  administeredAt: z.string().optional().nullable(),
  status: z.enum(['UPCOMING', 'OVERDUE', 'COMPLETED', 'SKIPPED']).default('UPCOMING'),
  batchNumber: z.string().optional().nullable(),
  dosage: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  nextBoosterDate: z.string().optional().nullable(),
  assignedVetId: z.string().optional().nullable(),
  assignedVetName: z.string().optional().nullable(),
  administeredById: z.string().optional().nullable(),
  administeredByName: z.string().optional().nullable(),
  sideEffects: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// Auto-recalculate overdue status
async function refreshOverdueStatuses(organizationId: string) {
  await prisma.vaccinationSchedule.updateMany({
    where: {
      organizationId,
      status: 'UPCOMING',
      dueDate: { lt: new Date() },
    },
    data: { status: 'OVERDUE' },
  })
}

export async function GET(req: NextRequest) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await refreshOverdueStatuses(payload.organizationId)

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const animalId = searchParams.get('animalId')
    const vetId = searchParams.get('vetId')
    const search = searchParams.get('search')?.trim()
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')))

    const where: any = { organizationId: payload.organizationId }
    if (status) where.status = status
    if (animalId) where.animalId = animalId
    if (vetId) where.assignedVetId = vetId
    if (search) {
      where.OR = [
        { vaccineName: { contains: search, mode: 'insensitive' } },
        { vaccineType: { contains: search, mode: 'insensitive' } },
        { animal: { name: { contains: search, mode: 'insensitive' } } },
        { assignedVetName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [schedules, total] = await Promise.all([
      prisma.vaccinationSchedule.findMany({
        where,
        include: {
          animal: { select: { id: true, name: true, type: true, breed: true, identificationId: true } },
          createdBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: { dueDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.vaccinationSchedule.count({ where }),
    ])

    return NextResponse.json({ schedules, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (e: any) {
    console.error('[health/vaccinations] GET:', e)
    return NextResponse.json({ error: 'Failed to fetch vaccination schedules' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Only Admins, Managers, and Veterinarians can schedule vaccinations.' }, { status: 403 })
    }

    const body = await req.json()
    const v = CreateVaccSchema.parse(body)

    const animal = await prisma.animal.findFirst({
      where: { id: v.animalId, organizationId: payload.organizationId },
    })
    if (!animal) return NextResponse.json({ error: 'Animal not found.' }, { status: 404 })

    // Resolve vet name from profile if ID given
    let vetName = v.assignedVetName ?? null
    if (v.assignedVetId && !vetName) {
      const vet = await prisma.vetProfile.findFirst({
        where: { id: v.assignedVetId, organizationId: payload.organizationId },
        select: { name: true },
      })
      vetName = vet?.name ?? null
    }

    // Auto-determine status from dueDate
    const dueDate = new Date(v.dueDate)
    let status: any = v.status
    if (status === 'UPCOMING' && dueDate < new Date()) status = 'OVERDUE'

    const schedule = await prisma.vaccinationSchedule.create({
      data: {
        animalId: v.animalId,
        organizationId: payload.organizationId,
        vaccineName: v.vaccineName,
        vaccineType: v.vaccineType,
        dueDate,
        administeredAt: v.administeredAt ? new Date(v.administeredAt) : null,
        status,
        batchNumber: v.batchNumber ?? null,
        dosage: v.dosage ?? null,
        route: v.route ?? null,
        manufacturer: v.manufacturer ?? null,
        expiryDate: v.expiryDate ? new Date(v.expiryDate) : null,
        nextBoosterDate: v.nextBoosterDate ? new Date(v.nextBoosterDate) : null,
        assignedVetId: v.assignedVetId ?? null,
        assignedVetName: vetName,
        administeredById: v.administeredById ?? null,
        administeredByName: v.administeredByName ?? null,
        sideEffects: v.sideEffects ?? null,
        notes: v.notes ?? null,
        createdById: payload.userId,
      },
      include: {
        animal: { select: { id: true, name: true, type: true, breed: true, identificationId: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    })

    return NextResponse.json({ message: 'Vaccination scheduled.', schedule }, { status: 201 })
  } catch (e: any) {
    console.error('[health/vaccinations] POST:', e)
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Failed to schedule vaccination' }, { status: 500 })
  }
}