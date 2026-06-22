import request from 'supertest'
import { GET, PATCH, DELETE } from '@/app/api/breeding/records/[id]/route'
import { createNextTestServer } from '../utils/testServer'
import { authHeader } from '../utils/authHelpers'
import { mockOrgAuthSuccess, mockOrgAuthInsufficientPermission } from '../utils/Orgauthhelpers'
import { prismaMock } from '../mocks/prisma'

const server = createNextTestServer([
  { method: 'GET', path: '/api/breeding/records/:id', handler: GET, paramsMode: 'plain' },
  { method: 'PATCH', path: '/api/breeding/records/:id', handler: PATCH, paramsMode: 'plain' },
  { method: 'DELETE', path: '/api/breeding/records/:id', handler: DELETE, paramsMode: 'plain' },
])

describe('GET /api/breeding/records/:id', () => {
  it('returns the breeding record with dam/sire details', async () => {
    mockOrgAuthSuccess('ADMIN')
    prismaMock.breeding.findFirst.mockResolvedValueOnce({
      id: 'b1', dam: { id: 'd1', name: 'Bessie' }, sire: { id: 's1', name: 'Ferdinand' },
      createdBy: {}, updatedBy: null,
    })

    const res = await request(server).get('/api/breeding/records/b1').set(authHeader({ role: 'ADMIN' }))

    expect(res.status).toBe(200)
    expect(res.body.record.id).toBe('b1')
  })

  it('returns 404 when the record does not exist in the org', async () => {
    mockOrgAuthSuccess('ADMIN')
    prismaMock.breeding.findFirst.mockResolvedValueOnce(null)

    const res = await request(server).get('/api/breeding/records/missing').set(authHeader({ role: 'ADMIN' }))

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Breeding record not found.')
  })

  it('returns 500 on database error', async () => {
    mockOrgAuthSuccess('ADMIN')
    prismaMock.breeding.findFirst.mockRejectedValueOnce(new Error('db down'))

    const res = await request(server).get('/api/breeding/records/b1').set(authHeader({ role: 'ADMIN' }))

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Failed to fetch breeding record')
  })
})

describe('PATCH /api/breeding/records/:id', () => {
  it('updates an existing breeding record', async () => {
    mockOrgAuthSuccess('MANAGER')
    prismaMock.breeding.findFirst.mockResolvedValueOnce({ id: 'b1' })
    prismaMock.breeding.update.mockResolvedValueOnce({
      id: 'b1', outcome: 'SUCCESSFUL', dam: {}, sire: {}, createdBy: {}, updatedBy: {},
    })

    const res = await request(server)
      .patch('/api/breeding/records/b1')
      .set(authHeader({ role: 'MANAGER' }))
      .send({ outcome: 'SUCCESSFUL' })

    expect(res.status).toBe(200)
    expect(res.body.record.outcome).toBe('SUCCESSFUL')
    expect(prismaMock.breeding.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'b1' } })
    )
  })

  it('returns 403 when the JWT role lacks the breeding:manage permission', async () => {
    mockOrgAuthInsufficientPermission('VIEWER')

    const res = await request(server)
      .patch('/api/breeding/records/b1')
      .set(authHeader({ role: 'VIEWER' }))
      .send({ outcome: 'SUCCESSFUL' })

    expect(res.status).toBe(403)
  })

  it('returns 404 when the record to update does not exist', async () => {
    mockOrgAuthSuccess('ADMIN')
    prismaMock.breeding.findFirst.mockResolvedValueOnce(null)

    const res = await request(server)
      .patch('/api/breeding/records/missing')
      .set(authHeader({ role: 'ADMIN' }))
      .send({ outcome: 'SUCCESSFUL' })

    expect(res.status).toBe(404)
  })

  it('returns 400 on invalid update payload', async () => {
    mockOrgAuthSuccess('ADMIN')
    prismaMock.breeding.findFirst.mockResolvedValueOnce({ id: 'b1' })

    const res = await request(server)
      .patch('/api/breeding/records/b1')
      .set(authHeader({ role: 'ADMIN' }))
      .send({ offspringCount: -5 })

    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/breeding/records/:id', () => {
  it('deletes an existing breeding record', async () => {
    mockOrgAuthSuccess('ADMIN')
    prismaMock.breeding.findFirst.mockResolvedValueOnce({ id: 'b1' })
    prismaMock.breeding.delete.mockResolvedValueOnce({ id: 'b1' })

    const res = await request(server)
      .delete('/api/breeding/records/b1')
      .set(authHeader({ role: 'ADMIN' }))

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Breeding record deleted successfully.')
  })

  it('returns 403 when the JWT role lacks the breeding:manage permission', async () => {
    mockOrgAuthInsufficientPermission('VIEWER')

    const res = await request(server)
      .delete('/api/breeding/records/b1')
      .set(authHeader({ role: 'VIEWER' }))

    expect(res.status).toBe(403)
  })

  it('returns 404 when deleting a non-existent record', async () => {
    mockOrgAuthSuccess('ADMIN')
    prismaMock.breeding.findFirst.mockResolvedValueOnce(null)

    const res = await request(server)
      .delete('/api/breeding/records/missing')
      .set(authHeader({ role: 'ADMIN' }))

    expect(res.status).toBe(404)
  })
})