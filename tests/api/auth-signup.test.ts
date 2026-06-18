
// Tests for: app/api/auth/signup/route.ts  (POST)
import request from 'supertest'
import { POST } from '@/app/api/auth/signup/route'
import { createNextTestServer } from '../utils/testServer'
import { prismaMock } from '../mocks/prisma'

const server = createNextTestServer([
  { method: 'POST', path: '/api/auth/signup', handler: POST, paramsMode: 'none' },
])

describe('POST /api/auth/signup', () => {
  it('creates an organization and an admin user', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null)
    prismaMock.organization.create.mockResolvedValueOnce({
      id: 'org-1',
      name: 'My Farm',
      slug: 'farmer-123',
    } as any)
    prismaMock.user.create.mockResolvedValueOnce({
      id: 'user-1',
      email: 'farmer@example.com',
      role: 'ADMIN',
      organizationId: 'org-1',
    } as any)

    const res = await request(server)
      .post('/api/auth/signup')
      .send({ email: 'farmer@example.com', password: 'hunter22', name: 'Farmer Joe' })

    expect(res.status).toBe(201)
    expect(res.body.message).toBe('User created successfully')
    expect(res.body.token).toBeTruthy()
    expect(res.body.user.email).toBe('farmer@example.com')
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'ADMIN', organizationId: 'org-1' }) })
    )
  })

  it('returns 400 when the email is already registered', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'existing' } as any)

    const res = await request(server)
      .post('/api/auth/signup')
      .send({ email: 'farmer@example.com', password: 'hunter22', name: 'Farmer Joe' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('User already exists')
    expect(prismaMock.organization.create).not.toHaveBeenCalled()
  })

  it('returns 400 for an invalid payload', async () => {
    const res = await request(server)
      .post('/api/auth/signup')
      .send({ email: 'not-an-email', password: '123' })

    expect(res.status).toBe(400)
  })
})
