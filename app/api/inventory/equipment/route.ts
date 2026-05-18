// app/api/inventory/equipment/route.ts
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

const EquipmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'), // dairy | poultry | processing | utility | vehicle | feeding | medical | other
  status: z.enum(['OPERATIONAL', 'MAINTENANCE', 'REPAIR', 'RETIRED']).default('OPERATIONAL'),
  serialNumber: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  purchaseCost: z.number().min(0).optional().nullable(),   // KSH
  currentValue: z.number().min(0).optional().nullable(),   // KSH
  lastServiceDate: z.string().optional().nullable(),
  nextServiceDate: z.string().optional().nullable(),
  serviceIntervalDays: z.number().int().min(1).optional().nullable(),
  usageHours: z.number().min(0).optional().nullable(),
  maxUsageHours: z.number().min(0).optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  warrantyExpiry: z.string().optional().nullable(),
  insuranceNo: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  supplierPhone: z.string().optional().nullable(),
  maintenanceNotes: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

function buildEquipmentAlerts(item: {
  status: string; nextServiceDate: Date | null; usageHours: number | null; maxUsageHours: number | null; warrantyExpiry: Date | null
}) {
  const alerts: string[] = []
  if (item.status !== 'OPERATIONAL') alerts.push(`STATUS_${item.status}`)
  if (item.nextServiceDate) {
    const days = (item.nextServiceDate.getTime() - Date.now()) / 86400000
    if (days < 0) alerts.push('SERVICE_OVERDUE')
    else if (days <= 14) alerts.push('SERVICE_DUE_SOON')
  }
  if (item.maxUsageHours && item.usageHours && item.usageHours >= item.maxUsageHours * 0.9) {
    alerts.push('HOURS_LIMIT_NEAR')
  }
  if (item.warrantyExpiry) {
    const days = (item.warrantyExpiry.getTime() - Date.now()) / 86400000
    if (days < 0) alerts.push('WARRANTY_EXPIRED')
    else if (days <= 30) alerts.push('WARRANTY_EXPIRING')
  }
  return alerts
}

export async function GET(req: NextRequest) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const alertsOnly = searchParams.get('alertsOnly') === 'true'
    const search = searchParams.get('search')?.trim()
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')))

    const where: any = { organizationId: payload.organizationId, isActive: true }
    if (status) where.status = status
    if (type) where.type = { contains: type, mode: 'insensitive' }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
        { assignedTo: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
      ]
    }

    const items = await prisma.equipmentItem.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        updatedBy: { select: { id: true, name: true, role: true } },
        equipmentEvents: {
          orderBy: { eventDate: 'desc' },
          take: 3,
          include: { performedBy: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    })

    const enriched = items.map(item => ({
      ...item,
      alerts: buildEquipmentAlerts({
        status: item.status, nextServiceDate: item.nextServiceDate,
        usageHours: item.usageHours, maxUsageHours: item.maxUsageHours,
        warrantyExpiry: item.warrantyExpiry,
      }),
    }))

    const filtered = alertsOnly ? enriched.filter(i => i.alerts.length > 0) : enriched
    const paginated = filtered.slice((page - 1) * limit, page * limit)

    return NextResponse.json({
      items: paginated,
      pagination: { page, limit, total: filtered.length, pages: Math.ceil(filtered.length / limit) },
      summary: {
        totalItems: items.length,
        operational: items.filter(i => i.status === 'OPERATIONAL').length,
        maintenance: items.filter(i => i.status === 'MAINTENANCE').length,
        repair: items.filter(i => i.status === 'REPAIR').length,
        retired: items.filter(i => i.status === 'RETIRED').length,
        serviceDueSoon: enriched.filter(i => i.alerts.some(a => a.includes('SERVICE'))).length,
      },
    })
  } catch (e: any) {
    console.error('[inventory/equipment] GET:', e)
    return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Only Admins, Managers, and Workers can add equipment.' }, { status: 403 })
    }

    const body = await req.json()
    const v = EquipmentSchema.parse(body)

    // Auto-calculate next service date from last service + interval
    let nextServiceDate = v.nextServiceDate ? new Date(v.nextServiceDate) : null
    if (!nextServiceDate && v.lastServiceDate && v.serviceIntervalDays) {
      nextServiceDate = new Date(v.lastServiceDate)
      nextServiceDate.setDate(nextServiceDate.getDate() + v.serviceIntervalDays)
    }

    const item = await prisma.equipmentItem.create({
      data: {
        organizationId: payload.organizationId,
        name: v.name,
        type: v.type,
        status: v.status,
        serialNumber: v.serialNumber ?? null,
        model: v.model ?? null,
        manufacturer: v.manufacturer ?? null,
        purchaseDate: v.purchaseDate ? new Date(v.purchaseDate) : null,
        purchaseCost: v.purchaseCost ?? null,
        currentValue: v.currentValue ?? null,
        lastServiceDate: v.lastServiceDate ? new Date(v.lastServiceDate) : null,
        nextServiceDate,
        serviceIntervalDays: v.serviceIntervalDays ?? null,
        usageHours: v.usageHours ?? 0,
        maxUsageHours: v.maxUsageHours ?? null,
        assignedTo: v.assignedTo ?? null,
        location: v.location ?? null,
        warrantyExpiry: v.warrantyExpiry ? new Date(v.warrantyExpiry) : null,
        insuranceNo: v.insuranceNo ?? null,
        supplier: v.supplier ?? null,
        supplierPhone: v.supplierPhone ?? null,
        maintenanceNotes: v.maintenanceNotes ?? null,
        notes: v.notes ?? null,
        createdById: payload.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
      },
    })

    return NextResponse.json({ message: 'Equipment added.', item }, { status: 201 })
  } catch (e: any) {
    console.error('[inventory/equipment] POST:', e)
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Failed to add equipment' }, { status: 500 })
  }
}

