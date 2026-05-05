import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withOrgAuth } from '@/lib/auth/middleware'
import { VeterinaryNoteSchema } from '@/lib/validations'
import { AuthContext } from '@/lib/auth/middleware'

const handler = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
  auth: AuthContext
) => {
  const { id } = await context.params

  // Verify animal belongs to organization
  const animal = await prisma.animal.findFirst({
    where: {
      id,
      organizationId: auth.organizationId
    }
  })

  if (!animal) {
    return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
  }

  if (req.method === 'GET') {
    try {
      const notes = await prisma.veterinaryNote.findMany({
        where: {
          animalId: id,
          organizationId: auth.organizationId
        },
        orderBy: { date: 'desc' }
      })

      return NextResponse.json({ notes })
    } catch (error: any) {
      console.error('[v0] Fetch veterinary notes error:', error)
      return NextResponse.json({ error: 'Failed to fetch veterinary notes' }, { status: 500 })
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const validated = VeterinaryNoteSchema.parse(body)

      const note = await prisma.veterinaryNote.create({
        data: {
          animalId: id,
          organizationId: auth.organizationId,
          veterinarian: validated.veterinarian,
          date: new Date(validated.date),
          examination: validated.examination,
          diagnosis: validated.diagnosis,
          recommendations: validated.recommendations,
          prescriptions: validated.prescriptions,
          followUpDate: validated.followUpDate ? new Date(validated.followUpDate) : undefined,
          notes: validated.notes
        }
      })

      return NextResponse.json({ note }, { status: 201 })
    } catch (error: any) {
      console.error('[v0] Create veterinary note error:', error)
      if (error.name === 'ZodError') {
        return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to create veterinary note' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export const GET = withOrgAuth('health:read')(handler)
export const POST = withOrgAuth('veterinary:create')(handler)
