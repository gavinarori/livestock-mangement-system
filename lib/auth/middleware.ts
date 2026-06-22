import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './utils'
import { verifyUserInOrganization, hasPermission, Permission } from './multi-tenancy'

export interface AuthContext {
  userId: string
  email: string
  organizationId: string
  role: string
}

export function withAuth(handler: (req: NextRequest, context: any, auth: AuthContext) => Promise<Response>) {
  return async (req: NextRequest, context: any) => {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const auth: AuthContext = {
      userId: payload.userId,
      email: payload.email,
      organizationId: payload.organizationId,
      role: payload.role,
    }

    return handler(req, context, auth)
  }
}

export function withOrgAuth(permission?: Permission) {
  return (handler: (req: NextRequest, context: any, auth: AuthContext) => Promise<Response>) => {
    return async (req: NextRequest, context: any) => {
      const authHeader = req.headers.get('authorization')
      const token = authHeader?.replace('Bearer ', '')

      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const payload = verifyToken(token)
      if (!payload) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }

      // Verify user is in organization
      const inOrg = await verifyUserInOrganization(payload.userId, payload.organizationId)
      if (!inOrg) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Check permission if required
      if (permission) {
        const hasPerms = await hasPermission(payload.userId, payload.organizationId, permission)
        if (!hasPerms) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }
      }

      const auth: AuthContext = {
        userId: payload.userId,
        email: payload.email,
        organizationId: payload.organizationId,
        role: payload.role,
      }

      return handler(req, context, auth)
    }
  }
}