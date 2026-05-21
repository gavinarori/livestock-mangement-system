import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, generateShareCode } from '@/lib/auth/utils'

// POST: Create or refresh a share link for an animal
export async function POST(
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
    const { isPublic = false } = body

    // Verify animal belongs to the user's organization
    // BUG FIX: was using userId — AnimalShare schema uses organizationId, not userId
    const animal = await prisma.animal.findFirst({
      where: {
        id,
        organizationId: payload.organizationId,
      },
    })

    if (!animal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }

    const shareCode = generateShareCode()

    // Upsert: update existing share or create a new one
    const share = await prisma.animalShare.upsert({
      where: { animalId: id } as any, // animalId is unique per animal
      update: {
        isPublic,
        shareCode,
        updatedAt: new Date(),
      },
      create: {
        animalId: id,
        organizationId: payload.organizationId,
        shareCode,
        isPublic,
      },
    })

    return NextResponse.json({ share }, { status: 200 })
  } catch (error: any) {
    console.error('[Share creation error]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: Get share details for an animal
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

    // Verify the animal belongs to this org before exposing the share
    const animal = await prisma.animal.findFirst({
      where: { id, organizationId: payload.organizationId },
    })

    if (!animal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }

    const share = await prisma.animalShare.findFirst({
      where: { animalId: id },
    })

    return NextResponse.json({ share: share ?? null })
  } catch (error: any) {
    console.error('[Get share error]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}