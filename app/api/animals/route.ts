import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'
import { CreateAnimalSchema } from '@/lib/validations'

/* -------------------------------------------------------
   GET  /api/animals  — list all animals for the org
------------------------------------------------------- */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Optional query params for filtering
    const { searchParams } = new URL(req.url)
    const type        = searchParams.get('type')        ?? undefined
    const healthStatus = searchParams.get('healthStatus') ?? undefined
    const search      = searchParams.get('search')      ?? undefined

    const animals = await prisma.animal.findMany({
      where: {
        organizationId: payload.organizationId,
        ...(type         ? { type:         type         as any } : {}),
        ...(healthStatus ? { healthStatus: healthStatus as any } : {}),
        ...(search       ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ animals })
  } catch (error) {
    console.error('[GET animals error]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/* -------------------------------------------------------
   POST  /api/animals  — create a new animal
------------------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
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

    // Zod now strips nulls → undefined, so Prisma never sees a null for
    // optional fields that don't accept null.
    const validated = CreateAnimalSchema.parse(body)

    const animal = await prisma.animal.create({
      data: {
        ...validated,
        // Convert date strings → Date objects for Prisma
        dateOfBirth:     validated.dateOfBirth     ? new Date(validated.dateOfBirth)     : undefined,
        acquisitionDate: validated.acquisitionDate ? new Date(validated.acquisitionDate) : undefined,
        // Link to org
        organizationId: payload.organizationId,
      },
    })

    return NextResponse.json({ message: 'Animal created successfully', animal }, { status: 201 })
  } catch (error: any) {
    console.error('[CREATE animal error]', error)

    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors?.[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}