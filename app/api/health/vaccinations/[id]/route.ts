// app/api/health/vaccinations/[id]/route.ts
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

const UpdateVaccSchema = z.object({
  vaccineName: z.string().optional(),
  vaccineType: z.string().optional(),
  dueDate: z.string().optional(),
  administeredAt: z.string().optional().nullable(),
  status: z.enum(['UPCOMING', 'OVERDUE', 'COMPLETED', 'SKIPPED']).optional(),
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })
    }

    const existing = await prisma.vaccinationSchedule.findFirst({
      where: { id: params.id, organizationId: payload.organizationId },
    })
    if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

    const body = await req.json()
    const v = UpdateVaccSchema.parse(body)

    let vetName = v.assignedVetName
    if (v.assignedVetId && !vetName) {
      const vet = await prisma.vetProfile.findFirst({
        where: { id: v.assignedVetId, organizationId: payload.organizationId },
        select: { name: true },
      })
      vetName = vet?.name ?? undefined
    }

    const data: any = { updatedById: payload.userId }
    if (v.vaccineName) data.vaccineName = v.vaccineName
    if (v.vaccineType) data.vaccineType = v.vaccineType
    if (v.dueDate) data.dueDate = new Date(v.dueDate)
    if (v.administeredAt !== undefined) data.administeredAt = v.administeredAt ? new Date(v.administeredAt) : null
    if (v.status) data.status = v.status
    if (v.batchNumber !== undefined) data.batchNumber = v.batchNumber
    if (v.dosage !== undefined) data.dosage = v.dosage
    if (v.route !== undefined) data.route = v.route
    if (v.manufacturer !== undefined) data.manufacturer = v.manufacturer
    if (v.expiryDate !== undefined) data.expiryDate = v.expiryDate ? new Date(v.expiryDate) : null
    if (v.nextBoosterDate !== undefined) data.nextBoosterDate = v.nextBoosterDate ? new Date(v.nextBoosterDate) : null
    if (v.assignedVetId !== undefined) data.assignedVetId = v.assignedVetId
    if (vetName !== undefined) data.assignedVetName = vetName
    if (v.administeredById !== undefined) data.administeredById = v.administeredById
    if (v.administeredByName !== undefined) data.administeredByName = v.administeredByName
    if (v.sideEffects !== undefined) data.sideEffects = v.sideEffects
    if (v.notes !== undefined) data.notes = v.notes

    const schedule = await prisma.vaccinationSchedule.update({
      where: { id: params.id },
      data,
      include: {
        animal: { select: { id: true, name: true, type: true, breed: true, identificationId: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        updatedBy: { select: { id: true, name: true, role: true } },
      },
    })

    return NextResponse.json({ message: 'Vaccination updated.', schedule })
  } catch (e: any) {
    console.error('[health/vaccinations/id] PATCH:', e)
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Failed to update vaccination' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })
    }

    const existing = await prisma.vaccinationSchedule.findFirst({
      where: { id: params.id, organizationId: payload.organizationId },
    })
    if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

    await prisma.vaccinationSchedule.delete({ where: { id: params.id } })
    return NextResponse.json({ message: 'Vaccination deleted.' })
  } catch (e: any) {
    console.error('[health/vaccinations/id] DELETE:', e)
    return NextResponse.json({ error: 'Failed to delete vaccination' }, { status: 500 })
  }
}