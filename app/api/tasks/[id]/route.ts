// app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withOrgAuth } from '@/lib/auth/middleware'
import { AuthContext } from '@/lib/auth/middleware'
import { z } from 'zod'

const UpdateTaskSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE', 'OVERDUE', 'CANCELLED']).optional(),
  notes: z.string().optional(),
  // A worker-authored update (e.g. "Started feeding pen 3", or a blocker
  // explanation). Unlike `notes` (which a manager can set/overwrite as
  // instructions for the task), `workerUpdate` is appended as a timestamped,
  // attributed log entry so it never clobbers the manager's original notes.
  workerUpdate: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  category: z.enum(['FEEDING', 'CLEANING', 'MEDICATION', 'VACCINATION', 'INSPECTION', 'BREEDING', 'EQUIPMENT', 'OTHER']).optional(),
})

const handler = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
  auth: AuthContext
) => {
  const { id } = await context.params

  // Verify task belongs to org
  const task = await prisma.task.findFirst({
    where: { id, organizationId: auth.organizationId },
  })
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  if (req.method === 'PATCH') {
    try {
      const body = await req.json()
      const validated = UpdateTaskSchema.parse(body)

      // Workers can only update tasks assigned to them
      const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { role: true, name: true },
      })
      const isWorker = user?.role === 'WORKER'
      if (isWorker && task.assignedToId !== auth.userId) {
        return NextResponse.json({ error: 'Can only update your own tasks' }, { status: 403 })
      }
      // Workers cannot re-assign or change priority
      if (isWorker && (validated.assignedToId !== undefined || validated.priority !== undefined)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const updateData: any = { ...validated }
      delete updateData.workerUpdate // not a real Task column — handled separately below

      if (validated.status === 'DONE') {
        updateData.completedAt = new Date()
      }
      if (validated.dueDate === null) {
        updateData.dueDate = null
      } else if (validated.dueDate) {
        updateData.dueDate = new Date(validated.dueDate)
      }
      if (validated.assignedToId) {
        const assignee = await prisma.user.findFirst({
          where: { id: validated.assignedToId, organizationId: auth.organizationId },
          select: { name: true },
        })
        updateData.assignedToName = assignee?.name
      }

      // Append worker-authored updates (status changes, blocker feedback) as a
      // timestamped log entry instead of overwriting the manager's notes.
      if (validated.workerUpdate) {
        const who = user?.name || 'Worker'
        const when = new Date().toLocaleString('en-GB', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        })
        const entry = `[${when}] ${who}: ${validated.workerUpdate}`
        updateData.notes = task.notes ? `${task.notes}\n${entry}` : entry
      }

      const updated = await prisma.task.update({
        where: { id },
        data: updateData,
        include: {
          animal: { select: { id: true, name: true, type: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      })

      return NextResponse.json({ task: updated })
    } catch (error: any) {
      console.error('[Task PATCH]', error)
      if (error.name === 'ZodError') {
        return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { role: true } })
      if (!['MANAGER', 'ADMIN'].includes(user?.role || '')) {
        return NextResponse.json({ error: 'Only managers can delete tasks' }, { status: 403 })
      }
      await prisma.task.delete({ where: { id } })
      return NextResponse.json({ message: 'Task deleted' })
    } catch (error: any) {
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

// `animals:update` is held by ADMIN, MANAGER and WORKER — the only roles that
// should ever reach this handler. Fine-grained checks inside `handler` further
// restrict workers to their own tasks, and deletion to MANAGER/ADMIN only.
// (Previously PATCH was gated on `animals:read`, which let VIEWER/VETERINARIAN
// reach the handler unnecessarily, and DELETE was gated on `members:manage`,
// which only ADMIN holds — so MANAGER could never pass the gate to delete a
// task even though the handler itself was happy to allow it.)
export const PATCH = withOrgAuth('animals:update')(handler)
export const DELETE = withOrgAuth('animals:update')(handler)