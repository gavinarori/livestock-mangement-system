import jwt from 'jsonwebtoken'

// Must match the default fallback in lib/auth/utils.ts exactly, since tests
// don't set process.env.JWT_SECRET. If your project always sets JWT_SECRET
// via a .env file loaded in test setup, that real value will be used instead
// because process.env wins over the fallback on both sides.
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret'                  

export interface TestAuthOptions {
  userId?: string
  organizationId?: string
  role?: string
  email?: string
}

/**
 * Produces a real signed JWT understood by lib/auth/utils.ts's verifyToken
 * (jwt.verify(token, JWT_SECRET)). Use this to control which org/role/user
 * a request appears to come from.
 */
export function makeAuthToken(options: TestAuthOptions = {}): string {
  const payload = {
    userId: options.userId ?? 'user-1',
    organizationId: options.organizationId ?? 'org-1',
    role: options.role ?? 'ADMIN',
    email: options.email ?? 'test@example.com',
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function authHeader(options: TestAuthOptions = {}): { Authorization: string } {
  return { Authorization: `Bearer ${makeAuthToken(options)}` }
}