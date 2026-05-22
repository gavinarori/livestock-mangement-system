// app/api/shares/[token]/logs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'

/* -------------------------------------------------------
   GET /api/shares/:token/logs — access log for a share
------------------------------------------------------- */
export async function GET(
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
    })

    if (!share) return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    if (share.organizationId !== payload.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '50')

    const logs = await prisma.shareAccessLog.findMany({
      where: { shareId: share.id },
      orderBy: { accessedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await prisma.shareAccessLog.count({ where: { shareId: share.id } })

    return NextResponse.json({ logs, total, page, limit })
  } catch (error) {
    console.error('[GET share logs error]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}