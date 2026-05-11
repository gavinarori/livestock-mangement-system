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
  role: z.nativeEnum(UserRole)
})

const handler = async (
  req: NextRequest,
  context: any,
  auth: AuthContext
) => {
  if (req.method === 'GET') {
    try {
      const members = await prisma.user.findMany({
        where: { organizationId: auth.organizationId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      })

      return NextResponse.json({ members })
    } catch (error: any) {
      console.error('[v0] Fetch members error:', error)
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }
  }

  if (req.method === 'POST') {
    try {
      // Check permission
      const hasPerms = await prisma.user.findFirst({
        where: {
          id: auth.userId,
          organizationId: auth.organizationId,
          role: UserRole.ADMIN
        }
      })

      if (!hasPerms) {
        return NextResponse.json({ error: 'Only admins can add members' }, { status: 403 })
      }

      const body = await req.json()
      const validated = AddMemberSchema.parse(body)

      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { email: validated.email }
      })

      if (existing) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 })
      }

      // Get organization to check member limit
      const org = await prisma.organization.findUnique({
        where: { id: auth.organizationId }
      })

      if (!org) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }

      const memberCount = await prisma.user.count({
        where: { organizationId: auth.organizationId }
      })

      if (memberCount >= org.maxMembers) {
        return NextResponse.json(
          { error: `Member limit reached (${org.maxMembers})` },
          { status: 400 }
        )
      }

      // Create new member with temporary password
      const tempPassword = "2026"
      const hashedPassword = await hashPassword(tempPassword)

      const member = await prisma.user.create({
        data: {
          email: validated.email,
          name: validated.name,
          password: hashedPassword,
          role: validated.role,
          organizationId: auth.organizationId,
          isActive: true
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true
        }
      })

      return NextResponse.json(
        {
          message: 'Member added successfully',
          member,
          tempPassword: tempPassword // In production, send this via email
        },
        { status: 201 }
      )
    } catch (error: any) {
      console.error('[v0] Add member error:', error)
      if (error.name === 'ZodError') {
        return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export const GET = withOrgAuth('members:read')(handler)
export const POST = withOrgAuth('members:manage')(handler)
