// app/api/health/diseases/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'
import { z } from 'zod'

const WRITE_ROLES = ['ADMIN', 'MANAGER', 'VETERINARIAN']

function auth(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  return verifyToken(token)
}

const UpdateDiseaseSchema = z.object({
  name: z.string().optional(),
  category: z.enum(['INFECTIOUS','GENETIC','NUTRITIONAL','ENVIRONMENTAL','PARASITIC','OTHER']).optional(),
  severity: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).optional(),
  trend: z.enum(['RISING','STABLE','FALLING']).optional(),
  firstCaseDate: z.string().optional(),
  lastCaseDate: z.string().optional(),
  isActive: z.boolean().optional(),
  quarantineActive: z.boolean().optional(),
  quarantineZone: z.string().optional().nullable(),
  containmentNotes: z.string().optional().nullable(),
  treatmentProtocol: z.string().optional().nullable(),
  preventionMeasures: z.string().optional().nullable(),
  labReference: z.string().optional().nullable(),
  reportedToAuthorities: z.boolean().optional(),
  notes: z.string().optional().nullable(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload: any  = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })
    }

    const existing = await prisma.diseaseOutbreak.findFirst({
      where: { id, organizationId: payload.organizationId },
    })
    if (!existing) return NextResponse.json({ error: 'Outbreak not found.' }, { status: 404 })

    const body = await req.json()
    const v = UpdateDiseaseSchema.parse(body)

    const data: any = { updatedById: payload.userId }
    if (v.name) data.name = v.name
    if (v.category) data.category = v.category
    if (v.severity) data.severity = v.severity
    if (v.trend) data.trend = v.trend
    if (v.firstCaseDate) data.firstCaseDate = new Date(v.firstCaseDate)
    if (v.lastCaseDate) data.lastCaseDate = new Date(v.lastCaseDate)
    if (v.isActive !== undefined) data.isActive = v.isActive
    if (v.quarantineActive !== undefined) data.quarantineActive = v.quarantineActive
    if (v.quarantineZone !== undefined) data.quarantineZone = v.quarantineZone
    if (v.containmentNotes !== undefined) data.containmentNotes = v.containmentNotes
    if (v.treatmentProtocol !== undefined) data.treatmentProtocol = v.treatmentProtocol
    if (v.preventionMeasures !== undefined) data.preventionMeasures = v.preventionMeasures
    if (v.labReference !== undefined) data.labReference = v.labReference
    if (v.reportedToAuthorities !== undefined) data.reportedToAuthorities = v.reportedToAuthorities
    if (v.notes !== undefined) data.notes = v.notes

    const outbreak = await prisma.diseaseOutbreak.update({
      where: { id },
      data,
      include: {
        affectedAnimals: {
          include: { animal: { select: { id: true, name: true, type: true, breed: true } } },
        },
        createdBy: { select: { id: true, name: true, role: true } },
        updatedBy: { select: { id: true, name: true, role: true } },
      },
    })

    return NextResponse.json({ message: 'Outbreak updated.', outbreak })
  } catch (e: any) {
    console.error('[health/diseases/id] PATCH:', e)
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Failed to update outbreak' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload: any = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })
    }

    const existing = await prisma.diseaseOutbreak.findFirst({
      where: { id, organizationId: payload.organizationId },
    })
    if (!existing) return NextResponse.json({ error: 'Outbreak not found.' }, { status: 404 })

    // Delete animal links first (cascades via schema but being explicit)
    await prisma.diseaseOutbreakAnimal.deleteMany({ where: { outbreakId: id } })
    await prisma.diseaseOutbreak.delete({ where: { id } })

    return NextResponse.json({ message: 'Outbreak deleted.' })
  } catch (e: any) {
    console.error('[health/diseases/id] DELETE:', e)
    return NextResponse.json({ error: 'Failed to delete outbreak' }, { status: 500 })
  }
}