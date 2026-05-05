import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withOrgAuth } from '@/lib/auth/middleware'
import { AuthContext } from '@/lib/auth/middleware'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

const UpdateOrgSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  logo: z.string().optional()
})

const handler = async (
  req: NextRequest,
  context: any,
  auth: AuthContext
) => {
  if (req.method === 'GET') {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: auth.organizationId },
        include: {
          _count: {
            select: { members: true, animals: true }
          }
        }
      })

      if (!org) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }

      return NextResponse.json({
        organization: {
          ...org,
          memberCount: org._count.members,
          animalCount: org._count.animals
        }
      })
    } catch (error: any) {
      console.error('[v0] Fetch org error:', error)
      return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 })
    }
  }

  if (req.method === 'PUT') {
    try {
      // Check admin permission
      const user = await prisma.user.findFirst({
        where: {
          id: auth.userId,
          organizationId: auth.organizationId,
          role: UserRole.ADMIN
        }
      })

      if (!user) {
        return NextResponse.json({ error: 'Only admins can update organization' }, { status: 403 })
      }

      const body = await req.json()
      const validated = UpdateOrgSchema.parse(body)

      const updated = await prisma.organization.update({
        where: { id: auth.organizationId },
        data: {
          name: validated.name,
          description: validated.description,
          logo: validated.logo
        }
      })

      return NextResponse.json({
        message: 'Organization updated successfully',
        organization: updated
      })
    } catch (error: any) {
      console.error('[v0] Update org error:', error)
      if (error.name === 'ZodError') {
        return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export const GET = withOrgAuth('organization:manage')(handler)
export const PUT = withOrgAuth('organization:manage')(handler)
