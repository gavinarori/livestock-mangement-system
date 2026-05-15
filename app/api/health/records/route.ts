// app/api/health/records/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'
import { z } from 'zod'

const WRITE_ROLES = ['ADMIN', 'MANAGER', 'VETERINARIAN']

const CreateHealthRecordSchema = z.object({
  animalId: z.string().min(1, 'Animal is required'),
  recordType: z.enum(['vaccination', 'disease', 'treatment', 'checkup', 'injury', 'lab', 'other']),
  description: z.string().min(1, 'Description is required'),
  date: z.string().refine(d => !isNaN(Date.parse(d)), 'Invalid date'),
  vaccineName: z.string().optional().nullable(),
  vaccinationStatus: z.enum(['NOT_VACCINATED','PARTIALLY_VACCINATED','FULLY_VACCINATED','BOOSTER_DUE','OVERDUE']).optional().nullable(),
  nextDueDate: z.string().optional().nullable(),
  diagnosis: z.string().optional().nullable(),
  diseaseCategory: z.enum(['INFECTIOUS','GENETIC','NUTRITIONAL','ENVIRONMENTAL','PARASITIC','OTHER']).optional().nullable(),
  severity: z.enum(['low','medium','high','critical']).optional().nullable(),
  treatment: z.string().optional().nullable(),
  outcome: z.string().optional().nullable(),
  temperature: z.number().min(30).max(45).optional().nullable(),
  weight: z.number().min(0).optional().nullable(),
  veterinarianId: z.string().optional().nullable(),
  veterinarianName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

function authFromReq(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  return verifyToken(token)
}

export async function GET(req: NextRequest) {
  try {
    const payload = authFromReq(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const animalId = searchParams.get('animalId')
    const recordType = searchParams.get('recordType')
    const search = searchParams.get('search')?.trim()
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))

    const where: any = { organizationId: payload.organizationId }
    if (animalId) where.animalId = animalId
    if (recordType) where.recordType = recordType
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { diagnosis: { contains: search, mode: 'insensitive' } },
        { veterinarianName: { contains: search, mode: 'insensitive' } },
        { animal: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [records, total] = await Promise.all([
      prisma.healthRecord.findMany({
        where,
        include: {
          animal: { select: { id: true, name: true, type: true, breed: true, identificationId: true, healthStatus: true } },
          createdBy: { select: { id: true, name: true, role: true } },
          updatedBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.healthRecord.count({ where }),
    ])

    return NextResponse.json({ records, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (e: any) {
    console.error('[health/records] GET:', e)
    return NextResponse.json({ error: 'Failed to fetch health records' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = authFromReq(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Only Admins, Managers, and Veterinarians can create health records.' }, { status: 403 })
    }

    const body = await req.json()
    const v = CreateHealthRecordSchema.parse(body)

    // Validate animal belongs to org
    const animal = await prisma.animal.findFirst({
      where: { id: v.animalId, organizationId: payload.organizationId },
      select: { id: true, name: true, healthStatus: true },
    })
    if (!animal) return NextResponse.json({ error: 'Animal not found in your organization.' }, { status: 404 })

    // Resolve vet name if vetId provided
    let vetName = v.veterinarianName ?? null
    if (v.veterinarianId && !vetName) {
      const vet = await prisma.vetProfile.findFirst({
        where: { id: v.veterinarianId, organizationId: payload.organizationId },
        select: { name: true },
      })
      vetName = vet?.name ?? null
    }

    // Resolve recorder name
    const recorder = await prisma.user.findUnique({ where: { id: payload.userId }, select: { name: true } })

    const record = await prisma.healthRecord.create({
      data: {
        animalId: v.animalId,
        organizationId: payload.organizationId,
        recordType: v.recordType,
        description: v.description,
        date: new Date(v.date),
        recordedBy: recorder?.name ?? payload.email ?? 'System',
        recordedById: payload.userId,
        vaccineName: v.vaccineName ?? null,
        vaccinationStatus: v.vaccinationStatus ?? null,
        nextDueDate: v.nextDueDate ? new Date(v.nextDueDate) : null,
        diagnosis: v.diagnosis ?? null,
        diseaseCategory: v.diseaseCategory ?? null,
        severity: v.severity ?? null,
        treatment: v.treatment ?? null,
        outcome: v.outcome ?? null,
        temperature: v.temperature ?? null,
        weight: v.weight ?? null,
        veterinarianId: v.veterinarianId ?? null,
        veterinarianName: vetName,
        notes: v.notes ?? null,
        createdById: payload.userId,
      },
      include: {
        animal: { select: { id: true, name: true, type: true, breed: true, identificationId: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    })

    // Auto-update animal health status for disease/injury records
    if (v.recordType === 'disease' && animal.healthStatus === 'HEALTHY') {
      await prisma.animal.update({ where: { id: v.animalId }, data: { healthStatus: 'SICK' } })
    }
    if (v.recordType === 'injury' && animal.healthStatus === 'HEALTHY') {
      await prisma.animal.update({ where: { id: v.animalId }, data: { healthStatus: 'INJURED' } })
    }

    return NextResponse.json({ message: 'Health record created.', record }, { status: 201 })
  } catch (e: any) {
    console.error('[health/records] POST:', e)
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Failed to create health record' }, { status: 500 })
  }
}