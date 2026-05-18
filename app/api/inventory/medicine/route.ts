// app/api/inventory/medicine/route.ts
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

const MedicineSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.enum(['ANTIBIOTIC','VACCINE','DEWORMER','SUPPLEMENT','PESTICIDE','TREATMENT','ANTIFUNGAL','ANTIPARASITIC','HORMONE','OTHER']),
  quantity: z.number().min(0),
  unit: z.string().min(1, 'Unit is required'),
  minimumQty: z.number().min(0),
  maximumQty: z.number().optional().nullable(),
  costPerUnit: z.number().min(0).optional().nullable(),  // KSH
  expiryDate: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  supplierPhone: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  licenseNo: z.string().optional().nullable(),
  storageTemp: z.enum(['refrigerated','cool-dry','room-temp']).optional().nullable(),
  storageLocation: z.string().optional().nullable(),
  prescription: z.boolean().default(false),
  withdrawalDays: z.number().int().min(0).optional().nullable(),
  activeIngredient: z.string().optional().nullable(),
  dosageInstructions: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

function buildAlerts(item: { quantity: number; minimumQty: number; expiryDate: Date | null }) {
  const alerts: string[] = []
  if (item.quantity <= item.minimumQty) alerts.push('LOW_STOCK')
  if (item.expiryDate) {
    const days = (item.expiryDate.getTime() - Date.now()) / 86400000
    if (days < 0) alerts.push('EXPIRED')
    else if (days < 30) alerts.push('EXPIRING_SOON')
  }
  return alerts
}

export async function GET(req: NextRequest) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const alertsOnly = searchParams.get('alertsOnly') === 'true'
    const search = searchParams.get('search')?.trim()
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')))

    const where: any = { organizationId: payload.organizationId, isActive: true }
    if (category) where.category = category
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } },
        { batchNumber: { contains: search, mode: 'insensitive' } },
        { activeIngredient: { contains: search, mode: 'insensitive' } },
      ]
    }

    const items = await prisma.medicineItem.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        updatedBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: [{ expiryDate: 'asc' }, { quantity: 'asc' }],
    })

    const enriched = items.map(item => ({
      ...item,
      alerts: buildAlerts({ quantity: item.quantity, minimumQty: item.minimumQty, expiryDate: item.expiryDate }),
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
        totalValueKsh: items.reduce((s, i) => s + i.quantity * (i.costPerUnit ?? 0), 0),
      },
    })
  } catch (e: any) {
    console.error('[inventory/medicine] GET:', e)
    return NextResponse.json({ error: 'Failed to fetch medicine items' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Only Admins, Managers, and Workers can add medicines.' }, { status: 403 })
    }

    const body = await req.json()
    const v = MedicineSchema.parse(body)

    // Warn if expiry date is in the past
    let warning: string | null = null
    if (v.expiryDate && new Date(v.expiryDate) < new Date()) {
      warning = 'This medicine has already expired. Please verify the expiry date.'
    }

    const item = await prisma.medicineItem.create({
      data: {
        organizationId: payload.organizationId,
        name: v.name,
        category: v.category,
        quantity: v.quantity,
        unit: v.unit,
        minimumQty: v.minimumQty,
        maximumQty: v.maximumQty ?? null,
        costPerUnit: v.costPerUnit ?? null,
        totalValue: v.quantity * (v.costPerUnit ?? 0),
        expiryDate: v.expiryDate ? new Date(v.expiryDate) : null,
        batchNumber: v.batchNumber ?? null,
        supplier: v.supplier ?? null,
        supplierPhone: v.supplierPhone ?? null,
        manufacturer: v.manufacturer ?? null,
        licenseNo: v.licenseNo ?? null,
        storageTemp: v.storageTemp ?? null,
        storageLocation: v.storageLocation ?? null,
        prescription: v.prescription,
        withdrawalDays: v.withdrawalDays ?? null,
        activeIngredient: v.activeIngredient ?? null,
        dosageInstructions: v.dosageInstructions ?? null,
        notes: v.notes ?? null,
        usageCount: 0,
        createdById: payload.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
      },
    })

    // Log initial stock transaction
    if (v.quantity > 0) {
      await prisma.stockTransaction.create({
        data: {
          organizationId: payload.organizationId,
          type: 'RESTOCK',
          resourceType: 'medicine',
          medicineItemId: item.id,
          quantityBefore: 0,
          quantityChange: v.quantity,
          quantityAfter: v.quantity,
          costPerUnit: v.costPerUnit ?? null,
          totalCost: v.quantity * (v.costPerUnit ?? 0),
          reason: 'Initial stock entry',
          batchNumber: v.batchNumber ?? null,
          performedById: payload.userId,
        },
      })
    }

    return NextResponse.json({ message: 'Medicine added.', item, warning }, { status: 201 })
  } catch (e: any) {
    console.error('[inventory/medicine] POST:', e)
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Failed to add medicine' }, { status: 500 })
  }
}