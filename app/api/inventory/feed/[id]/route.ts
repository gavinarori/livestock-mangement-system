// app/api/inventory/feed/[id]/route.ts
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

const UpdateFeedSchema = z.object({
  name: z.string().optional(),
  type: z.enum(['DAIRY','POULTRY','PIG','CATTLE','SHEEP','GOAT','ROUGHAGE','SUPPLEMENT','CONCENTRATE','OTHER']).optional(),
  quantityKg: z.number().min(0).optional(),
  minimumKg: z.number().min(0).optional(),
  maximumKg: z.number().optional().nullable(),
  costPerKg: z.number().min(0).optional(),
  supplier: z.string().optional().nullable(),
  supplierPhone: z.string().optional().nullable(),
  supplierEmail: z.string().email().optional().nullable(),
  lastRestocked: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  storageLocation: z.string().optional().nullable(),
  proteinPct: z.number().min(0).max(100).optional().nullable(),
  energyMcal: z.number().min(0).optional().nullable(),
  moisturePct: z.number().min(0).max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
  // For stock adjustments: include reason and transaction type
  stockChangeReason: z.string().optional().nullable(),
  stockTransactionType: z.enum(['RESTOCK','CONSUME','ADJUST','DISPOSE','TRANSFER']).optional(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const item = await prisma.feedItem.findFirst({
      where: { id: params.id, organizationId: payload.organizationId },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        updatedBy: { select: { id: true, name: true, role: true } },
        stockTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { performedBy: { select: { id: true, name: true, role: true } } },
        },
      },
    })
    if (!item) return NextResponse.json({ error: 'Feed item not found.' }, { status: 404 })
    return NextResponse.json({ item })
  } catch (e: any) {
    console.error('[inventory/feed/id] GET:', e)
    return NextResponse.json({ error: 'Failed to fetch feed item' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to edit feed items.' }, { status: 403 })
    }

    const existing = await prisma.feedItem.findFirst({
      where: { id: params.id, organizationId: payload.organizationId },
    })
    if (!existing) return NextResponse.json({ error: 'Feed item not found.' }, { status: 404 })

    const body = await req.json()
    const v = UpdateFeedSchema.parse(body)

    const prevQty = existing.quantityKg
    const newQty = v.quantityKg ?? existing.quantityKg
    const newCost = v.costPerKg ?? existing.costPerKg

    const data: any = { updatedById: payload.userId }
    if (v.name !== undefined) data.name = v.name
    if (v.type !== undefined) data.type = v.type
    if (v.quantityKg !== undefined) { data.quantityKg = v.quantityKg; data.totalValue = v.quantityKg * newCost }
    if (v.minimumKg !== undefined) data.minimumKg = v.minimumKg
    if (v.maximumKg !== undefined) data.maximumKg = v.maximumKg
    if (v.costPerKg !== undefined) { data.costPerKg = v.costPerKg; data.totalValue = newQty * v.costPerKg }
    if (v.supplier !== undefined) data.supplier = v.supplier
    if (v.supplierPhone !== undefined) data.supplierPhone = v.supplierPhone
    if (v.supplierEmail !== undefined) data.supplierEmail = v.supplierEmail
    if (v.lastRestocked !== undefined) data.lastRestocked = v.lastRestocked ? new Date(v.lastRestocked) : null
    if (v.expiryDate !== undefined) data.expiryDate = v.expiryDate ? new Date(v.expiryDate) : null
    if (v.batchNumber !== undefined) data.batchNumber = v.batchNumber
    if (v.storageLocation !== undefined) data.storageLocation = v.storageLocation
    if (v.proteinPct !== undefined) data.proteinPct = v.proteinPct
    if (v.energyMcal !== undefined) data.energyMcal = v.energyMcal
    if (v.moisturePct !== undefined) data.moisturePct = v.moisturePct
    if (v.notes !== undefined) data.notes = v.notes

    const item = await prisma.feedItem.update({ where: { id: params.id }, data,
      include: { createdBy: { select: { id: true, name: true, role: true } }, updatedBy: { select: { id: true, name: true, role: true } } },
    })

    // Log stock change if quantity changed
    if (v.quantityKg !== undefined && Math.abs(newQty - prevQty) > 0.001) {
      const change = newQty - prevQty
      const txType = v.stockTransactionType ?? (change > 0 ? 'RESTOCK' : 'CONSUME')
      await prisma.stockTransaction.create({
        data: {
          organizationId: payload.organizationId,
          type: txType,
          resourceType: 'feed',
          feedItemId: params.id,
          quantityBefore: prevQty,
          quantityChange: change,
          quantityAfter: newQty,
          costPerUnit: newCost,
          totalCost: Math.abs(change) * newCost,
          reason: v.stockChangeReason ?? (change > 0 ? 'Restock' : 'Consumption'),
          batchNumber: v.batchNumber ?? existing.batchNumber,
          performedById: payload.userId,
        },
      })

      // If this is a restock, update lastRestocked
      if (change > 0) {
        await prisma.feedItem.update({ where: { id: params.id }, data: { lastRestocked: new Date() } })
      }
    }

    return NextResponse.json({ message: 'Feed item updated.', item })
  } catch (e: any) {
    console.error('[inventory/feed/id] PATCH:', e)
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Failed to update feed item' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to delete feed items.' }, { status: 403 })
    }

    const existing = await prisma.feedItem.findFirst({
      where: { id: params.id, organizationId: payload.organizationId },
    })
    if (!existing) return NextResponse.json({ error: 'Feed item not found.' }, { status: 404 })

    // Soft delete
    await prisma.feedItem.update({ where: { id: params.id }, data: { isActive: false, updatedById: payload.userId } })
    return NextResponse.json({ message: 'Feed item deleted.' })
  } catch (e: any) {
    console.error('[inventory/feed/id] DELETE:', e)
    return NextResponse.json({ error: 'Failed to delete feed item' }, { status: 500 })
  }
}