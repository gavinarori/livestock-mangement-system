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
    })
    prismaMock.user.create.mockResolvedValueOnce({
      id: 'user-1',
      email: 'farmer@example.com',
      role: 'ADMIN',
      organizationId: 'org-1',
    })

    const res = await request(server)
      .post('/api/auth/signup')
      .send({ email: 'farmer@example.com', password: 'hunter22', name: 'Farmer Joe' })

    expect(res.status).toBe(201)
    expect(res.body.message).toBe('User created successfully')
    expect(res.body.token).toBeTruthy()
    expect(res.body.user.email).toBe('farmer@example.com')
    // The route passes role: UserRole.ADMIN and organizationId directly as
    // top-level data fields (not nested), matching prisma.user.create's call.
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'ADMIN', organizationId: 'org-1', email: 'farmer@example.com' }),
      })
    )
  })

  it('returns 400 when the email is already registered', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'existing' })

    const res = await request(server)
      .post('/api/auth/signup')
      .send({ email: 'farmer@example.com', password: 'hunter22', name: 'Farmer Joe' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('User already exists')
    expect(prismaMock.organization.create).not.toHaveBeenCalled()
  })

  it('returns 400 for an invalid payload (bad email, short password, missing name)', async () => {
    const res = await request(server)
      .post('/api/auth/signup')
      .send({ email: 'not-an-email', password: '123' })

    expect(res.status).toBe(400)
    // SignupSchema validates email first, so that's the message returned.
    expect(res.body.error).toBe('Invalid email address')
  })

  it('returns 400 when password is too short but email/name are valid', async () => {
    const res = await request(server)
      .post('/api/auth/signup')
      .send({ email: 'farmer@example.com', password: 'short', name: 'Farmer Joe' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Password must be at least 8 characters')
  })
})