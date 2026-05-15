// app/api/health/records/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'
import { z } from 'zod'

const WRITE_ROLES = ['ADMIN', 'MANAGER', 'VETERINARIAN']

function authFromReq(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  return verifyToken(token)
}

const UpdateSchema = z.object({
  recordType: z.enum(['vaccination', 'disease', 'treatment', 'checkup', 'injury', 'lab', 'other']).optional(),
  description: z.string().min(1).optional(),
  date: z.string().optional(),
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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = authFromReq(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const record = await prisma.healthRecord.findFirst({
      where: { id: params.id, organizationId: payload.organizationId },
      include: {
        animal: { select: { id: true, name: true, type: true, breed: true, identificationId: true, healthStatus: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        updatedBy: { select: { id: true, name: true, role: true } },
      },
    })
    if (!record) return NextResponse.json({ error: 'Record not found.' }, { status: 404 })
    return NextResponse.json({ record })
  } catch (e: any) {
    console.error('[health/records/id] GET:', e)
    return NextResponse.json({ error: 'Failed to fetch record' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = authFromReq(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to edit health records.' }, { status: 403 })
    }

    const existing = await prisma.healthRecord.findFirst({
      where: { id: params.id, organizationId: payload.organizationId },
    })
    if (!existing) return NextResponse.json({ error: 'Record not found.' }, { status: 404 })

    const body = await req.json()
    const v = UpdateSchema.parse(body)

    let vetName = v.veterinarianName
    if (v.veterinarianId && !vetName) {
      const vet = await prisma.vetProfile.findFirst({
        where: { id: v.veterinarianId, organizationId: payload.organizationId },
        select: { name: true },
      })
      vetName = vet?.name ?? undefined
    }

    const data: any = { updatedById: payload.userId }
    if (v.recordType !== undefined) data.recordType = v.recordType
    if (v.description !== undefined) data.description = v.description
    if (v.date) data.date = new Date(v.date)
    if (v.vaccineName !== undefined) data.vaccineName = v.vaccineName
    if (v.vaccinationStatus !== undefined) data.vaccinationStatus = v.vaccinationStatus
    if (v.nextDueDate !== undefined) data.nextDueDate = v.nextDueDate ? new Date(v.nextDueDate) : null
    if (v.diagnosis !== undefined) data.diagnosis = v.diagnosis
    if (v.diseaseCategory !== undefined) data.diseaseCategory = v.diseaseCategory
    if (v.severity !== undefined) data.severity = v.severity
    if (v.treatment !== undefined) data.treatment = v.treatment
    if (v.outcome !== undefined) data.outcome = v.outcome
    if (v.temperature !== undefined) data.temperature = v.temperature
    if (v.weight !== undefined) data.weight = v.weight
    if (v.veterinarianId !== undefined) data.veterinarianId = v.veterinarianId
    if (vetName !== undefined) data.veterinarianName = vetName
    if (v.notes !== undefined) data.notes = v.notes

    const record = await prisma.healthRecord.update({
      where: { id: params.id },
      data,
      include: {
        animal: { select: { id: true, name: true, type: true, breed: true, identificationId: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        updatedBy: { select: { id: true, name: true, role: true } },
      },
    })
    return NextResponse.json({ message: 'Record updated.', record })
  } catch (e: any) {
    console.error('[health/records/id] PATCH:', e)
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = authFromReq(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to delete health records.' }, { status: 403 })
    }

    const existing = await prisma.healthRecord.findFirst({
      where: { id: params.id, organizationId: payload.organizationId },
    })
    if (!existing) return NextResponse.json({ error: 'Record not found.' }, { status: 404 })

    await prisma.healthRecord.delete({ where: { id: params.id } })
    return NextResponse.json({ message: 'Record deleted.' })
  } catch (e: any) {
    console.error('[health/records/id] DELETE:', e)
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
  }
}