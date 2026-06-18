// Tests for: app/api/breeding/heat-cycles/route.ts  (GET, POST, DELETE)
import request from 'supertest'
import { GET, POST, DELETE } from '@/app/api/breeding/heat-cycles/route'
import { createNextTestServer } from '../utils/testServer'
import { authHeader } from '../utils/authHelpers'
import { prismaMock } from '../mocks/prisma'

const server = createNextTestServer([
  { method: 'GET', path: '/api/breeding/heat-cycles', handler: GET, paramsMode: 'none' },
  { method: 'POST', path: '/api/breeding/heat-cycles', handler: POST, paramsMode: 'none' },
  { method: 'DELETE', path: '/api/breeding/heat-cycles', handler: DELETE, paramsMode: 'none' },
])

describe('GET /api/breeding/heat-cycles', () => {
  it('returns a paginated list of heat cycles, recalculating overdue ones first', async () => {
    prismaMock.heatCycle.findMany
      .mockResolvedValueOnce([{ id: 'hc-overdue' }] as any) // overdueRecords lookup
      .mockResolvedValueOnce([{ id: 'hc1', animal: {}, createdBy: {} }] as any) // main list
    prismaMock.heatCycle.updateMany.mockResolvedValueOnce({ count: 1 } as any)
    prismaMock.heatCycle.count.mockResolvedValueOnce(1)

    const res = await request(server).get('/api/breeding/heat-cycles').set(authHeader())

    expect(res.status).toBe(200)
    expect(res.body.cycles).toHaveLength(1)
    expect(prismaMock.heatCycle.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['hc-overdue'] } },
      data: { status: 'OVERDUE' },
    })
  })

  it('skips the bulk update when there are no overdue records', async () => {
    prismaMock.heatCycle.findMany
      .mockResolvedValueOnce([]) // no overdue records
      .mockResolvedValueOnce([])
    prismaMock.heatCycle.count.mockResolvedValueOnce(0)

    const res = await request(server).get('/api/breeding/heat-cycles').set(authHeader())

    expect(res.status).toBe(200)
    expect(prismaMock.heatCycle.updateMany).not.toHaveBeenCalled()
  })

  it('returns 500 on database error', async () => {
    prismaMock.heatCycle.findMany.mockRejectedValueOnce(new Error('db down'))

    const res = await request(server).get('/api/breeding/heat-cycles').set(authHeader())

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Failed to fetch heat cycles')
  })
})

describe('POST /api/breeding/heat-cycles', () => {
  const validBody = { animalId: 'a1', lastHeatDate: '2026-01-01' }

  it('creates a heat cycle for a valid female animal', async () => {
    prismaMock.animal.findFirst.mockResolvedValueOnce({
      id: 'a1', name: 'Bessie', gender: 'FEMALE', healthStatus: 'HEALTHY', type: 'CATTLE',
    } as any)
    prismaMock.heatCycle.create.mockResolvedValueOnce({
      id: 'hc1', animal: {}, createdBy: {},
    } as any)

    const res = await request(server)
      .post('/api/breeding/heat-cycles')
      .set(authHeader({ role: 'ADMIN' }))
      .send(validBody)

    expect(res.status).toBe(201)
    expect(res.body.message).toBe('Heat cycle logged successfully.')
  })

  it('returns 403 when role lacks write permission', async () => {
    const res = await request(server)
      .post('/api/breeding/heat-cycles')
      .set(authHeader({ role: 'VIEWER' }))
      .send(validBody)

    expect(res.status).toBe(403)
  })

  it('returns 404 when the animal does not exist in the org', async () => {
    prismaMock.animal.findFirst.mockResolvedValueOnce(null)

    const res = await request(server)
      .post('/api/breeding/heat-cycles')
      .set(authHeader({ role: 'ADMIN' }))
      .send(validBody)

    expect(res.status).toBe(404)
  })

  it('returns 422 when the animal is not female', async () => {
    prismaMock.animal.findFirst.mockResolvedValueOnce({
      id: 'a1', name: 'Ferdinand', gender: 'MALE', healthStatus: 'HEALTHY', type: 'CATTLE',
    } as any)

    const res = await request(server)
      .post('/api/breeding/heat-cycles')
      .set(authHeader({ role: 'ADMIN' }))
      .send(validBody)

    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/not female/)
  })

  it('returns 422 when the animal is deceased', async () => {
    prismaMock.animal.findFirst.mockResolvedValueOnce({
      id: 'a1', name: 'Bessie', gender: 'FEMALE', healthStatus: 'DECEASED', type: 'CATTLE',
    } as any)

    const res = await request(server)
      .post('/api/breeding/heat-cycles')
      .set(authHeader({ role: 'ADMIN' }))
      .send(validBody)

    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/deceased/)
  })

  it('returns 400 on invalid payload', async () => {
    const res = await request(server)
      .post('/api/breeding/heat-cycles')
      .set(authHeader({ role: 'ADMIN' }))
      .send({ animalId: '', lastHeatDate: 'not-a-date' })

    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/breeding/heat-cycles', () => {
  it('deletes an existing heat cycle by query id', async () => {
    prismaMock.heatCycle.findFirst.mockResolvedValueOnce({ id: 'hc1' } as any)
    prismaMock.heatCycle.delete.mockResolvedValueOnce({ id: 'hc1' } as any)

    const res = await request(server)
      .delete('/api/breeding/heat-cycles')
      .query({ id: 'hc1' })
      .set(authHeader({ role: 'ADMIN' }))

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Heat cycle deleted successfully.')
  })

  it('returns 400 when no id query param is provided', async () => {
    const res = await request(server)
      .delete('/api/breeding/heat-cycles')
      .set(authHeader({ role: 'ADMIN' }))

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Heat cycle ID required.')
  })

  it('returns 403 when role lacks permission to delete', async () => {
    const res = await request(server)
      .delete('/api/breeding/heat-cycles')
      .query({ id: 'hc1' })
      .set(authHeader({ role: 'VIEWER' }))

    expect(res.status).toBe(403)
  })

  it('returns 404 when the heat cycle does not exist', async () => {
    prismaMock.heatCycle.findFirst.mockResolvedValueOnce(null)

    const res = await request(server)
      .delete('/api/breeding/heat-cycles')
      .query({ id: 'missing' })
      .set(authHeader({ role: 'ADMIN' }))

    expect(res.status).toBe(404)
  })
})