// app/api/vet/treatments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withOrgAuth } from '@/lib/auth/middleware'
import { AuthContext } from '@/lib/auth/middleware'
import { z } from 'zod'

const UpdateTreatmentSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  condition: z.string().min(1).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  medication: z.string().optional().nullable(),
  dosage: z.string().optional().nullable(),
  frequency: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  temperature: z.number().optional().nullable(),
  weight: z.number().optional().nullable(),
  isolationRequired: z.boolean().optional(),
  isolationLocation: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // Recovery steps: array of { step, done, doneAt }
  steps: z.array(z.object({
    step: z.string(),
    done: z.boolean(),
    doneAt: z.string().optional(),
  })).optional(),
})

const handler = async (
  req: NextRequest,
  context: { params: { id: string } },
  auth: AuthContext
) => {
  const { id } = context.params

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

      const updateData: any = {
        ...validated,
        updatedById: auth.userId,
      }

      if (validated.status === 'COMPLETED') {
        updateData.completedAt = new Date()
        // Mark animal as HEALTHY when treatment completes
        await prisma.animal.update({
          where: { id: treatment.animalId },
          data: { healthStatus: 'HEALTHY' },
        })
      }

      if (validated.followUpDate === null) {
        updateData.followUpDate = null
      } else if (validated.followUpDate) {
        updateData.followUpDate = new Date(validated.followUpDate)
      }

      if (validated.endDate === null) {
        updateData.endDate = null
      } else if (validated.endDate) {
        updateData.endDate = new Date(validated.endDate)
      }

      const updated = await prisma.treatment.update({
        where: { id },
        data: updateData,
        include: {
          animal: {
            select: {
              id: true, name: true, type: true,
              healthStatus: true, identificationId: true,
            },
          },
          updatedBy: { select: { id: true, name: true } },
        },
      })

      return NextResponse.json({ treatment: updated })
    } catch (error: any) {
      console.error('[Treatment PATCH]', error)
      if (error.name === 'ZodError') {
        return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to update treatment' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export const PATCH = withOrgAuth('veterinary:update')(handler)