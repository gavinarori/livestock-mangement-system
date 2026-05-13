// File: app/api/breeding/records/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withOrgAuth, AuthContext } from '@/lib/auth/middleware'
import { z } from 'zod'
import { BreedingOutcome, BreedingMethod, AnimalGender, AnimalType, HealthStatus } from '@prisma/client'

// ── Roles that can write breeding records ──────────────────────────────────────
const WRITE_ROLES = ['ADMIN', 'MANAGER', 'VETERINARIAN']

// ── Validation schema ──────────────────────────────────────────────────────────
const CreateBreedingSchema = z.object({
  damId: z.string().min(1, 'Dam (female) is required'),
  sireId: z.string().min(1, 'Sire (male) is required'),
  breedingDate: z.string().refine(d => !isNaN(Date.parse(d)), 'Invalid breeding date'),
  method: z.nativeEnum(BreedingMethod).default('NATURAL'),
  outcome: z.nativeEnum(BreedingOutcome).default('PENDING'),
  offspringCount: z.number().int().min(0).optional().nullable(),
  expectedBirthDate: z.string().optional().nullable(),
  actualBirthDate: z.string().optional().nullable(),
  confirmedPregnancy: z.boolean().optional().nullable(),
  pregnancyCheckDate: z.string().optional().nullable(),
  veterinarian: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// ── Inbreeding coefficient calculation (Wright's path coefficient simplified) ──
async function calculateInbreedingCoeff(
  damId: string,
  sireId: string,
  organizationId: string
): Promise<number> {
  // Fetch ancestry for both animals (up to 4 generations)
  async function getAncestors(animalId: string, depth: number): Promise<Set<string>> {
    if (depth === 0) return new Set()
    const animal = await prisma.animal.findFirst({
      where: { id: animalId, organizationId },
      select: { parentMaleId: true, parentFemaleId: true },
    })
    if (!animal) return new Set()
    const ancestors = new Set<string>()
    if (animal.parentMaleId) {
      ancestors.add(animal.parentMaleId)
      const grandparents = await getAncestors(animal.parentMaleId, depth - 1)
      grandparents.forEach(a => ancestors.add(a))
    }
    if (animal.parentFemaleId) {
      ancestors.add(animal.parentFemaleId)
      const grandparents = await getAncestors(animal.parentFemaleId, depth - 1)
      grandparents.forEach(a => ancestors.add(a))
    }
    return ancestors
  }

  const damAncestors = await getAncestors(damId, 4)
  const sireAncestors = await getAncestors(sireId, 4)

  // Check if dam/sire are directly related
  if (damAncestors.has(sireId) || sireAncestors.has(damId)) return 0.25
  if (damId === sireId) return 0.5

  // Count common ancestors
  const commonAncestors = [...damAncestors].filter(a => sireAncestors.has(a))
  if (commonAncestors.length === 0) return 0

  // Approximate coefficient: each common ancestor contributes ~0.5^(n+1)
  let coeff = 0
  for (const _ of commonAncestors) {
    coeff += 0.0625 // approximation for 4-gen pedigree
  }
  return Math.min(coeff, 0.5)
}

// ── Breeding compatibility validation ─────────────────────────────────────────
interface CompatibilityResult {
  compatible: boolean
  errors: string[]
  warnings: string[]
}

async function validateBreedingCompatibility(
  damId: string,
  sireId: string,
  organizationId: string
): Promise<CompatibilityResult> {
  const errors: string[] = []
  const warnings: string[] = []

  if (damId === sireId) {
    errors.push('An animal cannot breed with itself.')
    return { compatible: false, errors, warnings }
  }

  const [dam, sire] = await Promise.all([
    prisma.animal.findFirst({
      where: { id: damId, organizationId },
      select: {
        id: true, name: true, gender: true, type: true,
        healthStatus: true, parentMaleId: true, parentFemaleId: true,
      },
    }),
    prisma.animal.findFirst({
      where: { id: sireId, organizationId },
      select: {
        id: true, name: true, gender: true, type: true,
        healthStatus: true, parentMaleId: true, parentFemaleId: true,
      },
    }),
  ])

  if (!dam) { errors.push('Dam animal not found in your organization.'); return { compatible: false, errors, warnings } }
  if (!sire) { errors.push('Sire animal not found in your organization.'); return { compatible: false, errors, warnings } }

  // Gender validation — dam must be female, sire must be male
  if (dam.gender !== AnimalGender.FEMALE) {
    errors.push(`"${dam.name}" is not female. The dam must be a female animal.`)
  }
  if (sire.gender !== AnimalGender.MALE) {
    errors.push(`"${sire.name}" is not male. The sire must be a male animal.`)
  }

  // Species compatibility — must be the same type
  const compatibleTypes: Record<string, AnimalType[]> = {
    // Same-species only; no cross-species breeding allowed in this system
    CATTLE: [AnimalType.CATTLE],
    SHEEP: [AnimalType.SHEEP],
    GOAT: [AnimalType.GOAT],
    PIG: [AnimalType.PIG],
    POULTRY: [AnimalType.POULTRY],
    HORSE: [AnimalType.HORSE],
    FISH: [AnimalType.FISH],
    AQUATIC: [AnimalType.AQUATIC],
    OTHER: [AnimalType.OTHER],
  }
  const allowedForDam = compatibleTypes[dam.type] ?? []
  if (!allowedForDam.includes(sire.type)) {
    errors.push(
      `Cross-species breeding is not allowed. "${dam.name}" is ${dam.type} and "${sire.name}" is ${sire.type}.`
    )
  }

  // Health status checks
  const unhealthyStatuses: HealthStatus[] = [HealthStatus.SICK, HealthStatus.DECEASED]
  if (unhealthyStatuses.includes(dam.healthStatus)) {
    errors.push(`"${dam.name}" has health status "${dam.healthStatus}" and cannot be bred.`)
  }
  if (unhealthyStatuses.includes(sire.healthStatus)) {
    errors.push(`"${sire.name}" has health status "${sire.healthStatus}" and cannot be used as a sire.`)
  }
  if (dam.healthStatus === HealthStatus.INJURED || dam.healthStatus === HealthStatus.RECOVERING) {
    warnings.push(`"${dam.name}" is currently ${dam.healthStatus.toLowerCase()}. Verify with a veterinarian before breeding.`)
  }
  if (sire.healthStatus === HealthStatus.INJURED || sire.healthStatus === HealthStatus.RECOVERING) {
    warnings.push(`"${sire.name}" is currently ${sire.healthStatus.toLowerCase()}. Verify with a veterinarian before breeding.`)
  }

  // Direct parent-offspring check
  if (dam.parentMaleId === sireId || dam.parentFemaleId === sireId) {
    warnings.push(`"${sire.name}" is a parent of "${dam.name}". This will result in a high inbreeding coefficient (F ≥ 0.25).`)
  }
  if (sire.parentMaleId === damId || sire.parentFemaleId === damId) {
    warnings.push(`"${dam.name}" is a parent of "${sire.name}". This will result in a high inbreeding coefficient (F ≥ 0.25).`)
  }

  // Check if dam already has a pending breeding
  const pendingBreeding = await prisma.breeding.findFirst({
    where: { damId, organizationId, outcome: BreedingOutcome.PENDING },
    select: { id: true, breedingDate: true },
  })
  if (pendingBreeding) {
    warnings.push(
      `"${dam.name}" already has a pending breeding record from ${new Date(pendingBreeding.breedingDate).toLocaleDateString()}. Creating another record is allowed but review existing records.`
    )
  }

  return { compatible: errors.length === 0, errors, warnings }
}

// ── GET: List breeding records ─────────────────────────────────────────────────
async function getHandler(req: NextRequest, context: any, auth: AuthContext) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
    const outcome = searchParams.get('outcome') as BreedingOutcome | null
    const damId = searchParams.get('damId')
    const sireId = searchParams.get('sireId')
    const search = searchParams.get('search')?.trim()

    const where: any = { organizationId: auth.organizationId }
    if (outcome) where.outcome = outcome
    if (damId) where.damId = damId
    if (sireId) where.sireId = sireId
    if (search) {
      where.OR = [
        { dam: { name: { contains: search, mode: 'insensitive' } } },
        { sire: { name: { contains: search, mode: 'insensitive' } } },
        { notes: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [records, total] = await Promise.all([
      prisma.breeding.findMany({
        where,
        include: {
          dam: { select: { id: true, name: true, type: true, breed: true, identificationId: true, gender: true } },
          sire: { select: { id: true, name: true, type: true, breed: true, identificationId: true, gender: true } },
          createdBy: { select: { id: true, name: true, role: true } },
          updatedBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: { breedingDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.breeding.count({ where }),
    ])

    return NextResponse.json({
      records,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error: any) {
    console.error('[breeding] GET records error:', error)
    return NextResponse.json({ error: 'Failed to fetch breeding records' }, { status: 500 })
  }
}

// ── POST: Create breeding record ───────────────────────────────────────────────
async function postHandler(req: NextRequest, context: any, auth: AuthContext) {
  try {
    // Role check
    if (!WRITE_ROLES.includes(auth.role)) {
      return NextResponse.json(
        { error: 'Only Admins, Managers, and Veterinarians can create breeding records.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validated = CreateBreedingSchema.parse(body)

    // Compatibility validation
    const compatibility = await validateBreedingCompatibility(
      validated.damId,
      validated.sireId,
      auth.organizationId
    )
    if (!compatibility.compatible) {
      return NextResponse.json(
        { error: compatibility.errors[0], errors: compatibility.errors, warnings: compatibility.warnings },
        { status: 422 }
      )
    }

    // Calculate inbreeding coefficient
    const inbreedingCoeff = await calculateInbreedingCoeff(
      validated.damId,
      validated.sireId,
      auth.organizationId
    )

    const record = await prisma.breeding.create({
      data: {
        damId: validated.damId,
        sireId: validated.sireId,
        organizationId: auth.organizationId,
        breedingDate: new Date(validated.breedingDate),
        method: validated.method,
        outcome: validated.outcome,
        offspringCount: validated.offspringCount ?? null,
        expectedBirthDate: validated.expectedBirthDate ? new Date(validated.expectedBirthDate) : null,
        actualBirthDate: validated.actualBirthDate ? new Date(validated.actualBirthDate) : null,
        confirmedPregnancy: validated.confirmedPregnancy ?? false,
        pregnancyCheckDate: validated.pregnancyCheckDate ? new Date(validated.pregnancyCheckDate) : null,
        veterinarian: validated.veterinarian ?? null,
        location: validated.location ?? null,
        notes: validated.notes ?? null,
        inbreedingCoeff,
        createdById: auth.userId,
      },
      include: {
        dam: { select: { id: true, name: true, type: true, breed: true, identificationId: true, gender: true } },
        sire: { select: { id: true, name: true, type: true, breed: true, identificationId: true, gender: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    })

    return NextResponse.json(
      {
        message: 'Breeding record created successfully.',
        record,
        warnings: compatibility.warnings,
        inbreedingCoeff,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[breeding] POST records error:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create breeding record' }, { status: 500 })
  }
}

export const GET = withOrgAuth('breeding:read')(getHandler)
export const POST = withOrgAuth('breeding:manage')(postHandler)