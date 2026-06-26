// app/api/health/treatments/[id]/route.ts
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

const UpdateTreatmentSchema = z.object({
  condition: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  medication: z.string().optional().nullable(),
  dosage: z.string().optional().nullable(),
  frequency: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  temperature: z.number().optional().nullable(),
  weight: z.number().optional().nullable(),
  assignedVetId: z.string().optional().nullable(),
  assignedVetName: z.string().optional().nullable(),
  steps: z.array(z.object({
    label: z.string(),
    done: z.boolean(),
    completedAt: z.string().optional().nullable(),
    completedBy: z.string().optional().nullable(),
  })).optional(),
  diagnosisSource: z.string().optional().nullable(),
  labReference: z.string().optional().nullable(),
  isolationRequired: z.boolean().optional(),
  isolationLocation: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload: any = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })
    }

    const existing = await prisma.treatment.findFirst({
      where: { id, organizationId: payload.organizationId },
    })
    if (!existing) return NextResponse.json({ error: 'Treatment not found.' }, { status: 404 })

    const body = await req.json()
    const v = UpdateTreatmentSchema.parse(body)

    let vetName = v.assignedVetName
    if (v.assignedVetId && !vetName) {
      const vet = await prisma.vetProfile.findFirst({
        where: { id: v.assignedVetId, organizationId: payload.organizationId },
        select: { name: true },
      })
      vetName = vet?.name ?? undefined
    }

    const data: any = { updatedById: payload.userId }
    if (v.condition) data.condition = v.condition
    if (v.status) {
      data.status = v.status
      if (v.status === 'COMPLETED') data.completedAt = new Date()
    }
    if (v.priority) data.priority = v.priority
    if (v.startDate) data.startDate = new Date(v.startDate)
    if (v.endDate !== undefined) data.endDate = v.endDate ? new Date(v.endDate) : null
    if (v.medication !== undefined) data.medication = v.medication
    if (v.dosage !== undefined) data.dosage = v.dosage
    if (v.frequency !== undefined) data.frequency = v.frequency
    if (v.route !== undefined) data.route = v.route
    if (v.temperature !== undefined) data.temperature = v.temperature
    if (v.weight !== undefined) data.weight = v.weight
    if (v.assignedVetId !== undefined) data.assignedVetId = v.assignedVetId
    if (vetName !== undefined) data.assignedVetName = vetName
    if (v.steps !== undefined) data.steps = v.steps
    if (v.diagnosisSource !== undefined) data.diagnosisSource = v.diagnosisSource
    if (v.labReference !== undefined) data.labReference = v.labReference
    if (v.isolationRequired !== undefined) data.isolationRequired = v.isolationRequired
    if (v.isolationLocation !== undefined) data.isolationLocation = v.isolationLocation
    if (v.followUpDate !== undefined) data.followUpDate = v.followUpDate ? new Date(v.followUpDate) : null
    if (v.notes !== undefined) data.notes = v.notes

    const treatment = await prisma.treatment.update({
      where: { id },
      data,
      include: {
        animal: { select: { id: true, name: true, type: true, breed: true, identificationId: true, healthStatus: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        updatedBy: { select: { id: true, name: true, role: true } },
      },
    })

    // If completed, update animal to RECOVERING and decrement vet count
    if (v.status === 'COMPLETED' && existing.assignedVetId) {
      await prisma.animal.update({ where: { id: existing.animalId }, data: { healthStatus: 'RECOVERING' } })
      await prisma.vetProfile.updateMany({
        where: { id: existing.assignedVetId, organizationId: payload.organizationId },
        data: { currentCaseCount: { decrement: 1 } },
      })
    }
    // If cancelled, decrement vet count
    if (v.status === 'CANCELLED' && existing.assignedVetId && (existing.status === 'PENDING' || existing.status === 'IN_PROGRESS')) {
      await prisma.vetProfile.updateMany({
        where: { id: existing.assignedVetId, organizationId: payload.organizationId },
        data: { currentCaseCount: { decrement: 1 } },
      })
    }

    return NextResponse.json({ message: 'Treatment updated.', treatment })
  } catch (e: any) {
    console.error('[health/treatments/id] PATCH:', e)
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Failed to update treatment' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload: any = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })
    }

    const existing = await prisma.treatment.findFirst({
      where: { id, organizationId: payload.organizationId },
    })
    if (!existing) return NextResponse.json({ error: 'Treatment not found.' }, { status: 404 })

    await prisma.treatment.delete({ where: { id } })

    // Decrement vet case count if treatment was active
    if (existing.assignedVetId && (existing.status === 'PENDING' || existing.status === 'IN_PROGRESS')) {
      await prisma.vetProfile.updateMany({
        where: { id: existing.assignedVetId, organizationId: payload.organizationId },
        data: { currentCaseCount: { decrement: 1 } },
      })
    }

    return NextResponse.json({ message: 'Treatment deleted.' })
  } catch (e: any) {
    console.error('[health/treatments/id] DELETE:', e)
    return NextResponse.json({ error: 'Failed to delete treatment' }, { status: 500 })
  }
}