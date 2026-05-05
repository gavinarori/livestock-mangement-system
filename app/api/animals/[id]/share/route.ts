import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db/client'
import { verifyToken, generateShareCode } from '@/lib/auth/utils'
import { ObjectId } from 'mongodb'

// POST: Create a share link for an animal
export async function POST(
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
    const { isPublic = false } = body

    const db = await getDB()
    const animalsCollection = db.collection('animals')
    const sharesCollection = db.collection('animal_shares')

    // Verify animal belongs to user
    const animal = await animalsCollection.findOne({
      _id: new ObjectId(params.id),
      userId: new ObjectId(payload.userId),
    })

    if (!animal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }

    // Check if share already exists
    let share = await sharesCollection.findOne({
      animalId: new ObjectId(params.id),
    })

    const shareCode = generateShareCode()

    if (share) {
      // Update existing share
      const result = await sharesCollection.findOneAndUpdate(
        { _id: share._id },
        {
          $set: {
            isPublic,
            shareCode,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      )
      return NextResponse.json({ share: result.value })
    } else {
      // Create new share
      const result = await sharesCollection.insertOne({
        animalId: new ObjectId(params.id),
        userId: new ObjectId(payload.userId),
        shareCode,
        isPublic,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      return NextResponse.json(
        {
          share: {
            _id: result.insertedId,
            animalId: params.id,
            shareCode,
            isPublic,
          },
        },
        { status: 201 }
      )
    }
  } catch (error: any) {
    console.error('[v0] Share creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: Get share details for an animal
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
    const sharesCollection = db.collection('animal_shares')

    const share = await sharesCollection.findOne({
      animalId: new ObjectId(params.id),
    })

    if (!share) {
      return NextResponse.json({ share: null })
    }

    return NextResponse.json({ share })
  } catch (error: any) {
    console.error('[v0] Get share error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
