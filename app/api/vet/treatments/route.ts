// app/api/vet/treatments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withOrgAuth } from '@/lib/auth/middleware'
import { AuthContext } from '@/lib/auth/middleware'
import { z } from 'zod'

const CreateTreatmentSchema = z.object({
  animalId: z.string().min(1),
  condition: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  startDate: z.string(),
  endDate: z.string().optional(),
  medication: z.string().optional(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  route: z.string().optional(),
  temperature: z.number().optional(),
  weight: z.number().optional(),
  isolationRequired: z.boolean().default(false),
  isolationLocation: z.string().optional(),
  followUpDate: z.string().optional(),
  steps: z.array(z.object({
    step: z.string(),
    done: z.boolean().default(false),
    doneAt: z.string().optional(),
  })).optional(),
  notes: z.string().optional(),
  diagnosisSource: z.string().optional(),
})

const handler = async (req: NextRequest, _context: any, auth: AuthContext) => {
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url)
      const statusFilter = url.searchParams.get('status') // PENDING | IN_PROGRESS | COMPLETED
      const priorityFilter = url.searchParams.get('priority')

      const where: any = { organizationId: auth.organizationId }
      if (statusFilter) where.status = statusFilter
      if (priorityFilter) where.priority = priorityFilter

      const treatments = await prisma.treatment.findMany({
        where,
        include: {
          animal: {
            select: {
              id: true, name: true, type: true, breed: true,
              identificationId: true, healthStatus: true,
              gender: true, dateOfBirth: true,
            },
          },
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } },
        },
        orderBy: [
          { priority: 'desc' },
          { status: 'asc' },
          { startDate: 'desc' },
        ],
      })

      // Also fetch sick/injured animals that don't yet have an active treatment
      const sickAnimals = await prisma.animal.findMany({
        where: {
          organizationId: auth.organizationId,
          healthStatus: { in: ['SICK', 'INJURED', 'RECOVERING'] },
        },
        select: {
          id: true, name: true, type: true, breed: true,
          identificationId: true, healthStatus: true,
          gender: true, dateOfBirth: true, location: true,
        },
      })

      return NextResponse.json({ treatments, sickAnimals })
    } catch (error: any) {
      console.error('[Vet treatments GET]', error)
      return NextResponse.json({ error: 'Failed to fetch treatments' }, { status: 500 })
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const validated = CreateTreatmentSchema.parse(body)

      const creator = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { name: true },
      })

      const treatment = await prisma.treatment.create({
        data: {
          organizationId: auth.organizationId,
          animalId: validated.animalId,
          condition: validated.condition,
          priority: validated.priority as any,
          status: 'IN_PROGRESS',
          startDate: new Date(validated.startDate),
          endDate: validated.endDate ? new Date(validated.endDate) : undefined,
          medication: validated.medication,
          dosage: validated.dosage,
          frequency: validated.frequency,
          route: validated.route,
          temperature: validated.temperature,
          weight: validated.weight,
          isolationRequired: validated.isolationRequired,
          isolationLocation: validated.isolationLocation,
          followUpDate: validated.followUpDate ? new Date(validated.followUpDate) : undefined,
          steps: validated.steps ? validated.steps : undefined,
          notes: validated.notes,
          diagnosisSource: validated.diagnosisSource,
          assignedVetName: creator?.name,
          assignedVetId: auth.userId,
          createdById: auth.userId,
        },
        include: {
          animal: { select: { id: true, name: true, type: true, healthStatus: true } },
        },
      })

      // Update animal health status to RECOVERING if it was SICK
      await prisma.animal.update({
        where: { id: validated.animalId },
        data: { healthStatus: 'RECOVERING' },
      })

      return NextResponse.json({ treatment }, { status: 201 })
    } catch (error: any) {
      console.error('[Vet treatments POST]', error)
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