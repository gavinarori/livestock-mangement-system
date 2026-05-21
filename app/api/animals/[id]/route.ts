import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'
import { UpdateAnimalSchema } from '@/lib/validations'

/* -------------------------------------------------------
   GET SINGLE ANIMAL
------------------------------------------------------- */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const animal = await prisma.animal.findFirst({
      where: {
        id,
        organizationId: payload.organizationId,
      },
    })

    if (!animal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }

    return NextResponse.json({ animal })
  } catch (error) {
    console.error('[GET animal error]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/* -------------------------------------------------------
   UPDATE ANIMAL
------------------------------------------------------- */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await req.json()
    const validated = UpdateAnimalSchema.parse(body)

    // Verify the animal belongs to this org before updating
    const existing = await prisma.animal.findFirst({
      where: { id, organizationId: payload.organizationId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }

    const updateData: any = { ...validated, updatedAt: new Date() }

    if (validated.dateOfBirth) {
      updateData.dateOfBirth = new Date(validated.dateOfBirth)
    }

    const animal = await prisma.animal.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ message: 'Animal updated successfully', animal })
  } catch (error: any) {
    console.error('[UPDATE animal error]', error)

    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors?.[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/* -------------------------------------------------------
   DELETE ANIMAL
------------------------------------------------------- */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Verify ownership before deleting
    const existing = await prisma.animal.findFirst({
      where: { id, organizationId: payload.organizationId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }

    await prisma.animal.delete({ where: { id } })

    return NextResponse.json({ message: 'Animal deleted successfully' })
  } catch (error) {
    console.error('[DELETE animal error]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}