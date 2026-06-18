
// Tests for: app/api/animals/[id]/route.ts  (GET, PUT, DELETE)
import request from 'supertest'
import { GET, PUT, DELETE } from '@/app/api/animals/[id]/route'
import { createNextTestServer } from '../utils/testServer'
import { authHeader } from '../utils/authHelpers'
import { prismaMock } from '../mocks/prisma'

const server = createNextTestServer([
  { method: 'GET', path: '/api/animals/:id', handler: GET, paramsMode: 'promise' },
  { method: 'PUT', path: '/api/animals/:id', handler: PUT, paramsMode: 'promise' },
  { method: 'DELETE', path: '/api/animals/:id', handler: DELETE, paramsMode: 'promise' },
])

describe('GET /api/animals/:id', () => {
  it('returns the animal when it belongs to the caller organization', async () => {
    prismaMock.animal.findFirst.mockResolvedValueOnce({ id: 'a1', name: 'Bessie' } as any)

    const res = await request(server).get('/api/animals/a1').set(authHeader())

    expect(res.status).toBe(200)
    expect(res.body.animal.id).toBe('a1')
  })

  it('returns 404 when the animal does not exist in the org', async () => {
    prismaMock.animal.findFirst.mockResolvedValueOnce(null)

    const res = await request(server).get('/api/animals/missing').set(authHeader())

    expect(res.status).toBe(404)
  })

  it('returns 401 without a token', async () => {
    const res = await request(server).get('/api/animals/a1')
    expect(res.status).toBe(401)
  })
})

describe('PUT /api/animals/:id', () => {
  it('updates an existing animal', async () => {
    prismaMock.animal.findFirst.mockResolvedValueOnce({ id: 'a1' } as any)
    prismaMock.animal.update.mockResolvedValueOnce({ id: 'a1', name: 'Bessie II' } as any)

    const res = await request(server).put('/api/animals/a1').set(authHeader()).send({ name: 'Bessie II' })

    expect(res.status).toBe(200)
    expect(res.body.animal.name).toBe('Bessie II')
  })

  it('returns 404 when updating an animal outside the org', async () => {
    prismaMock.animal.findFirst.mockResolvedValueOnce(null)

    const res = await request(server)
      .put('/api/animals/other-org-animal')
      .set(authHeader())
      .send({ name: 'X' })

    expect(res.status).toBe(404)
    expect(prismaMock.animal.update).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/animals/:id', () => {
  it('deletes an animal that belongs to the org', async () => {
    prismaMock.animal.findFirst.mockResolvedValueOnce({ id: 'a1' } as any)
    prismaMock.animal.delete.mockResolvedValueOnce({ id: 'a1' } as any)

    const res = await request(server).delete('/api/animals/a1').set(authHeader())

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Animal deleted successfully')
  })

  it('returns 404 when deleting an animal outside the org', async () => {
    prismaMock.animal.findFirst.mockResolvedValueOnce(null)

    const res = await request(server).delete('/api/animals/nope').set(authHeader())

    expect(res.status).toBe(404)
    expect(prismaMock.animal.delete).not.toHaveBeenCalled()
  })
})
