// app/api/vet/treatments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withOrgAuth } from '@/lib/auth/middleware'
import { AuthContext } from '@/lib/auth/middleware'
import { z } from 'zod'

const RecoveryStepSchema = z.object({
  step: z.string().min(1),
  done: z.boolean().default(false),
  doneAt: z.string().optional(),
})

const CreateTreatmentSchema = z.object({
  animalId: z.string().min(1, 'Animal is required'),
  condition: z.string().min(1, 'Condition / diagnosis is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  startDate: z.string().optional(),
  medication: z.string().optional(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  route: z.string().optional(),
  assignedVetId: z.string().optional(),
  diagnosisSource: z.string().optional(),
  labReference: z.string().optional(),
  isolationRequired: z.boolean().default(false),
  isolationLocation: z.string().optional(),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
  steps: z.array(RecoveryStepSchema).optional(),
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

      // Animals that are sick/injured but have no active (non-terminal)
      // treatment plan yet — these are surfaced so the vet knows who still
      // needs a plan started.
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
          medication: validated.medication,
          dosage: validated.dosage,
          frequency: validated.frequency,
          route: validated.route,
          assignedVetId: validated.assignedVetId,
          assignedVetName,
          diagnosisSource: validated.diagnosisSource,
          labReference: validated.labReference,
          isolationRequired: validated.isolationRequired,
          isolationLocation: validated.isolationLocation,
          followUpDate: validated.followUpDate ? new Date(validated.followUpDate) : undefined,
          notes: validated.notes,
          steps: validated.steps ?? undefined,
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

      // If the animal wasn't already flagged sick/injured, mark it SICK now
      // that a treatment plan has been started for it.
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
        return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to create treatment' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export const GET = withOrgAuth('veterinary:read')(handler)
export const POST = withOrgAuth('veterinary:create')(handler)