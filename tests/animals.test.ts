// tests/api/animals.test.ts
import request from 'supertest'
import { createApp } from '../utils/app'
import { wrapNextHandler } from '../utils/adapter'
import { prismaMock } from '../utils/prismaMock'
import { makeToken, bearer } from '../utils/tokens'

jest.mock('@/lib/prisma', () => require('../utils/prismaMock').prismaModule)

import { GET, POST } from '@/app/api/animals/route'

const app = createApp()
app.get('/api/animals', wrapNextHandler(GET))
app.post('/api/animals', wrapNextHandler(POST))

describe('GET /api/animals', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await request(app).get('/api/animals')
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/unauthorized/i)
  })

  it('returns 401 with an invalid token', async () => {
    const res = await request(app).get('/api/animals').set('Authorization', bearer('not-a-real-jwt'))
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/invalid token/i)
  })

  it('returns the org-scoped animal list for a valid token', async () => {
    const token = makeToken({ organizationId: 'org_42' })
    const animals = [
      { id: 'a1', name: 'Bessie', type: 'CATTLE', organizationId: 'org_42' },
      { id: 'a2', name: 'Daisy', type: 'CATTLE', organizationId: 'org_42' },
    ]
    prismaMock.animal.findMany.mockResolvedValue(animals)

    const res = await request(app).get('/api/animals').set('Authorization', bearer(token))

    expect(res.status).toBe(200)
    expect(res.body.animals).toEqual(animals)
    expect(prismaMock.animal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org_42' }) })
    )
  })

  it('applies type/healthStatus/search filters from query params', async () => {
    const token = makeToken()
    prismaMock.animal.findMany.mockResolvedValue([])

    await request(app)
      .get('/api/animals?type=CATTLE&healthStatus=SICK&search=bes')
      .set('Authorization', bearer(token))

    expect(prismaMock.animal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'CATTLE',
          healthStatus: 'SICK',
          name: { contains: 'bes', mode: 'insensitive' },
        }),
      })
    )
  })

  it('returns 500 when the database call fails', async () => {
    const token = makeToken()
    prismaMock.animal.findMany.mockRejectedValue(new Error('db down'))

    const res = await request(app).get('/api/animals').set('Authorization', bearer(token))

    expect(res.status).toBe(500)
  })
})

describe('POST /api/animals', () => {
  const validPayload = {
    name: 'Bessie',
    type: 'CATTLE',
    gender: 'FEMALE',
    healthStatus: 'HEALTHY',
  }

  it('returns 401 with no Authorization header', async () => {
    const res = await request(app).post('/api/animals').send(validPayload)
    expect(res.status).toBe(401)
  })

  it('creates an animal and returns 201 for a valid request', async () => {
    const token = makeToken({ organizationId: 'org_42', userId: 'user_9' })
    const created = { id: 'a1', ...validPayload, organizationId: 'org_42' }
    prismaMock.animal.create.mockResolvedValue(created)

    const res = await request(app)
      .post('/api/animals')
      .set('Authorization', bearer(token))
      .send(validPayload)

    expect(res.status).toBe(201)
    expect(res.body.animal).toEqual(created)
    expect(prismaMock.animal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Bessie', organizationId: 'org_42' }),
      })
    )
  })

  it('returns 400 for an invalid payload (Zod validation failure)', async () => {
    const token = makeToken()

    const res = await request(app)
      .post('/api/animals')
      .set('Authorization', bearer(token))
      .send({ name: '' }) // missing required fields / empty name

    expect(res.status).toBe(400)
    expect(prismaMock.animal.create).not.toHaveBeenCalled()
  })

  it('returns 500 when animal creation fails unexpectedly', async () => {
    const token = makeToken()
    prismaMock.animal.create.mockRejectedValue(new Error('db down'))

    const res = await request(app)
      .post('/api/animals')
      .set('Authorization', bearer(token))
      .send(validPayload)

    expect(res.status).toBe(500)
  })
})