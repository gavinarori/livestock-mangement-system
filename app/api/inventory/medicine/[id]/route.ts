// app/api/inventory/medicine/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'
import { z } from 'zod'

const WRITE_ROLES = ['ADMIN', 'MANAGER', 'WORKER']
function auth(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  return verifyToken(token)
}

const UpdateMedSchema = z.object({
  name: z.string().optional(),
  category: z.enum(['ANTIBIOTIC','VACCINE','DEWORMER','SUPPLEMENT','PESTICIDE','TREATMENT','ANTIFUNGAL','ANTIPARASITIC','HORMONE','OTHER']).optional(),
  quantity: z.number().min(0).optional(),
  unit: z.string().optional(),
  minimumQty: z.number().min(0).optional(),
  maximumQty: z.number().optional().nullable(),
  costPerUnit: z.number().min(0).optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  supplierPhone: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  storageTemp: z.enum(['refrigerated','cool-dry','room-temp']).optional().nullable(),
  storageLocation: z.string().optional().nullable(),
  prescription: z.boolean().optional(),
  withdrawalDays: z.number().int().min(0).optional().nullable(),
  dosageInstructions: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  stockChangeReason: z.string().optional().nullable(),
  stockTransactionType: z.enum(['RESTOCK','CONSUME','ADJUST','DISPOSE','TRANSFER']).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })

    const existing = await prisma.medicineItem.findFirst({ where: { id: params.id, organizationId: payload.organizationId } })
    if (!existing) return NextResponse.json({ error: 'Medicine not found.' }, { status: 404 })

    const body = await req.json()
    const v = UpdateMedSchema.parse(body)

    const prevQty = existing.quantity
    const newQty = v.quantity ?? existing.quantity
    const newCost = v.costPerUnit ?? existing.costPerUnit ?? 0

    const data: any = { updatedById: payload.userId }
    if (v.name !== undefined) data.name = v.name
    if (v.category !== undefined) data.category = v.category
    if (v.quantity !== undefined) { data.quantity = v.quantity; data.totalValue = v.quantity * newCost }
    if (v.unit !== undefined) data.unit = v.unit
    if (v.minimumQty !== undefined) data.minimumQty = v.minimumQty
    if (v.maximumQty !== undefined) data.maximumQty = v.maximumQty
    if (v.costPerUnit !== undefined) { data.costPerUnit = v.costPerUnit; data.totalValue = newQty * (v.costPerUnit ?? 0) }
    if (v.expiryDate !== undefined) data.expiryDate = v.expiryDate ? new Date(v.expiryDate) : null
    if (v.batchNumber !== undefined) data.batchNumber = v.batchNumber
    if (v.supplier !== undefined) data.supplier = v.supplier
    if (v.supplierPhone !== undefined) data.supplierPhone = v.supplierPhone
    if (v.manufacturer !== undefined) data.manufacturer = v.manufacturer
    if (v.storageTemp !== undefined) data.storageTemp = v.storageTemp
    if (v.storageLocation !== undefined) data.storageLocation = v.storageLocation
    if (v.prescription !== undefined) data.prescription = v.prescription
    if (v.withdrawalDays !== undefined) data.withdrawalDays = v.withdrawalDays
    if (v.dosageInstructions !== undefined) data.dosageInstructions = v.dosageInstructions
    if (v.notes !== undefined) data.notes = v.notes

    const item = await prisma.medicineItem.update({ where: { id: params.id }, data,
      include: { createdBy: { select: { id: true, name: true, role: true } }, updatedBy: { select: { id: true, name: true, role: true } } },
    })

    if (v.quantity !== undefined && Math.abs(newQty - prevQty) > 0.001) {
      const change = newQty - prevQty
      const txType = v.stockTransactionType ?? (change > 0 ? 'RESTOCK' : 'CONSUME')
      await prisma.stockTransaction.create({
        data: {
          organizationId: payload.organizationId,
          type: txType,
          resourceType: 'medicine',
          medicineItemId: params.id,
          quantityBefore: prevQty,
          quantityChange: change,
          quantityAfter: newQty,
          costPerUnit: newCost,
          totalCost: Math.abs(change) * newCost,
          reason: v.stockChangeReason ?? (change > 0 ? 'Restock' : 'Usage'),
          batchNumber: v.batchNumber ?? existing.batchNumber,
          performedById: payload.userId,
        },
      })
      // Increment usageCount for consumption
      if (change < 0) {
        await prisma.medicineItem.update({ where: { id: params.id }, data: { usageCount: { increment: 1 } } })
      }
    }

    return NextResponse.json({ message: 'Medicine updated.', item })
  } catch (e: any) {
    console.error('[inventory/medicine/id] PATCH:', e)
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Failed to update medicine' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })

    const existing = await prisma.medicineItem.findFirst({ where: { id: params.id, organizationId: payload.organizationId } })
    if (!existing) return NextResponse.json({ error: 'Medicine not found.' }, { status: 404 })

    await prisma.medicineItem.update({ where: { id: params.id }, data: { isActive: false, updatedById: payload.userId } })
    return NextResponse.json({ message: 'Medicine deleted.' })
  } catch (e: any) {
    console.error('[inventory/medicine/id] DELETE:', e)
    return NextResponse.json({ error: 'Failed to delete medicine' }, { status: 500 })
  }
}