// Tests for: app/api/organization/members/route.ts  (GET, POST)
import request from 'supertest'
import { GET, POST } from '@/app/api/organization/members/route'
import { createNextTestServer } from '../utils/testServer'
import { authHeader } from '../utils/authHelpers'
import { prismaMock } from '../mocks/prisma'

// hashPassword is mocked so tests don't depend on real bcrypt/argon hashing.
jest.mock('@/lib/auth/utils', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-temp-password'),
}))

const server = createNextTestServer([
  { method: 'GET', path: '/api/organization/members', handler: GET, paramsMode: 'none' },
  { method: 'POST', path: '/api/organization/members', handler: POST, paramsMode: 'none' },
])

describe('GET /api/organization/members', () => {
  it('returns the list of members for the org', async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([
      { id: 'u1', email: 'a@example.com', name: 'Alice', role: 'ADMIN', isActive: true, createdAt: new Date() },
    ] as any)

    const res = await request(server).get('/api/organization/members').set(authHeader())

    expect(res.status).toBe(200)
    expect(res.body.members).toHaveLength(1)
    expect(res.body.members[0].email).toBe('a@example.com')
  })

  it('returns 401 when no auth token is provided', async () => {
    const res = await request(server).get('/api/organization/members')
    expect(res.status).toBe(401)
  })

  it('returns 500 on database error', async () => {
    prismaMock.user.findMany.mockRejectedValueOnce(new Error('db down'))

    const res = await request(server).get('/api/organization/members').set(authHeader())

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Failed to fetch members')
  })
})

describe('POST /api/organization/members', () => {
  const validBody = { email: 'new@example.com', name: 'New Person', role: 'MANAGER' }

  it('adds a new member when the requester is an admin and under the member limit', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' } as any) // perms check
    prismaMock.user.findUnique.mockResolvedValueOnce(null) // no existing user with that email
    prismaMock.organization.findUnique.mockResolvedValueOnce({ id: 'org-1', maxMembers: 10 } as any)
    prismaMock.user.count.mockResolvedValueOnce(3)
    prismaMock.user.create.mockResolvedValueOnce({
      id: 'u2', email: 'new@example.com', name: 'New Person', role: 'MANAGER', isActive: true,
    } as any)

    const res = await request(server)
      .post('/api/organization/members')
      .set(authHeader({ role: 'ADMIN' }))
      .send(validBody)

    expect(res.status).toBe(201)
    expect(res.body.message).toBe('Member added successfully')
    expect(res.body.member.email).toBe('new@example.com')
    expect(res.body.tempPassword).toBe('2026')
  })

  it('returns 403 when the requester is not an admin', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null)

    const res = await request(server)
      .post('/api/organization/members')
      .set(authHeader({ role: 'MANAGER' }))
      .send(validBody)

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Only admins can add members')
  })

  it('returns 400 when a user with that email already exists', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' } as any)
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'existing-user' } as any)

    const res = await request(server)
      .post('/api/organization/members')
      .set(authHeader({ role: 'ADMIN' }))
      .send(validBody)

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('User already exists')
  })

  it('returns 404 when the organization is not found', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' } as any)
    prismaMock.user.findUnique.mockResolvedValueOnce(null)
    prismaMock.organization.findUnique.mockResolvedValueOnce(null)

    const res = await request(server)
      .post('/api/organization/members')
      .set(authHeader({ role: 'ADMIN' }))
      .send(validBody)

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Organization not found')
  })

  it('returns 400 when the member limit has been reached', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' } as any)
    prismaMock.user.findUnique.mockResolvedValueOnce(null)
    prismaMock.organization.findUnique.mockResolvedValueOnce({ id: 'org-1', maxMembers: 5 } as any)
    prismaMock.user.count.mockResolvedValueOnce(5)

    const res = await request(server)
      .post('/api/organization/members')
      .set(authHeader({ role: 'ADMIN' }))
      .send(validBody)

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Member limit reached (5)')
  })

  it('returns 400 on invalid payload', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 'user-1', role: 'ADMIN' } as any)

    const res = await request(server)
      .post('/api/organization/members')
      .set(authHeader({ role: 'ADMIN' }))
      .send({ email: 'not-an-email', name: '', role: 'MANAGER' })

    expect(res.status).toBe(400)
  })
})