// Tests for: app/api/organization/route.ts  (GET, PUT)
import request from 'supertest'
import { GET, PUT } from '@/app/api/organization/route'
import { createNextTestServer } from '../utils/testServer'
import { authHeader } from '../utils/authHelpers'
import { prismaMock } from '../mocks/prisma'

const server = createNextTestServer([
  { method: 'GET', path: '/api/organization', handler: GET, paramsMode: 'none' },
  { method: 'PUT', path: '/api/organization', handler: PUT, paramsMode: 'none' },
])

describe('GET /api/organization', () => {
  it('returns the organization with member and animal counts', async () => {
    prismaMock.organization.findUnique.mockResolvedValueOnce({
      id: 'org-1',
      name: 'Green Acres',
      _count: { members: 4, animals: 120 },
    } as any)

    const res = await request(server).get('/api/organization').set(authHeader())

    expect(res.status).toBe(200)
    expect(res.body.organization.memberCount).toBe(4)
    expect(res.body.organization.animalCount).toBe(120)
  })

  it('returns 404 when the organization does not exist', async () => {
    prismaMock.organization.findUnique.mockResolvedValueOnce(null)

    const res = await request(server).get('/api/organization').set(authHeader())

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Organization not found')
  })

  it('returns 401 when no auth token is provided', async () => {
    const res = await request(server).get('/api/organization')
    expect(res.status).toBe(401)
  })

  it('returns 500 on database error', async () => {
    prismaMock.organization.findUnique.mockRejectedValueOnce(new Error('db down'))

    const res = await request(server).get('/api/organization').set(authHeader())

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Failed to fetch organization')
  })
})

describe('PUT /api/organization', () => {
  it('updates the organization when the requester is an admin', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' } as any)
    prismaMock.organization.update.mockResolvedValueOnce({
      id: 'org-1', name: 'New Name',
    } as any)

    const res = await request(server)
      .put('/api/organization')
      .set(authHeader({ role: 'ADMIN' }))
      .send({ name: 'New Name' })

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Organization updated successfully')
    expect(res.body.organization.name).toBe('New Name')
  })

  it('returns 403 when the requester is not an admin', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null)

    const res = await request(server)
      .put('/api/organization')
      .set(authHeader({ role: 'MANAGER' }))
      .send({ name: 'New Name' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Only admins can update organization')
  })

  it('returns 400 on invalid payload', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' } as any)

    const res = await request(server)
      .put('/api/organization')
      .set(authHeader({ role: 'ADMIN' }))
      .send({ name: '' })

    expect(res.status).toBe(400)
  })

  it('returns 500 on database error during update', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' } as any)
    prismaMock.organization.update.mockRejectedValueOnce(new Error('db down'))

    const res = await request(server)
      .put('/api/organization')
      .set(authHeader({ role: 'ADMIN' }))
      .send({ name: 'New Name' })

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Failed to update organization')
  })
})