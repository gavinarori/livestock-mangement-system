
// Tests for: app/api/animals/[id]/shares/route.ts  (POST, GET)
import request from 'supertest'
import { POST, GET } from '@/app/api/animals/[id]/share/route'
import { createNextTestServer } from '../utils/testServer'
import { authHeader } from '../utils/authHelpers'
import { prismaMock } from '../mocks/prisma'

const server = createNextTestServer([
  { method: 'POST', path: '/api/animals/:id/shares', handler: POST, paramsMode: 'promise' },
  { method: 'GET', path: '/api/animals/:id/shares', handler: GET, paramsMode: 'promise' },
])

describe('POST /api/animals/:id/shares', () => {
  it('creates a share link for an animal in the org', async () => {
    prismaMock.animal.findFirst.mockResolvedValueOnce({ id: 'a1' } as any)
    prismaMock.animalShare.create.mockResolvedValueOnce({
      id: 's1',
      token: 'abc',
      creator: { name: 'Test User', email: 'test@example.com' },
    } as any)

    const res = await request(server)
      .post('/api/animals/a1/shares')
      .set(authHeader())
      .send({ shareType: 'PUBLIC', expiresInDays: 7 })

    expect(res.status).toBe(201)
    expect(res.body.share.id).toBe('s1')
  })

  it('hashes the share password when one is provided', async () => {
    prismaMock.animal.findFirst.mockResolvedValueOnce({ id: 'a1' } as any)
    prismaMock.animalShare.create.mockResolvedValueOnce({ id: 's1' } as any)

    await request(server).post('/api/animals/a1/shares').set(authHeader()).send({ password: 'secret123' })

    expect(prismaMock.animalShare.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ passwordHash: expect.stringMatching(/^\$2[aby]\$/) }),
      })
    )
  })

  it('returns 404 when the animal is not found in the org', async () => {
    prismaMock.animal.findFirst.mockResolvedValueOnce(null)

    const res = await request(server).post('/api/animals/missing/shares').set(authHeader()).send({})

    expect(res.status).toBe(404)
    expect(prismaMock.animalShare.create).not.toHaveBeenCalled()
  })

  it('returns 401 without a token', async () => {
    const res = await request(server).post('/api/animals/a1/shares').send({})
    expect(res.status).toBe(401)
  })
})

describe('GET /api/animals/:id/shares', () => {
  it('lists shares for an animal in the org', async () => {
    prismaMock.animal.findFirst.mockResolvedValueOnce({ id: 'a1' } as any)
    prismaMock.animalShare.findMany.mockResolvedValueOnce([{ id: 's1' }] as any)

    const res = await request(server).get('/api/animals/a1/shares').set(authHeader())

    expect(res.status).toBe(200)
    expect(res.body.shares).toHaveLength(1)
  })

  it('returns 404 for an animal outside the org', async () => {
    prismaMock.animal.findFirst.mockResolvedValueOnce(null)

    const res = await request(server).get('/api/animals/nope/shares').set(authHeader())

    expect(res.status).toBe(404)
  })
})
