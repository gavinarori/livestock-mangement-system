// Tests for: app/api/breeding/records/route.ts  (GET, POST)
import request from 'supertest'
import { GET, POST } from '@/app/api/breeding/records/route'
import { createNextTestServer } from '../utils/testServer'
import { authHeader } from '../utils/authHelpers'
import { prismaMock } from '../mocks/prisma'

const server = createNextTestServer([
  { method: 'GET', path: '/api/breeding/records', handler: GET, paramsMode: 'none' },
  { method: 'POST', path: '/api/breeding/records', handler: POST, paramsMode: 'none' },
])

describe('GET /api/breeding/records', () => {
  it('returns a paginated list of breeding records for the org', async () => {
    prismaMock.breeding.findMany.mockResolvedValueOnce([
      { id: 'b1', damId: 'd1', sireId: 's1', dam: {}, sire: {}, createdBy: {}, updatedBy: null },
    ] as any)
    prismaMock.breeding.count.mockResolvedValueOnce(1)

    const res = await request(server).get('/api/breeding/records').set(authHeader())

    expect(res.status).toBe(200)
    expect(res.body.records).toHaveLength(1)
    expect(res.body.pagination).toEqual({ page: 1, limit: 20, total: 1, pages: 1 })
  })

  it('applies outcome, damId, and search filters to the where clause', async () => {
    prismaMock.breeding.findMany.mockResolvedValueOnce([])
    prismaMock.breeding.count.mockResolvedValueOnce(0)

    const res = await request(server)
      .get('/api/breeding/records')
      .query({ outcome: 'PENDING', damId: 'd1', search: 'bessie' })
      .set(authHeader())

    expect(res.status).toBe(200)
    const where = prismaMock.breeding.findMany.mock.calls[0][0].where
    expect(where.outcome).toBe('PENDING')
    expect(where.damId).toBe('d1')
    expect(where.OR).toBeDefined()
  })

  it('returns 500 when the database query fails', async () => {
    prismaMock.breeding.findMany.mockRejectedValueOnce(new Error('db down'))

    const res = await request(server).get('/api/breeding/records').set(authHeader())

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Failed to fetch breeding records')
  })
})

describe('POST /api/breeding/records', () => {
  const validBody = {
    damId: 'dam-1',
    sireId: 'sire-1',
    breedingDate: '2026-01-01',
  }

  it('creates a breeding record when dam/sire are compatible', async () => {
    // validateBreedingCompatibility: dam, sire lookups
    prismaMock.animal.findFirst
      .mockResolvedValueOnce({
        id: 'dam-1', name: 'Bessie', gender: 'FEMALE', type: 'CATTLE',
        healthStatus: 'HEALTHY', parentMaleId: null, parentFemaleId: null,
      } as any)
      .mockResolvedValueOnce({
        id: 'sire-1', name: 'Ferdinand', gender: 'MALE', type: 'CATTLE',
        healthStatus: 'HEALTHY', parentMaleId: null, parentFemaleId: null,
      } as any)
    // pending breeding check
    prismaMock.breeding.findFirst.mockResolvedValueOnce(null)
    // calculateInbreedingCoeff -> getAncestors calls for dam then sire (depth 4 each, but no parents so returns early)
    prismaMock.animal.findFirst
      .mockResolvedValueOnce({ parentMaleId: null, parentFemaleId: null } as any) // dam ancestors
      .mockResolvedValueOnce({ parentMaleId: null, parentFemaleId: null } as any) // sire ancestors

    prismaMock.breeding.create.mockResolvedValueOnce({
      id: 'b1', damId: 'dam-1', sireId: 'sire-1', dam: {}, sire: {}, createdBy: {},
    } as any)

    const res = await request(server)
      .post('/api/breeding/records')
      .set(authHeader({ role: 'ADMIN' }))
      .send(validBody)

    expect(res.status).toBe(201)
    expect(res.body.message).toBe('Breeding record created successfully.')
    expect(res.body.record.id).toBe('b1')
  })

  it('returns 403 when the role lacks write permission', async () => {
    const res = await request(server)
      .post('/api/breeding/records')
      .set(authHeader({ role: 'VIEWER' }))
      .send(validBody)

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/Admins, Managers, and Veterinarians/)
  })

  it('returns 422 when dam and sire are incompatible (cross-species)', async () => {
    prismaMock.animal.findFirst
      .mockResolvedValueOnce({
        id: 'dam-1', name: 'Bessie', gender: 'FEMALE', type: 'CATTLE',
        healthStatus: 'HEALTHY', parentMaleId: null, parentFemaleId: null,
      } as any)
      .mockResolvedValueOnce({
        id: 'sire-1', name: 'Wooly', gender: 'MALE', type: 'SHEEP',
        healthStatus: 'HEALTHY', parentMaleId: null, parentFemaleId: null,
      } as any)
    prismaMock.breeding.findFirst.mockResolvedValueOnce(null)

    const res = await request(server)
      .post('/api/breeding/records')
      .set(authHeader({ role: 'ADMIN' }))
      .send(validBody)

    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/Cross-species breeding is not allowed/)
  })

  it('returns 400 when the request body fails validation', async () => {
    const res = await request(server)
      .post('/api/breeding/records')
      .set(authHeader({ role: 'ADMIN' }))
      .send({ damId: '', sireId: '', breedingDate: 'not-a-date' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })

  it('returns 401 when no auth token is provided', async () => {
    const res = await request(server).post('/api/breeding/records').send(validBody)
    expect(res.status).toBe(401)
  })
})