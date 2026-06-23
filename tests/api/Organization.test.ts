import request from 'supertest'
import { GET, PUT } from '@/app/api/organization/route'
import { createNextTestServer } from '../utils/testServer'
import { authHeader } from '../utils/authHelpers'
import { mockOrgAuthSuccess, mockOrgAuthInsufficientPermission } from '../utils/Orgauthhelpers'
import { prismaMock } from '../mocks/prisma'

const server = createNextTestServer([
  { method: 'GET', path: '/api/organization', handler: GET, paramsMode: 'none' },
  { method: 'PUT', path: '/api/organization', handler: PUT, paramsMode: 'none' },
])

describe('GET /api/organization', () => {
  it('returns the organization with member and animal counts', async () => {
    mockOrgAuthSuccess('ADMIN')
    prismaMock.organization.findUnique.mockResolvedValueOnce({
      id: 'org-1',
      name: 'Green Acres',
      _count: { members: 4, animals: 120 },
    })

    const res = await request(server).get('/api/organization').set(authHeader({ role: 'ADMIN' }))

    expect(res.status).toBe(200)
    expect(res.body.organization.memberCount).toBe(4)
    expect(res.body.organization.animalCount).toBe(120)
  })

  it('returns 404 when the organization does not exist', async () => {
    mockOrgAuthSuccess('ADMIN')
    prismaMock.organization.findUnique.mockResolvedValueOnce(null)

    const res = await request(server).get('/api/organization').set(authHeader({ role: 'ADMIN' }))

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Organization not found')
  })

  it('returns 401 when no auth token is provided', async () => {
    const res = await request(server).get('/api/organization')
    expect(res.status).toBe(401)
  })

  it('returns 403 when the JWT role lacks organization:manage permission', async () => {
    // VIEWER doesn't have 'organization:manage' in ROLE_PERMISSIONS
    mockOrgAuthInsufficientPermission('VIEWER')

    const res = await request(server).get('/api/organization').set(authHeader({ role: 'VIEWER' }))

    expect(res.status).toBe(403)
  })

  it('returns 500 on database error', async () => {
    mockOrgAuthSuccess('ADMIN')
    prismaMock.organization.findUnique.mockRejectedValueOnce(new Error('db down'))

    const res = await request(server).get('/api/organization').set(authHeader({ role: 'ADMIN' }))

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Failed to fetch organization')
  })
})

describe('PUT /api/organization', () => {
  it('updates the organization when the requester is an admin', async () => {
    mockOrgAuthSuccess('ADMIN')
    // 3rd call: the route's own internal admin re-check (role: UserRole.ADMIN filter)
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' })
    prismaMock.organization.update.mockResolvedValueOnce({ id: 'org-1', name: 'New Name' })

    const res = await request(server)
      .put('/api/organization')
      .set(authHeader({ role: 'ADMIN' }))
      .send({ name: 'New Name' })

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Organization updated successfully')
    expect(res.body.organization.name).toBe('New Name')
  })

  it('returns 403 when the JWT role passes withOrgAuth but the DB role is not ADMIN at the route-level check', async () => {
    // Give the JWT role 'MANAGER' — but ROLE_PERMISSIONS.MANAGER does NOT include
    // 'organization:manage', so withOrgAuth itself blocks this before the
    // handler's own admin-only re-check ever runs.
    mockOrgAuthInsufficientPermission('MANAGER')

    const res = await request(server)
      .put('/api/organization')
      .set(authHeader({ role: 'MANAGER' }))
      .send({ name: 'New Name' })

    expect(res.status).toBe(403)
  })

  it('returns 403 from the handler-level admin check when withOrgAuth passes but the DB user is not ADMIN', async () => {
    // This simulates a stale/forged JWT claiming ADMIN while the DB record
    // disagrees: withOrgAuth's two checks pass using the JWT's ADMIN claim,
    // but the route's own re-query (which filters on role: ADMIN) finds nothing.
    mockOrgAuthSuccess('ADMIN')
    prismaMock.user.findFirst.mockResolvedValueOnce(null)

    const res = await request(server)
      .put('/api/organization')
      .set(authHeader({ role: 'ADMIN' }))
      .send({ name: 'New Name' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Only admins can update organization')
  })

  it('returns 400 on invalid payload', async () => {
    mockOrgAuthSuccess('ADMIN')
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' })

    const res = await request(server)
      .put('/api/organization')
      .set(authHeader({ role: 'ADMIN' }))
      .send({ name: '' })

    expect(res.status).toBe(400)
  })

  it('returns 500 on database error during update', async () => {
    mockOrgAuthSuccess('ADMIN')
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' })
    prismaMock.organization.update.mockRejectedValueOnce(new Error('db down'))

    const res = await request(server)
      .put('/api/organization')
      .set(authHeader({ role: 'ADMIN' }))
      .send({ name: 'New Name' })

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Failed to update organization')
  })
})