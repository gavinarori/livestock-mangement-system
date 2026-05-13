// File: app/api/breeding/records/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withOrgAuth, AuthContext } from '@/lib/auth/middleware'
import { z } from 'zod'
import { BreedingOutcome, BreedingMethod } from '@prisma/client'

const WRITE_ROLES = ['ADMIN', 'MANAGER', 'VETERINARIAN']

const UpdateBreedingSchema = z.object({
  breedingDate: z.string().optional(),
  method: z.nativeEnum(BreedingMethod).optional(),
  outcome: z.nativeEnum(BreedingOutcome).optional(),
  offspringCount: z.number().int().min(0).optional().nullable(),
  expectedBirthDate: z.string().optional().nullable(),
  actualBirthDate: z.string().optional().nullable(),
  confirmedPregnancy: z.boolean().optional().nullable(),
  pregnancyCheckDate: z.string().optional().nullable(),
  veterinarian: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// ── GET single record ──────────────────────────────────────────────────────────
async function getHandler(req: NextRequest, context: { params: { id: string } }, auth: AuthContext) {
  try {
    const record = await prisma.breeding.findFirst({
      where: { id: context.params.id, organizationId: auth.organizationId },
      include: {
        dam: {
          select: {
            id: true, name: true, type: true, breed: true, gender: true,
            identificationId: true, dateOfBirth: true, healthStatus: true,
            parentMaleId: true, parentFemaleId: true, inbreedingCoeff: true,
          },
        },
        sire: {
          select: {
            id: true, name: true, type: true, breed: true, gender: true,
            identificationId: true, dateOfBirth: true, healthStatus: true,
            parentMaleId: true, parentFemaleId: true, inbreedingCoeff: true,
          },
        },
        createdBy: { select: { id: true, name: true, role: true } },
        updatedBy: { select: { id: true, name: true, role: true } },
      },
    })

    if (!record) {
      return NextResponse.json({ error: 'Breeding record not found.' }, { status: 404 })
    }

    return NextResponse.json({ record })
  } catch (error: any) {
    console.error('[breeding] GET record error:', error)
    return NextResponse.json({ error: 'Failed to fetch breeding record' }, { status: 500 })
  }
}

// ── PATCH update record ────────────────────────────────────────────────────────
async function patchHandler(req: NextRequest, context: { params: { id: string } }, auth: AuthContext) {
  try {
    if (!WRITE_ROLES.includes(auth.role)) {
      return NextResponse.json(
        { error: 'Only Admins, Managers, and Veterinarians can edit breeding records.' },
        { status: 403 }
      )
    }

    const existing = await prisma.breeding.findFirst({
      where: { id: context.params.id, organizationId: auth.organizationId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Breeding record not found.' }, { status: 404 })
    }

    const body = await req.json()
    const validated = UpdateBreedingSchema.parse(body)

    const updateData: any = { updatedById: auth.userId }
    if (validated.breedingDate) updateData.breedingDate = new Date(validated.breedingDate)
    if (validated.method !== undefined) updateData.method = validated.method
    if (validated.outcome !== undefined) updateData.outcome = validated.outcome
    if (validated.offspringCount !== undefined) updateData.offspringCount = validated.offspringCount
    if (validated.expectedBirthDate !== undefined)
      updateData.expectedBirthDate = validated.expectedBirthDate ? new Date(validated.expectedBirthDate) : null
    if (validated.actualBirthDate !== undefined)
      updateData.actualBirthDate = validated.actualBirthDate ? new Date(validated.actualBirthDate) : null
    if (validated.confirmedPregnancy !== undefined) updateData.confirmedPregnancy = validated.confirmedPregnancy
    if (validated.pregnancyCheckDate !== undefined)
      updateData.pregnancyCheckDate = validated.pregnancyCheckDate ? new Date(validated.pregnancyCheckDate) : null
    if (validated.veterinarian !== undefined) updateData.veterinarian = validated.veterinarian
    if (validated.location !== undefined) updateData.location = validated.location
    if (validated.notes !== undefined) updateData.notes = validated.notes

    const record = await prisma.breeding.update({
      where: { id: context.params.id },
      data: updateData,
      include: {
        dam: { select: { id: true, name: true, type: true, breed: true, gender: true } },
        sire: { select: { id: true, name: true, type: true, breed: true, gender: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        updatedBy: { select: { id: true, name: true, role: true } },
      },
    })

    return NextResponse.json({ message: 'Breeding record updated successfully.', record })
  } catch (error: any) {
    console.error('[breeding] PATCH record error:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update breeding record' }, { status: 500 })
  }
}

// ── DELETE record ──────────────────────────────────────────────────────────────
async function deleteHandler(req: NextRequest, context: { params: { id: string } }, auth: AuthContext) {
  try {
    if (!WRITE_ROLES.includes(auth.role)) {
      return NextResponse.json(
        { error: 'Only Admins, Managers, and Veterinarians can delete breeding records.' },
        { status: 403 }
      )
    }

    const existing = await prisma.breeding.findFirst({
      where: { id: context.params.id, organizationId: auth.organizationId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Breeding record not found.' }, { status: 404 })
    }

    await prisma.breeding.delete({ where: { id: context.params.id } })

    return NextResponse.json({ message: 'Breeding record deleted successfully.' })
  } catch (error: any) {
    console.error('[breeding] DELETE record error:', error)
    return NextResponse.json({ error: 'Failed to delete breeding record' }, { status: 500 })
  }
}

export const GET = withOrgAuth('breeding:read')(getHandler as any)
export const PATCH = withOrgAuth('breeding:manage')(patchHandler as any)
export const DELETE = withOrgAuth('breeding:manage')(deleteHandler as any)