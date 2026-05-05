import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db/client'
import { verifyToken } from '@/lib/auth/utils'
import { UpdateAnimalSchema } from '@/lib/validations'
import { ObjectId } from 'mongodb'

// GET: Fetch a single animal
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const animal = await animalsCollection.findOne({
      _id: new ObjectId(params.id),
      userId: new ObjectId(payload.userId),
    })

    if (!animal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }

    return NextResponse.json({ animal })
  } catch (error: any) {
    console.error('[v0] Get animal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: Update an animal
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const validated = UpdateAnimalSchema.parse(body)

    const db = await getDB()
    const animalsCollection = db.collection('animals')

    const dateOfBirth = validated.dateOfBirth ? new Date(validated.dateOfBirth) : undefined

    const result = await animalsCollection.findOneAndUpdate(
      {
        _id: new ObjectId(params.id),
        userId: new ObjectId(payload.userId),
      },
      {
        $set: {
          ...validated,
          dateOfBirth,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    )

    if (!result.value) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Animal updated successfully',
      animal: result.value,
    })
  } catch (error: any) {
    console.error('[v0] Update animal error:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Delete an animal
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const result = await animalsCollection.deleteOne({
      _id: new ObjectId(params.id),
      userId: new ObjectId(payload.userId),
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Animal deleted successfully' })
  } catch (error: any) {
    console.error('[v0] Delete animal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
