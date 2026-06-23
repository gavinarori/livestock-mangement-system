import request from 'supertest'
import { GET } from '@/app/api/analytics/route'
import { createNextTestServer } from '../utils/testServer'
import { authHeader } from '../utils/authHelpers'
import { mockOrgAuthSuccess, mockOrgAuthInsufficientPermission } from '../utils/Orgauthhelpers'
import { prismaMock } from '../mocks/prisma'

const server = createNextTestServer([
  { method: 'GET', path: '/api/analytics', handler: GET, paramsMode: 'none' },
])

describe('GET /api/analytics', () => {
  it('returns herd, health, and breeding aggregates for an authorized org', async () => {
    mockOrgAuthSuccess('ADMIN')
    prismaMock.animal.findMany.mockResolvedValueOnce([
      { id: 'a1', type: 'CATTLE', healthStatus: 'HEALTHY' },
      { id: 'a2', type: 'CATTLE', healthStatus: 'SICK' },
      { id: 'a3', type: 'SHEEP', healthStatus: 'HEALTHY' },
    ])
    prismaMock.healthRecord.findMany
      .mockResolvedValueOnce([{ id: 'hr1', date: new Date(), animal: {} }]) // recentHealthRecords
      .mockResolvedValueOnce([
        { vaccinationStatus: 'UP_TO_DATE' },
        { vaccinationStatus: 'OVERDUE' },
      ]) // vaccinationRecords
      .mockResolvedValueOnce([]) // recentDiseases
    prismaMock.breeding.findMany.mockResolvedValueOnce([{ id: 'b1', dam: {}, sire: {} }])

    const res = await request(server).get('/api/analytics').set(authHeader({ role: 'ADMIN' }))

    expect(res.status).toBe(200)
    expect(res.body.herd.total).toBe(3)
    expect(res.body.herd.byType).toEqual({ CATTLE: 2, SHEEP: 1 })
    expect(res.body.herd.byHealth).toEqual({ HEALTHY: 2, SICK: 1 })
    expect(res.body.health.vaccinationStats).toEqual({ UP_TO_DATE: 1, OVERDUE: 1 })
    expect(res.body.breeding.total).toBe(1)
  })

  it('returns 401 when no auth token is provided', async () => {
    const res = await request(server).get('/api/analytics')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Unauthorized')
  })

  it('returns 403 when the JWT role lacks analytics:read permission', async () => {
    // WORKER's ROLE_PERMISSIONS list doesn't include 'analytics:read'
    mockOrgAuthInsufficientPermission('WORKER')

    const res = await request(server).get('/api/analytics').set(authHeader({ role: 'WORKER' }))

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Insufficient permissions')
  })

  it('returns 500 and an error payload when a query fails', async () => {
    mockOrgAuthSuccess('ADMIN')
    prismaMock.animal.findMany.mockRejectedValueOnce(new Error('db down'))

    const res = await request(server).get('/api/analytics').set(authHeader({ role: 'ADMIN' }))

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Failed to fetch analytics')
  })
})