// app/api/vet/treatments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withOrgAuth } from '@/lib/auth/middleware'
import { AuthContext } from '@/lib/auth/middleware'
import { z } from 'zod'

const RecoveryStepSchema = z.object({
  step: z.string(),
  done: z.boolean(),
  doneAt: z.string().optional().nullable(),
})

const UpdateTreatmentSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  condition: z.string().min(1).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  startDate: z.string().optional().nullable(),
  medication: z.string().optional().nullable(),
  dosage: z.string().optional().nullable(),
  frequency: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  temperature: z.number().optional().nullable(),
  weight: z.number().optional().nullable(),
  assignedVetId: z.string().optional().nullable(),
  assignedVetName: z.string().optional().nullable(),
  diagnosisSource: z.string().optional().nullable(),
  labReference: z.string().optional().nullable(),
  isolationRequired: z.boolean().optional(),
  isolationLocation: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  workerUpdate: z.string().optional().nullable(),
  attachments: z.array(z.string()).optional(),
  // Recovery steps stored as JSON in Prisma
  steps: z.array(RecoveryStepSchema).optional().nullable(),
})

const handler = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
  auth: AuthContext
) => {
  const { id } = await context.params

  const treatment = await prisma.treatment.findFirst({
    where: { id, organizationId: auth.organizationId },
  })
  if (!treatment) {
    return NextResponse.json({ error: 'Treatment not found' }, { status: 404 })
  }

  if (req.method === 'PATCH') {
    try {
      const body = await req.json()
      const validated = UpdateTreatmentSchema.parse(body)

      // If only an assignedVetId is given (no name), resolve the vet's name
      let vetName = validated.assignedVetName
      if (validated.assignedVetId && vetName === undefined) {
        const vet = await prisma.vetProfile.findFirst({
          where: { id: validated.assignedVetId, organizationId: auth.organizationId },
          select: { name: true },
        })
        vetName = vet?.name
      }

      // Build the update payload carefully so Prisma gets proper types
      const updateData: Record<string, any> = {
        updatedById: auth.userId,
      }

      // Scalar string/number fields
      const scalarFields = [
        'status', 'condition', 'priority', 'medication', 'dosage', 'frequency',
        'route', 'temperature', 'weight', 'assignedVetId', 'diagnosisSource',
        'labReference', 'isolationRequired', 'isolationLocation',
      ] as const
      for (const field of scalarFields) {
        if (field in validated) updateData[field] = (validated as any)[field]
      }

      if (vetName !== undefined) updateData.assignedVetName = vetName

      // Date fields
      if ('startDate' in validated) {
        updateData.startDate = validated.startDate ? new Date(validated.startDate) : undefined
      }
      if ('followUpDate' in validated) {
        updateData.followUpDate = validated.followUpDate ? new Date(validated.followUpDate) : null
      }
      if ('endDate' in validated) {
        updateData.endDate = validated.endDate ? new Date(validated.endDate) : null
      }

      // Steps: Prisma stores JSON — pass the array directly
      if ('steps' in validated && validated.steps !== undefined) {
        updateData.steps = validated.steps ?? []
      }

      // Notes: support appending a worker update note
      if ('workerUpdate' in validated && validated.workerUpdate) {
        const timestamp = new Date().toLocaleString('en-GB', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        })
        const existing = (treatment.notes as string | null) ?? ''
        updateData.notes = existing
          ? `${existing}\n\n[${timestamp}] ${validated.workerUpdate}`
          : `[${timestamp}] ${validated.workerUpdate}`
      } else if ('notes' in validated && !('workerUpdate' in validated)) {
        if (validated.notes !== undefined) updateData.notes = validated.notes
      }

      // Auto-complete: mark animal healthy when treatment is completed
      if (validated.status === 'COMPLETED') {
        updateData.completedAt = new Date()
        await prisma.animal.update({
          where: { id: treatment.animalId },
          data: { healthStatus: 'HEALTHY' },
        })
      }

      const updated = await prisma.treatment.update({
        where: { id },
        data: updateData,
        include: {
          animal: {
            select: {
              id: true, name: true, type: true, breed: true,
              healthStatus: true, identificationId: true,
              gender: true, dateOfBirth: true, location: true,
            },
          },
          updatedBy: { select: { id: true, name: true } },
        },
      })

      return NextResponse.json({ treatment: updated })
    } catch (error: any) {
      console.error('[Treatment PATCH]', error)
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: error.errors[0]?.message ?? 'Validation error' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: 'Failed to update treatment' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export const PATCH = withOrgAuth('veterinary:update')(handler)