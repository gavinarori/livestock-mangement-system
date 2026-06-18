
export interface TestAuthOptions {
  userId?: string
  organizationId?: string
  role?: string
  email?: string
}

/**
 * Produces a Bearer token understood by the mocked verifyToken /
 * withOrgAuth implementations (test/mocks/authUtils.ts,
 * test/mocks/authMiddleware.ts) — just base64(JSON), nothing more.
 * Use this to control which org/role/user a request appears to come from.
 */
export function makeAuthToken(options: TestAuthOptions = {}): string {
  const payload = {
    userId: options.userId ?? 'user-1',
    organizationId: options.organizationId ?? 'org-1',
    role: options.role ?? 'ADMIN',
    email: options.email ?? 'test@example.com',
  }
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

export function authHeader(options: TestAuthOptions = {}): { Authorization: string } {
  return { Authorization: `Bearer ${makeAuthToken(options)}` }
}
