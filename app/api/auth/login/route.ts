import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth/utils'
import { LoginSchema } from '@/lib/validations'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = LoginSchema.parse(body)

    // Find user with organization
    const user = await prisma.user.findUnique({
      where: { email: validated.email },
      include: { organization: true }
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Verify password
    const isPasswordValid = await verifyPassword(validated.password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Generate token with organization info
    const token = generateToken({
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role
    })

    return NextResponse.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug
      }
    })
  } catch (error: any) {
    console.error('[v0] Login error:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
