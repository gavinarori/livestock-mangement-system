// app/api/share/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/* -------------------------------------------------------
   GET /api/share/:token — public-facing share validation
   Logs every access automatically.
------------------------------------------------------- */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const password = req.headers.get('x-share-password') ?? undefined

    const share = await prisma.animalShare.findUnique({
      where: { token },
      include: {
        animal: {
          include: {
            healthRecords: { orderBy: { date: 'desc' }, take: 20 },
            veterinaryNotes: { orderBy: { date: 'desc' }, take: 10 },
            breedingRecords: { orderBy: { createdAt: 'desc' }, take: 10 },
          },
        },
      },
    })

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 })
    }

    if (share.isRevoked) {
      return NextResponse.json({ error: 'This share link has been revoked' }, { status: 410 })
    }

    if (new Date() > share.expiresAt) {
      return NextResponse.json({ error: 'This share link has expired' }, { status: 410 })
    }

    // Password gate
    if (share.passwordHash) {
      if (!password) {
        return NextResponse.json({ error: 'PASSWORD_REQUIRED', requiresPassword: true }, { status: 401 })
      }
      const valid = await bcrypt.compare(password, share.passwordHash)
      if (!valid) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
      }
    }

    // Log the access
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown'
    const userAgent = req.headers.get('user-agent') ?? undefined

    await prisma.shareAccessLog.create({
      data: {
        shareId: share.id,
        ip,
        userAgent,
        accessedAt: new Date(),
      },
    })

    // Update view count + last accessed
    await prisma.animalShare.update({
      where: { id: share.id },
      data: {
        viewCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    })

    // Filter animal data based on permissions
    const { animal } = share
    const safeAnimal: any = {
      id: animal.id,
      name: animal.name,
      type: animal.type,
      breed: animal.breed,
      gender: animal.gender,
      dateOfBirth: animal.dateOfBirth,
      weight: animal.weight,
      height: animal.height,
      color: animal.color,
      distinctMarks: animal.distinctMarks,
      identificationId: animal.identificationId,
      location: animal.location,
      healthStatus: animal.healthStatus,
      acquisitionDate: animal.acquisitionDate,
      notes: share.shareRole === 'BUYER' || share.shareRole === 'INSPECTOR' || share.shareType === 'PUBLIC' ? animal.notes : undefined,
    }

    if (share.canViewHealth) safeAnimal.healthRecords = animal.healthRecords
    if (share.canViewVeterinary) safeAnimal.veterinaryNotes = animal.veterinaryNotes
    if (share.canViewBreeding) safeAnimal.breedingRecords = animal.breedingRecords

    const permissions = {
      canViewHealth: share.canViewHealth,
      canViewBreeding: share.canViewBreeding,
      canViewVeterinary: share.canViewVeterinary,
      canViewFinancials: share.canViewFinancials,
      canViewLineage: share.canViewLineage,
      canViewCertificates: share.canViewCertificates,
    }

    return NextResponse.json({
      animal: safeAnimal,
      share: {
        id: share.id,
        shareType: share.shareType,
        shareRole: share.shareRole,
        label: share.label,
        expiresAt: share.expiresAt,
        viewCount: share.viewCount + 1,
      },
      permissions,
    })
  } catch (error) {
    console.error('[GET public share error]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/* -------------------------------------------------------
   POST /api/share/:token — log duration on leave
------------------------------------------------------- */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await req.json()
    const { duration } = body

    const share = await prisma.animalShare.findUnique({ where: { token } })
    if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Update latest log with duration
    const latestLog = await prisma.shareAccessLog.findFirst({
      where: { shareId: share.id },
      orderBy: { accessedAt: 'desc' },
    })

    if (latestLog && !latestLog.duration) {
      await prisma.shareAccessLog.update({
        where: { id: latestLog.id },
        data: { duration: Math.round(duration) },
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}