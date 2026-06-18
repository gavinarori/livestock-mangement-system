
// Mocks '@/lib/prisma'. Every Prisma model method exercised by the route
// handlers is stubbed with jest.fn(). In each test, import `prismaMock`
// and configure return values with mockResolvedValueOnce / mockRejectedValueOnce.
//
// Calls and queued return values are fully reset after every test (see the
// afterEach below), so tests stay isolated regardless of execution order.

function model() {
  return {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  }
}

export const prismaMock = {
  animal: model(),
  healthRecord: model(),
  breeding: model(),
  animalShare: model(),
  user: model(),
  organization: model(),
  heatCycle: model(),
  treatment: model(),
  diseaseOutbreak: model(),
}

// Default export consumed by route handlers as `import { prisma } from '@/lib/prisma'`.
export const prisma = prismaMock as any

afterEach(() => {
  Object.values(prismaMock).forEach((modelMock) => {
    Object.values(modelMock).forEach((fn: any) => fn.mockReset())
  })
})
