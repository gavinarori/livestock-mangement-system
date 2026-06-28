// app/api/vet/treatments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withOrgAuth } from '@/lib/auth/middleware'
import { AuthContext } from '@/lib/auth/middleware'
import { z } from 'zod'

const RecoveryStepSchema = z.object({
  step: z.string().min(1),
  done: z.boolean().default(false),
  doneAt: z.string().optional().nullable(),
})

const CreateTreatmentSchema = z.object({
  animalId: z.string().min(1, 'Animal is required'),
  condition: z.string().min(1, 'Condition / diagnosis is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  startDate: z.string().optional(),
  medication: z.string().optional().nullable(),
  dosage: z.string().optional().nullable(),
  frequency: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  assignedVetId: z.string().optional().nullable(),
  diagnosisSource: z.string().optional().nullable(),
  labReference: z.string().optional().nullable(),
  isolationRequired: z.boolean().default(false),
  isolationLocation: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // steps stored as JSON array in Prisma
  steps: z.array(RecoveryStepSchema).optional().default([]),
})

const handler = async (req: NextRequest, _context: any, auth: AuthContext) => {
  if (req.method === 'GET') {
    try {
      const treatments = await prisma.treatment.findMany({
        where: { organizationId: auth.organizationId },
        include: {
          animal: {
            select: {
              id: true, name: true, type: true, breed: true,
              identificationId: true, healthStatus: true,
              gender: true, dateOfBirth: true, location: true,
            },
          },
          updatedBy: { select: { id: true, name: true } },
        },
        orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
      })

      // Animals sick/injured without an active treatment plan
      const animalsWithActiveTreatment = new Set(
        treatments
          .filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS')
          .map(t => t.animalId)
      )

      const sickAnimals = (
        await prisma.animal.findMany({
          where: {
            organizationId: auth.organizationId,
            healthStatus: { in: ['SICK', 'INJURED'] },
          },
          select: {
            id: true, name: true, type: true, breed: true,
            identificationId: true, healthStatus: true,
            gender: true, dateOfBirth: true, location: true,
          },
        })
      ).filter(a => !animalsWithActiveTreatment.has(a.id))

      return NextResponse.json({ treatments, sickAnimals })
    } catch (error: any) {
      console.error('[Vet Treatments GET]', error)
      return NextResponse.json({ error: 'Failed to fetch treatments' }, { status: 500 })
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const validated = CreateTreatmentSchema.parse(body)

      // Animal must belong to this org
      const animal = await prisma.animal.findFirst({
        where: { id: validated.animalId, organizationId: auth.organizationId },
        select: { id: true, healthStatus: true },
      })
      if (!animal) {
        return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
      }

      let assignedVetName: string | undefined
      if (validated.assignedVetId) {
        const vet = await prisma.vetProfile.findFirst({
          where: { id: validated.assignedVetId, organizationId: auth.organizationId },
          select: { name: true },
        })
        assignedVetName = vet?.name
      }

      const treatment = await prisma.treatment.create({
        data: {
          organizationId: auth.organizationId,
          animalId: validated.animalId,
          condition: validated.condition,
          priority: validated.priority as any,
          startDate: validated.startDate ? new Date(validated.startDate) : new Date(),
          medication: validated.medication ?? undefined,
          dosage: validated.dosage ?? undefined,
          frequency: validated.frequency ?? undefined,
          route: validated.route ?? undefined,
          assignedVetId: validated.assignedVetId ?? undefined,
          assignedVetName,
          diagnosisSource: validated.diagnosisSource ?? undefined,
          labReference: validated.labReference ?? undefined,
          isolationRequired: validated.isolationRequired,
          isolationLocation: validated.isolationLocation ?? undefined,
          followUpDate: validated.followUpDate ? new Date(validated.followUpDate) : undefined,
          notes: validated.notes ?? undefined,
          // Store steps as JSON — Prisma accepts the array directly for Json fields
          steps: validated.steps.length > 0 ? validated.steps : undefined,
          createdById: auth.userId,
        },
        include: {
          animal: {
            select: {
              id: true, name: true, type: true, breed: true,
              identificationId: true, healthStatus: true,
            },
          },
        },
      })

      // Flag animal as SICK if it was healthy when treatment started
      let responseTreatment = treatment
      if (animal.healthStatus === 'HEALTHY' || animal.healthStatus === 'RECOVERING') {
        await prisma.animal.update({
          where: { id: animal.id },
          data: { healthStatus: 'SICK' },
        })
        responseTreatment = {
          ...treatment,
          animal: { ...treatment.animal, healthStatus: 'SICK' as any },
        }
      }

      return NextResponse.json({ treatment: responseTreatment }, { status: 201 })
    } catch (error: any) {
      console.error('[Vet Treatments POST]', error)
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: error.errors[0]?.message ?? 'Validation error' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: 'Failed to create treatment' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export const GET = withOrgAuth('veterinary:read')(handler)
export const POST = withOrgAuth('veterinary:create')(handler)