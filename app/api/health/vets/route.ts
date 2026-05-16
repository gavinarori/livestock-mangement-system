// app/api/health/vets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'
import { z } from 'zod'

const WRITE_ROLES = ['ADMIN', 'MANAGER']

function auth(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  return verifyToken(token)
}

const CreateVetSchema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  speciality: z.string().min(1, 'Speciality required'),
  licenseNo: z.string().optional().nullable(),
  availability: z.enum(['AVAILABLE', 'BUSY', 'OFF_DUTY', 'ON_LEAVE']).default('AVAILABLE'),
  isExternal: z.boolean().default(false),
  clinicName: z.string().optional().nullable(),
  clinicAddress: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // Optionally link to a system user
  userId: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const availability = searchParams.get('availability')
    const search = searchParams.get('search')?.trim()

    const where: any = { organizationId: payload.organizationId, isActive: true }
    if (availability) where.availability = availability
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { speciality: { contains: search, mode: 'insensitive' } },
      ]
    }

    const vets = await prisma.vetProfile.findMany({
      where,
      orderBy: [{ availability: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ vets })
  } catch (e: any) {
    console.error('[health/vets] GET:', e)
    return NextResponse.json({ error: 'Failed to fetch vets' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Only Admins and Managers can add vet profiles.' }, { status: 403 })
    }

    const body = await req.json()
    const v = CreateVetSchema.parse(body)

    const vet = await prisma.vetProfile.create({
      data: {
        organizationId: payload.organizationId,
        name: v.name,
        email: v.email ?? null,
        phone: v.phone ?? null,
        speciality: v.speciality,
        licenseNo: v.licenseNo ?? null,
        availability: v.availability,
        isExternal: v.isExternal,
        clinicName: v.clinicName ?? null,
        clinicAddress: v.clinicAddress ?? null,
        notes: v.notes ?? null,
        userId: v.userId ?? null,
        currentCaseCount: 0,
        isActive: true,
      },
    })

    return NextResponse.json({ message: 'Vet profile created.', vet }, { status: 201 })
  } catch (e: any) {
    console.error('[health/vets] POST:', e)
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Failed to create vet profile' }, { status: 500 })
  }
}

// ─── PATCH/DELETE by ?id= query param (simple handler, no [id] subfolder needed) ───

export async function PATCH(req: NextRequest) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Vet ID required.' }, { status: 400 })

    const existing = await prisma.vetProfile.findFirst({
      where: { id, organizationId: payload.organizationId },
    })
    if (!existing) return NextResponse.json({ error: 'Vet not found.' }, { status: 404 })

    const body = await req.json()
    const v = CreateVetSchema.partial().parse(body)

    const vet = await prisma.vetProfile.update({
      where: { id },
      data: {
        ...(v.name && { name: v.name }),
        ...(v.email !== undefined && { email: v.email }),
        ...(v.phone !== undefined && { phone: v.phone }),
        ...(v.speciality && { speciality: v.speciality }),
        ...(v.licenseNo !== undefined && { licenseNo: v.licenseNo }),
        ...(v.availability && { availability: v.availability }),
        ...(v.isExternal !== undefined && { isExternal: v.isExternal }),
        ...(v.clinicName !== undefined && { clinicName: v.clinicName }),
        ...(v.clinicAddress !== undefined && { clinicAddress: v.clinicAddress }),
        ...(v.notes !== undefined && { notes: v.notes }),
      },
    })

    return NextResponse.json({ message: 'Vet updated.', vet })
  } catch (e: any) {
    console.error('[health/vets] PATCH:', e)
    return NextResponse.json({ error: 'Failed to update vet' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Vet ID required.' }, { status: 400 })

    const existing = await prisma.vetProfile.findFirst({
      where: { id, organizationId: payload.organizationId },
    })
    if (!existing) return NextResponse.json({ error: 'Vet not found.' }, { status: 404 })

    // Soft delete
    await prisma.vetProfile.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ message: 'Vet deactivated.' })
  } catch (e: any) {
    console.error('[health/vets] DELETE:', e)
    return NextResponse.json({ error: 'Failed to deactivate vet' }, { status: 500 })
  }
}