
// Tests for: app/api/animals/route.ts  (GET, POST — manual verifyToken auth)
import request from 'supertest'
import { GET, POST } from '@/app/api/animals/route'
import { createNextTestServer } from '../utils/testServer'
import { authHeader } from '../utils/authHelpers'
import { prismaMock } from '../mocks/prisma'

const server = createNextTestServer([
  { method: 'GET', path: '/api/animals', handler: GET, paramsMode: 'none' },
  { method: 'POST', path: '/api/animals', handler: POST, paramsMode: 'none' },
])

describe('GET /api/animals', () => {
  it('lists animals scoped to the caller organization', async () => {
    prismaMock.animal.findMany.mockResolvedValueOnce([
      { id: 'a1', name: 'Bessie', organizationId: 'org-1' },
    ] as any)

    const res = await request(server).get('/api/animals').set(authHeader({ organizationId: 'org-1' }))

    expect(res.status).toBe(200)
    expect(res.body.animals).toHaveLength(1)
    expect(prismaMock.animal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-1' }) })
    )
  })

  it('applies type, healthStatus, and search filters from the query string', async () => {
    prismaMock.animal.findMany.mockResolvedValueOnce([])

    await request(server)
      .get('/api/animals?type=CATTLE&healthStatus=SICK&search=Bessie')
      .set(authHeader())

    expect(prismaMock.animal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'CATTLE',
          healthStatus: 'SICK',
          name: { contains: 'Bessie', mode: 'insensitive' },
        }),
      })
    )
  })

  it('returns 401 with no Authorization header', async () => {
    const res = await request(server).get('/api/animals')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Unauthorized')
  })

  it('returns 401 with an invalid token', async () => {
    const res = await request(server).get('/api/animals').set('Authorization', 'Bearer invalid-token')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Invalid token')
  })
})

describe('POST /api/animals', () => {
  it('creates an animal and links it to the caller organization', async () => {
    prismaMock.animal.create.mockResolvedValueOnce({
      id: 'a1',
      name: 'Bessie',
      type: 'CATTLE',
      organizationId: 'org-1',
    } as any)

    const res = await request(server)
      .post('/api/animals')
      .set(authHeader({ organizationId: 'org-1' }))
      .send({ name: 'Bessie', type: 'CATTLE' })

    expect(res.status).toBe(201)
    expect(res.body.message).toBe('Animal created successfully')
    expect(prismaMock.animal.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Bessie', organizationId: 'org-1' }) })
    )
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await request(server).post('/api/animals').set(authHeader()).send({})

    expect(res.status).toBe(400)
    expect(res.body.error).toBeTruthy()
    expect(prismaMock.animal.create).not.toHaveBeenCalled()
  })

  it('returns 401 without a token', async () => {
    const res = await request(server).post('/api/animals').send({ name: 'X', type: 'CATTLE' })
    expect(res.status).toBe(401)
  })
})


