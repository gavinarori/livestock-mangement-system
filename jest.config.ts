/** @type {import('jest').Config} */
module.exports = {
  // API route tests run against a real http.Server via supertest and exercise
  // Next.js route handlers (NextRequest/Response), so they need Node's
  // built-in globals (TextEncoder, fetch, etc.) rather than jsdom's.
  testEnvironment: 'node',

  moduleNameMapper: {
    // Route handlers import the real '@/lib/prisma'; tests need the mock
    // instead, so this redirects every import — no per-file jest.mock() needed.
    // MUST come before the general '@/(.*)' pattern below.
    '^@/lib/prisma$': '<rootDir>/tests/mocks/prisma.ts',

    // Maps the "@/" import alias (used throughout app/ and lib/) to the
    // project root, mirroring the "paths" config in tsconfig.json.
    '^@/(.*)$': '<rootDir>/$1',
  },

  testMatch: [
    '**/__tests__/**/*.?([mc])[jt]s?(x)',
    '**/?(*.)+(spec|test).?([mc])[jt]s?(x)',
  ],

  testPathIgnorePatterns: ['/node_modules/'],

  clearMocks: true,
}