import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'
import { CreateAnimalSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const animals = await prisma.animal.findMany({
      where: {
        organizationId: payload.organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        healthRecords: true,
        veterinaryNotes: true,
        heatCycles: true,
        breedingsAsDam: true,
        breedingsAsSire: true,
      },
    })

    return NextResponse.json({ animals })
  } catch (error) {
    console.error('[GET_ANIMALS_ERROR]', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await req.json()

    const validated = CreateAnimalSchema.parse(body)

    const animal = await prisma.animal.create({
      data: {
        name: validated.name,
        type: validated.type,
        breed: validated.breed,
        gender: validated.gender,
        dateOfBirth: new Date(validated.dateOfBirth),

        identificationId: validated.identificationId,
        healthStatus: validated.healthStatus,

        weight: validated.weight,
        height: validated.height,
        color: validated.color,
        distinctMarks: validated.distinctMarks,

        notes: validated.notes,
        location: validated.location,

        acquisitionDate: validated.acquisitionDate
          ? new Date(validated.acquisitionDate)
          : undefined,

        acquisitionPrice: validated.acquisitionPrice,

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

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}