// ── Equipment by ID ────────────────────────────────────────────────────────────
// These handlers are placed here for convenience — in Next.js move to [id]/route.ts

export async function PUT(req: NextRequest) {
  // PATCH equivalent for updates — PUT body must include ?id=
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Equipment ID required.' }, { status: 400 })

  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })

    const existing = await prisma.equipmentItem.findFirst({ where: { id, organizationId: payload.organizationId } })
    if (!existing) return NextResponse.json({ error: 'Equipment not found.' }, { status: 404 })

    const body = await req.json()
    const v = EquipmentSchema.partial().parse(body)

    // Auto-calculate next service date if interval + last service provided
    let nextServiceDate = v.nextServiceDate !== undefined ? (v.nextServiceDate ? new Date(v.nextServiceDate) : null) : undefined
    if (v.lastServiceDate && v.serviceIntervalDays && !nextServiceDate) {
      nextServiceDate = new Date(v.lastServiceDate)
      nextServiceDate.setDate(nextServiceDate.getDate() + v.serviceIntervalDays)
    }

    const data: any = { updatedById: payload.userId }
    const fields = ['name','type','serialNumber','model','manufacturer','assignedTo','location','insuranceNo','supplier','supplierPhone','maintenanceNotes','notes'] as const
    fields.forEach(f => { if ((v as any)[f] !== undefined) data[f] = (v as any)[f] })
    if (v.status) data.status = v.status
    if (v.purchaseDate !== undefined) data.purchaseDate = v.purchaseDate ? new Date(v.purchaseDate) : null
    if (v.purchaseCost !== undefined) data.purchaseCost = v.purchaseCost
    if (v.currentValue !== undefined) data.currentValue = v.currentValue
    if (v.lastServiceDate !== undefined) data.lastServiceDate = v.lastServiceDate ? new Date(v.lastServiceDate) : null
    if (nextServiceDate !== undefined) data.nextServiceDate = nextServiceDate
    if (v.serviceIntervalDays !== undefined) data.serviceIntervalDays = v.serviceIntervalDays
    if (v.usageHours !== undefined) data.usageHours = v.usageHours
    if (v.maxUsageHours !== undefined) data.maxUsageHours = v.maxUsageHours
    if (v.warrantyExpiry !== undefined) data.warrantyExpiry = v.warrantyExpiry ? new Date(v.warrantyExpiry) : null

    const item = await prisma.equipmentItem.update({ where: { id }, data,
      include: { createdBy: { select: { id: true, name: true, role: true } }, updatedBy: { select: { id: true, name: true, role: true } } },
    })

    // Log event if status changed
    const { eventType, eventDescription, eventCost, technicianName } = body
    if (eventType || v.status !== existing.status) {
      await prisma.equipmentEvent.create({
        data: {
          organizationId: payload.organizationId,
          equipmentId: id,
          eventType: eventType ?? (v.status === 'OPERATIONAL' ? 'SERVICE' : 'REPAIR'),
          eventDate: new Date(),
          description: eventDescription ?? `Status changed to ${v.status ?? existing.status}`,
          cost: eventCost ?? null,
          technicianName: technicianName ?? null,
          hoursAtEvent: v.usageHours ?? existing.usageHours ?? null,
          performedById: payload.userId,
        },
      })
    }

    return NextResponse.json({ message: 'Equipment updated.', item })
  } catch (e: any) {
    console.error('[inventory/equipment] PUT:', e)
    if (e.name === 'ZodError') return NextResponse.json({ error: e.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Failed to update equipment' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Equipment ID required.' }, { status: 400 })

  try {
    const payload = auth(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!WRITE_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })

    const existing = await prisma.equipmentItem.findFirst({ where: { id, organizationId: payload.organizationId } })
    if (!existing) return NextResponse.json({ error: 'Equipment not found.' }, { status: 404 })

    await prisma.equipmentItem.update({ where: { id }, data: { isActive: false, status: 'RETIRED', updatedById: payload.userId } })
    await prisma.equipmentEvent.create({
      data: {
        organizationId: payload.organizationId,
        equipmentId: id,
        eventType: 'RETIREMENT',
        eventDate: new Date(),
        description: 'Equipment retired / deleted from system',
        performedById: payload.userId,
      },
    })
    return NextResponse.json({ message: 'Equipment retired.' })
  } catch (e: any) {
    console.error('[inventory/equipment] DELETE:', e)
    return NextResponse.json({ error: 'Failed to retire equipment' }, { status: 500 })
  }
}