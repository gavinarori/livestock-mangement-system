import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withOrgAuth } from '@/lib/auth/middleware'
import { HealthRecordSchema } from '@/lib/validations'
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
      const records = await prisma.healthRecord.findMany({
        where: {
          animalId: id,
          organizationId: auth.organizationId
        },
        orderBy: { date: 'desc' }
      })

      return NextResponse.json({ records })
    } catch (error: any) {
      console.error('[v0] Fetch health records error:', error)
      return NextResponse.json({ error: 'Failed to fetch health records' }, { status: 500 })
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const validated = HealthRecordSchema.parse(body)

      const record = await prisma.healthRecord.create({
        data: {
          animalId: id,
          organizationId: auth.organizationId,
          recordType: validated.recordType,
          description: validated.description,
          date: new Date(validated.date),
          recordedBy: 'system', // Will be updated with user info
          vaccineName: validated.vaccineName,
          diagnosis: validated.diagnosis,
          diseaseCategory: validated.diseaseCategory as any,
          severity: validated.severity,
          treatment: validated.treatment,
          temperature: validated.temperature,
          weight: validated.weight,
          notes: validated.notes
        }
      })

      return NextResponse.json({ record }, { status: 201 })
    } catch (error: any) {
      console.error('[v0] Create health record error:', error)
      if (error.name === 'ZodError') {
        return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to create health record' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export const GET = withOrgAuth('health:read')(handler)
export const POST = withOrgAuth('health:create')(handler)
