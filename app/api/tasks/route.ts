// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withOrgAuth } from '@/lib/auth/middleware'
import { AuthContext } from '@/lib/auth/middleware'
import { z } from 'zod'

const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.enum(['FEEDING', 'CLEANING', 'MEDICATION', 'VACCINATION', 'INSPECTION', 'BREEDING', 'EQUIPMENT', 'OTHER']).default('OTHER'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assignedToId: z.string().optional(),
  animalId: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
})

const handler = async (req: NextRequest, context: any, auth: AuthContext) => {
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url)
      const assignedToMe = url.searchParams.get('assignedToMe') === 'true'
      const status = url.searchParams.get('status')

      const where: any = { organizationId: auth.organizationId }
      if (assignedToMe) where.assignedToId = auth.userId
      if (status) where.status = status

      const tasks = await prisma.task.findMany({
        where,
        include: {
          animal: { select: { id: true, name: true, type: true, identificationId: true } },
          assignedTo: { select: { id: true, name: true, role: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { priority: 'desc' }],
      })

      // Auto-mark overdue
      const now = new Date()
      const overdueIds = tasks
        .filter(t => t.status === 'PENDING' && t.dueDate && new Date(t.dueDate) < now)
        .map(t => t.id)

      if (overdueIds.length > 0) {
        await prisma.task.updateMany({
          where: { id: { in: overdueIds } },
          data: { status: 'OVERDUE' },
        })
        // Refresh statuses in returned data
        tasks.forEach(t => {
          if (overdueIds.includes(t.id)) t.status = 'OVERDUE' as any
        })
      }

      return NextResponse.json({ tasks })
    } catch (error: any) {
      console.error('[Tasks GET]', error)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const validated = CreateTaskSchema.parse(body)

      // Fetch assigner name
      const creator = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { name: true, role: true },
      })

      // Only MANAGER and ADMIN can assign to others
      if (validated.assignedToId && validated.assignedToId !== auth.userId) {
        if (!['MANAGER', 'ADMIN'].includes(creator?.role || '')) {
          return NextResponse.json({ error: 'Only managers can assign tasks to others' }, { status: 403 })
        }
      }

      let assignedToName: string | undefined
      if (validated.assignedToId) {
        const assignee = await prisma.user.findFirst({
          where: { id: validated.assignedToId, organizationId: auth.organizationId },
          select: { name: true },
        })
        assignedToName = assignee?.name
      }

      const task = await prisma.task.create({
        data: {
          organizationId: auth.organizationId,
          title: validated.title,
          description: validated.description,
          category: validated.category as any,
          priority: validated.priority as any,
          assignedToId: validated.assignedToId,
          assignedToName,
          animalId: validated.animalId,
          dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
          notes: validated.notes,
          createdById: auth.userId,
          createdByName: creator?.name,
        },
        include: {
          animal: { select: { id: true, name: true, type: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      })

      return NextResponse.json({ task }, { status: 201 })
    } catch (error: any) {
      console.error('[Tasks POST]', error)
      if (error.name === 'ZodError') {
        return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export const GET = withOrgAuth('animals:read')(handler)
export const POST = withOrgAuth('animals:create')(handler)