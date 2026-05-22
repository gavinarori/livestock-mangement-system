import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'
import { z } from 'zod'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const CreateShareSchema = z.object({
  shareType: z.enum(['PUBLIC', 'PRIVATE', 'ROLE_BASED']).default('PUBLIC'),
  shareRole: z.enum(['VET', 'INSPECTOR', 'BUYER', 'PARTNER', 'ADMIN']).optional(),
  allowedEmails: z.array(z.string().email()).optional().default([]),
  password: z.string().optional(),
  label: z.string().optional(),
  expiresInDays: z.number().min(1).max(90).default(14),
  canViewHealth: z.boolean().default(true),
  canViewBreeding: z.boolean().default(false),
  canViewVeterinary: z.boolean().default(false),
  canViewFinancials: z.boolean().default(false),
  canViewLineage: z.boolean().default(false),
  canViewCertificates: z.boolean().default(false),
})

function generateSecureToken(): string {
  return crypto.randomBytes(16).toString('base64url')
}

/* -------------------------------------------------------
   POST /api/animals/:id/shares — create a new share link
------------------------------------------------------- */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const animal = await prisma.animal.findFirst({
      where: { id, organizationId: payload.organizationId },
    })
    if (!animal) return NextResponse.json({ error: 'Animal not found' }, { status: 404 })

    const body = await req.json()
    const validated = CreateShareSchema.parse(body)

    const passwordHash = validated.password
      ? await bcrypt.hash(validated.password, 10)
      : undefined

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + validated.expiresInDays)

    const shareToken = generateSecureToken()

    const share = await prisma.animalShare.create({
      data: {
        animalId: id,
        organizationId: payload.organizationId!,
        createdBy: payload.userId,
        shareType: validated.shareType,
        shareRole: validated.shareRole,
        allowedEmails: validated.allowedEmails,
        passwordHash,
        label: validated.label,
        expiresAt,
        token: shareToken,
        canViewHealth: validated.canViewHealth,
        canViewBreeding: validated.canViewBreeding,
        canViewVeterinary: validated.canViewVeterinary,
        canViewFinancials: validated.canViewFinancials,
        canViewLineage: validated.canViewLineage,
        canViewCertificates: validated.canViewCertificates,
      },
      include: { creator: { select: { name: true, email: true } } },
    })

    return NextResponse.json({ share }, { status: 201 })
  } catch (error: any) {
    console.error('[POST share error]', error)
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/* -------------------------------------------------------
   GET /api/animals/:id/shares — list all shares for animal
------------------------------------------------------- */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const animal = await prisma.animal.findFirst({
      where: { id, organizationId: payload.organizationId },
    })
    if (!animal) return NextResponse.json({ error: 'Animal not found' }, { status: 404 })

    const shares = await prisma.animalShare.findMany({
      where: { animalId: id },
      include: {
        creator: { select: { name: true, email: true } },
        _count: { select: { accessLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ shares })
  } catch (error) {
    console.error('[GET shares error]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}