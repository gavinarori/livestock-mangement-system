// app/api/health/treatments/route.ts
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

const StepSchema = z.object({
  label: z.string().min(1),
  done: z.boolean().default(false),
  completedAt: z.string().optional().nullable(),
  completedBy: z.string().optional().nullable(),
})

const CreateTreatmentSchema = z.object({
  animalId: z.string().min(1),
  condition: z.string().min(1, 'Condition required'),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('PENDING'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  startDate: z.string().refine(d => !isNaN(Date.parse(d))),
  endDate: z.string().optional().nullable(),
  medication: z.string().optional().nullable(),
  dosage: z.string().optional().nullable(),
  frequency: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  temperature: z.number().min(30).max(45).optional().nullable(),
  weight: z.number().min(0).optional().nullable(),
  assignedVetId: z.string().optional().nullable(),
  assignedVetName: z.string().optional().nullable(),
  steps: z.array(StepSchema).default([]),
  diagnosisSource: z.enum(['clinical', 'lab', 'observation']).optional().nullable(),
  labReference: z.string().optional().nullable(),
  isolationRequired: z.boolean().default(false),
  isolationLocation: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const animalId = searchParams.get('animalId')
    const vetId = searchParams.get('vetId')
    const search = searchParams.get('search')?.trim()
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))

    const where: any = { organizationId: payload.organizationId }
    if (status) where.status = status
    if (priority) where.priority = priority
    if (animalId) where.animalId = animalId
    if (vetId) where.assignedVetId = vetId
    if (search) {
      where.OR = [
        { condition: { contains: search, mode: 'insensitive' } },
        { animal: { name: { contains: search, mode: 'insensitive' } } },
        { assignedVetName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [treatments, total] = await Promise.all([
      prisma.treatment.findMany({
        where,
        include: {
          animal: { select: { id: true, name: true, type: true, breed: true, identificationId: true, healthStatus: true } },
          createdBy: { select: { id: true, name: true, role: true } },
          updatedBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: [{ priority: 'desc' }, { startDate: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.treatment.count({ where }),
    ])

    return NextResponse.json({ treatments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (e: any) {
    console.error('[health/treatments] GET:', e)
    return NextResponse.json({ error: 'Failed to fetch treatments' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Only Admins, Managers, and Veterinarians can create treatment records.' }, { status: 403 })
    }

    const body = await req.json()
    const v = CreateTreatmentSchema.parse(body)

    const animal = await prisma.animal.findFirst({
      where: { id: v.animalId, organizationId: payload.organizationId },
    })
    if (!animal) return NextResponse.json({ error: 'Animal not found.' }, { status: 404 })

    let vetName = v.assignedVetName ?? null
    if (v.assignedVetId && !vetName) {
      const vet = await prisma.vetProfile.findFirst({
        where: { id: v.assignedVetId, organizationId: payload.organizationId },
        select: { name: true },
      })
      vetName = vet?.name ?? null
    }

    const treatment = await prisma.treatment.create({
      data: {
        animalId: v.animalId,
        organizationId: payload.organizationId,
        condition: v.condition,
        status: v.status,
        priority: v.priority,
        startDate: new Date(v.startDate),
        endDate: v.endDate ? new Date(v.endDate) : null,
        medication: v.medication ?? null,
        dosage: v.dosage ?? null,
        frequency: v.frequency ?? null,
        route: v.route ?? null,
        temperature: v.temperature ?? null,
        weight: v.weight ?? null,
        assignedVetId: v.assignedVetId ?? null,
        assignedVetName: vetName,
        steps: v.steps,
        diagnosisSource: v.diagnosisSource ?? null,
        labReference: v.labReference ?? null,
        isolationRequired: v.isolationRequired,
        isolationLocation: v.isolationLocation ?? null,
        followUpDate: v.followUpDate ? new Date(v.followUpDate) : null,
        notes: v.notes ?? null,
        createdById: payload.userId,
      },
      include: {
        animal: { select: { id: true, name: true, type: true, breed: true, identificationId: true, healthStatus: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    })

    // Update animal health status
    if ((v.status === 'PENDING' || v.status === 'IN_PROGRESS') && animal.healthStatus === 'HEALTHY') {
      const newStatus = v.priority === 'CRITICAL' || v.priority === 'HIGH' ? 'SICK' : 'RECOVERING'
      await prisma.animal.update({ where: { id: v.animalId }, data: { healthStatus: newStatus } })
    }
    if (v.status === 'COMPLETED') {
      await prisma.animal.update({ where: { id: v.animalId }, data: { healthStatus: 'RECOVERING' } })
    }

    // Increment vet case count
    if (v.assignedVetId && (v.status === 'PENDING' || v.status === 'IN_PROGRESS')) {
      await prisma.vetProfile.updateMany({
        where: { id: v.assignedVetId, organizationId: payload.organizationId },
        data: { currentCaseCount: { increment: 1 } },
      })
    }

    return NextResponse.json({ message: 'Treatment created.', treatment }, { status: 201 })
  } catch (e: any) {
    console.error('[health/treatments] POST:', e)
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Failed to create treatment' }, { status: 500 })
  }
}