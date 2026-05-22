// app/api/shares/[token]/revoke/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'

/* -------------------------------------------------------
   PATCH /api/shares/:token/revoke — revoke a share link
------------------------------------------------------- */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: shareToken } = await params
    const authHeader = req.headers.get('authorization')
    const authToken = authHeader?.replace('Bearer ', '')
    if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyToken(authToken)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const share = await prisma.animalShare.findUnique({
      where: { token: shareToken },
      include: { animal: true },
    })

    if (!share) return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    if (share.organizationId !== payload.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.animalShare.update({
      where: { token: shareToken },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedBy: payload.userId,
      },
    })

    return NextResponse.json({ share: updated })
  } catch (error) {
    console.error('[REVOKE share error]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}