import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'
import { CreateAnimalSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  try {
    // Get token
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify token
    const payload = verifyToken(token)

    if (!payload?.organizationId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Fetch animals
    const animals = await prisma.animal.findMany({
      where: {
        organizationId: payload.organizationId,
      },

      orderBy: {
        createdAt: 'desc',
      },

      include: {
        // Recent health records
        healthRecords: {
          orderBy: {
            date: 'desc',
          },
          take: 5,
        },

        // Recent vet notes
        veterinaryNotes: {
          orderBy: {
            date: 'desc',
          },
          take: 5,
        },

        // Recent heat cycles
        heatCycles: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },

        // Breedings where animal is dam
        breedingsAsDam: {
          include: {
            sire: {
              select: {
                id: true,
                name: true,
                type: true,
                breed: true,
                gender: true,
                healthStatus: true,
              },
            },
          },

          orderBy: {
            breedingDate: 'desc',
          },

          take: 5,
        },

        // Breedings where animal is sire
        breedingsAsSire: {
          include: {
            dam: {
              select: {
                id: true,
                name: true,
                type: true,
                breed: true,
                gender: true,
                healthStatus: true,
              },
            },
          },

          orderBy: {
            breedingDate: 'desc',
          },

          take: 5,
        },
      },
    })

    return NextResponse.json(
      {
        animals,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[GET_ANIMALS_ERROR]', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get token
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify token
    const payload = verifyToken(token)

    if (!payload?.organizationId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Parse body
    const body = await req.json()

    // Validate input
    const validated = CreateAnimalSchema.parse(body)

    // Check duplicate identification ID
    if (validated.identificationId) {
      const existingAnimal = await prisma.animal.findFirst({
        where: {
          identificationId: validated.identificationId,
          organizationId: payload.organizationId,
        },
      })

      if (existingAnimal) {
        return NextResponse.json(
          {
            error: 'Animal identification already exists',
          },
          { status: 400 }
        )
      }
    }

    // Create animal
    const animal = await prisma.animal.create({
      data: {
        name: validated.name,
        type: validated.type,
        breed: validated.breed,
        gender: validated.gender,

        dateOfBirth: new Date(validated.dateOfBirth),

        identificationId:
          validated.identificationId || undefined,

        healthStatus:
          validated.healthStatus || 'HEALTHY',

        weight: validated.weight,
        height: validated.height,
        color: validated.color,
        distinctMarks: validated.distinctMarks,

        notes: validated.notes,
        location: validated.location,

        acquisitionDate: validated.acquisitionDate
          ? new Date(validated.acquisitionDate)
          : undefined,

        acquisitionPrice:
          validated.acquisitionPrice,

        organizationId: payload.organizationId,
      },
    })

    return NextResponse.json(
      {
        message: 'Animal created successfully',
        animal,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[CREATE_ANIMAL_ERROR]', error)

    // Zod validation error
    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: error.errors?.[0]?.message || 'Validation error',
        },
        { status: 400 }
      )
    }

    // Prisma duplicate errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          error: 'Duplicate field value detected',
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    )
  }
}