import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withOrgAuth } from '@/lib/auth/middleware'
import { AuthContext } from '@/lib/auth/middleware'
import { hashPassword } from '@/lib/auth/utils'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

const AddMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(UserRole),
})

const UpdateMemberSchema = z.object({
  password: z.string().min(6).optional(),
  role: z.nativeEnum(UserRole).optional(),
})

// Roles that MANAGER is allowed to assign / manage
const MANAGER_ALLOWED_ROLES: UserRole[] = [UserRole.VETERINARIAN, UserRole.WORKER, UserRole.VIEWER]

function canManage(actorRole: string, targetRole: string): boolean {
  if (actorRole === UserRole.ADMIN) return true
  if (actorRole === UserRole.MANAGER) {
    return MANAGER_ALLOWED_ROLES.includes(targetRole as UserRole)
  }
  return false
}

// ── GET  /api/organization/members ───────────────────────────────────────────
const listHandler = async (req: NextRequest, context: any, auth: AuthContext) => {
  try {
    const members = await prisma.user.findMany({
      where: { organizationId: auth.organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ members })
  } catch (error: any) {
    console.error('[v0] Fetch members error:', error)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}

// ── POST /api/organization/members ───────────────────────────────────────────
const addHandler = async (req: NextRequest, context: any, auth: AuthContext) => {
  try {
    if (!canManage(auth.role, 'VIEWER')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const validated = AddMemberSchema.parse(body)

    // MANAGER cannot assign ADMIN or MANAGER roles
    if (!canManage(auth.role, validated.role)) {
      return NextResponse.json(
        { error: 'You cannot assign that role. Managers may only add Veterinarian, Worker, or Viewer members.' },
        { status: 403 }
      )
    }

    const existing = await prisma.user.findUnique({ where: { email: validated.email } })
    if (existing) {
      return NextResponse.json({ error: 'A user with that email already exists' }, { status: 400 })
    }

    const org = await prisma.organization.findUnique({ where: { id: auth.organizationId } })
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const memberCount = await prisma.user.count({ where: { organizationId: auth.organizationId } })

    // Free plan hard cap at 5
    const isFree = org.subscription === 'free'
    const effectiveMax = isFree ? Math.min(org.maxMembers, 5) : org.maxMembers

    if (memberCount >= effectiveMax) {
      const upgradeMsg = isFree
        ? ` Your free plan is limited to ${effectiveMax} members. Upgrade to add more.`
        : ''
      return NextResponse.json(
        { error: `Member limit reached (${effectiveMax}).${upgradeMsg}` },
        { status: 400 }
      )
    }

    const hashedPassword = await hashPassword(validated.password)

    const member = await prisma.user.create({
      data: {
        email: validated.email,
        name: validated.name,
        password: hashedPassword,
        role: validated.role,
        organizationId: auth.organizationId,
        isActive: true,
      },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    })

    return NextResponse.json({ message: 'Member added successfully', member }, { status: 201 })
  } catch (error: any) {
    console.error('[v0] Add member error:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
  }
}

// ── PATCH /api/organization/members?memberId=xxx ──────────────────────────────
const updateHandler = async (req: NextRequest, context: any, auth: AuthContext) => {
  try {
    const memberId = new URL(req.url).searchParams.get('memberId')
    if (!memberId) {
      return NextResponse.json({ error: 'memberId query param required' }, { status: 400 })
    }

    const target = await prisma.user.findFirst({
      where: { id: memberId, organizationId: auth.organizationId },
      select: { id: true, role: true },
    })
    if (!target) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Cannot modify yourself
    if (memberId === auth.userId) {
      return NextResponse.json({ error: 'You cannot modify your own account here' }, { status: 400 })
    }

    // Permission check against current target role
    if (!canManage(auth.role, target.role)) {
      return NextResponse.json({ error: 'You do not have permission to modify this member' }, { status: 403 })
    }

    const body = await req.json()
    const validated = UpdateMemberSchema.parse(body)

    // If role is changing, check permission against new role too
    if (validated.role && !canManage(auth.role, validated.role)) {
      return NextResponse.json(
        { error: 'You cannot assign that role. Managers may only set Veterinarian, Worker, or Viewer.' },
        { status: 403 }
      )
    }

    const updateData: Record<string, any> = {}
    if (validated.password) updateData.password = await hashPassword(validated.password)
    if (validated.role) updateData.role = validated.role

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: memberId },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, isActive: true },
    })

    return NextResponse.json({ message: 'Member updated successfully', member: updated })
  } catch (error: any) {
    console.error('[v0] Update member error:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}

// ── DELETE /api/organization/members?memberId=xxx ────────────────────────────
const deleteHandler = async (req: NextRequest, context: any, auth: AuthContext) => {
  try {
    const memberId = new URL(req.url).searchParams.get('memberId')
    if (!memberId) {
      return NextResponse.json({ error: 'memberId query param required' }, { status: 400 })
    }

    if (memberId === auth.userId) {
      return NextResponse.json({ error: 'You cannot remove yourself from the organization' }, { status: 400 })
    }

    const target = await prisma.user.findFirst({
      where: { id: memberId, organizationId: auth.organizationId },
      select: { id: true, role: true },
    })
    if (!target) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    if (!canManage(auth.role, target.role)) {
      return NextResponse.json({ error: 'You do not have permission to remove this member' }, { status: 403 })
    }

    await prisma.user.delete({ where: { id: memberId } })

    return NextResponse.json({ message: 'Member removed successfully' })
  } catch (error: any) {
    console.error(' Delete member error:', error)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}

export const GET    = withOrgAuth('members:read')(listHandler)
export const POST   = withOrgAuth('members:manage')(addHandler)
export const PATCH  = withOrgAuth('members:manage')(updateHandler)
export const DELETE = withOrgAuth('members:manage')(deleteHandler)