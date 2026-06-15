// app/api/inventory/feed/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/utils'
import { z } from 'zod'

// ADMIN | MANAGER | WORKER can create/edit/delete
const WRITE_ROLES = ['ADMIN', 'MANAGER', 'WORKER']

function auth(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  return verifyToken(token) // returns { userId, email, role, organizationId }
}

const FeedSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['DAIRY','POULTRY','PIG','CATTLE','SHEEP','GOAT','ROUGHAGE','SUPPLEMENT','CONCENTRATE','OTHER']),
  quantityKg: z.number().min(0, 'Quantity must be ≥ 0'),
  minimumKg: z.number().min(0, 'Minimum must be ≥ 0'),
  maximumKg: z.number().optional().nullable(),
  costPerKg: z.number().min(0, 'Cost must be ≥ 0'),  // KSH
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
})

// Auto-mark overdue restocks: if quantity ≤ minimum, flag for notification
function buildAlerts(item: { quantityKg: number; minimumKg: number; expiryDate: Date | null }) {
  const alerts: string[] = []
  if (item.quantityKg <= item.minimumKg) alerts.push('LOW_STOCK')
  if (item.expiryDate) {
    const daysLeft = (item.expiryDate.getTime() - Date.now()) / 86400000
    if (daysLeft < 0) alerts.push('EXPIRED')
    else if (daysLeft < 30) alerts.push('EXPIRING_SOON')
  }
  return alerts
}

export async function GET(req: NextRequest) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const alertsOnly = searchParams.get('alertsOnly') === 'true'
    const search = searchParams.get('search')?.trim()
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')))

    const where: Record<string, unknown>  = { organizationId: payload.organizationId, isActive: true }
    if (type) where.type = type
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } },
        { storageLocation: { contains: search, mode: 'insensitive' } },
      ]
    }

    const items = await prisma.feedItem.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        updatedBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: [{ quantityKg: 'asc' }, { name: 'asc' }],
    })

    // Enrich with alerts
    const enriched = items.map(item => ({
      ...item,
      alerts: buildAlerts({ quantityKg: item.quantityKg, minimumKg: item.minimumKg, expiryDate: item.expiryDate }),
    }))

    const filtered = alertsOnly ? enriched.filter(i => i.alerts.length > 0) : enriched
    const paginated = filtered.slice((page - 1) * limit, page * limit)

    return NextResponse.json({
      items: paginated,
      pagination: { page, limit, total: filtered.length, pages: Math.ceil(filtered.length / limit) },
      summary: {
        totalItems: items.length,
        lowStock: enriched.filter(i => i.alerts.includes('LOW_STOCK')).length,
        expiring: enriched.filter(i => i.alerts.includes('EXPIRING_SOON')).length,
        expired: enriched.filter(i => i.alerts.includes('EXPIRED')).length,
        totalValueKsh: items.reduce((s, i) => s + i.quantityKg * i.costPerKg, 0),
      },
    })
  } catch (e: any) {
    console.error('[inventory/feed] GET:', e)
    return NextResponse.json({ error: 'Failed to fetch feed items' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Only Admins, Managers, and Workers can add feed items.' }, { status: 403 })
    }

    const body = await req.json()
    const v = FeedSchema.parse(body)

    const item = await prisma.feedItem.create({
      data: {
        organizationId: payload.organizationId,
        name: v.name,
        type: v.type,
        quantityKg: v.quantityKg,
        minimumKg: v.minimumKg,
        maximumKg: v.maximumKg ?? null,
        costPerKg: v.costPerKg,
        totalValue: v.quantityKg * v.costPerKg,
        supplier: v.supplier ?? null,
        supplierPhone: v.supplierPhone ?? null,
        supplierEmail: v.supplierEmail ?? null,
        lastRestocked: v.lastRestocked ? new Date(v.lastRestocked) : null,
        expiryDate: v.expiryDate ? new Date(v.expiryDate) : null,
        batchNumber: v.batchNumber ?? null,
        storageLocation: v.storageLocation ?? null,
        proteinPct: v.proteinPct ?? null,
        energyMcal: v.energyMcal ?? null,
        moisturePct: v.moisturePct ?? null,
        notes: v.notes ?? null,
        createdById: payload.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
      },
    })

    // Log initial stock transaction
    if (v.quantityKg > 0) {
      await prisma.stockTransaction.create({
        data: {
          organizationId: payload.organizationId,
          type: 'RESTOCK',
          resourceType: 'feed',
          feedItemId: item.id,
          quantityBefore: 0,
          quantityChange: v.quantityKg,
          quantityAfter: v.quantityKg,
          costPerUnit: v.costPerKg,
          totalCost: v.quantityKg * v.costPerKg,
          reason: 'Initial stock entry',
          batchNumber: v.batchNumber ?? null,
          performedById: payload.userId,
        },
      })
    }

    return NextResponse.json({ message: 'Feed item added.', item }, { status: 201 })
  } catch (e: any) {
    console.error('[inventory/feed] POST:', e)
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Failed to add feed item' }, { status: 500 })
  }
}