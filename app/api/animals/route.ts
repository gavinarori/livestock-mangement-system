import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db/client'
import { verifyToken } from '@/lib/auth/utils'
import { CreateAnimalSchema } from '@/lib/validations'
import { ObjectId } from 'mongodb'

// GET: Fetch all animals for the user
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

    const db = await getDB()
    const animalsCollection = db.collection('animals')

    const animals = await animalsCollection
      .find({ userId: new ObjectId(payload.userId) })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({ animals })
  } catch (error: any) {
    console.error('[v0] Get animals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a new animal
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
    const validated = CreateAnimalSchema.parse(body)

    const db = await getDB()
    const animalsCollection = db.collection('animals')

    const dateOfBirth = validated.dateOfBirth ? new Date(validated.dateOfBirth) : undefined

    const result = await animalsCollection.insertOne({
      userId: new ObjectId(payload.userId),
      ...validated,
      dateOfBirth,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json(
      {
        message: 'Animal created successfully',
        animal: { _id: result.insertedId, ...validated, dateOfBirth },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[v0] Create animal error:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
