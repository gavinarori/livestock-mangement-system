// app/api/animals/[id]/overview/route.ts
//
// Additive read-only endpoint for the animal detail page. Returns the
// *current* (active/upcoming) heat cycles, vaccination schedules,
// treatments, and tasks linked to a specific animal, so the "more details"
// page can show what's happening with this animal right now without
// pulling its entire historical record.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withOrgAuth } from '@/lib/auth/middleware'
import { AuthContext } from '@/lib/auth/middleware'

const handler = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
  auth: AuthContext
) => {
  const { id } = await context.params

  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    // Confirm the animal belongs to this org before returning anything.
    const animal = await prisma.animal.findFirst({
      where: { id, organizationId: auth.organizationId },
      select: { id: true },
    })
    if (!animal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }

    const [heatCycles, vaccinationSchedules, treatments, tasks] = await Promise.all([
      // Heat cycles that are still relevant: active, expected, or overdue.
      // BRED is a resolved outcome and isn't "current".
      prisma.heatCycle.findMany({
        where: {
          animalId: id,
          organizationId: auth.organizationId,
          status: { in: ['ACTIVE', 'EXPECTED', 'OVERDUE'] },
        },
        orderBy: { nextExpectedDate: 'asc' },
      }),

      // Vaccinations that are upcoming or overdue (not yet completed/skipped).
      prisma.vaccinationSchedule.findMany({
        where: {
          animalId: id,
          organizationId: auth.organizationId,
          status: { in: ['UPCOMING', 'OVERDUE'] },
        },
        orderBy: { dueDate: 'asc' },
      }),

      // Treatments still in progress or awaiting action.
      prisma.treatment.findMany({
        where: {
          animalId: id,
          organizationId: auth.organizationId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        orderBy: [{ priority: 'desc' }, { startDate: 'desc' }],
      }),

      // Tasks linked to this animal that are still outstanding.
      prisma.task.findMany({
        where: {
          animalId: id,
          organizationId: auth.organizationId,
          status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] },
        },
        orderBy: { dueDate: 'asc' },
        include: {
          assignedTo: { select: { id: true, name: true } },
        },
      }),
    ])

    return NextResponse.json({ heatCycles, vaccinationSchedules, treatments, tasks })
  } catch (error: any) {
    console.error('[Animal Overview GET]', error)
    return NextResponse.json({ error: 'Failed to fetch animal overview' }, { status: 500 })
  }
}

export const GET = withOrgAuth('animals:read')(handler)