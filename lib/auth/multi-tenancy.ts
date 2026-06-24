import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export type Permission = 
  | 'animals:read'
  | 'animals:create'
  | 'animals:update'
  | 'animals:delete'
  | 'health:read'
  | 'health:create'
  | 'health:update'
  | 'veterinary:read'
  | 'veterinary:create'
  | 'veterinary:update'
  | 'breeding:read'
  | 'breeding:create'
  | 'breeding:update'
  | 'breeding:manage'
  | 'analytics:read'
  | 'members:read'
  | 'members:manage'
  | 'organization:manage'
  | 'sharing:create'

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    'animals:read', 'animals:create', 'animals:update', 'animals:delete',
    'health:read', 'health:create', 'health:update',
    'veterinary:read', 'veterinary:create', 'veterinary:update',
    'breeding:read', 'breeding:create', 'breeding:update', 'breeding:manage',
    'analytics:read',
    'members:read', 'members:manage',
    'organization:manage',
    'sharing:create',
  ],
  [UserRole.MANAGER]: [
    'animals:read', 'animals:create', 'animals:update',
    'health:read', 'health:create', 'health:update',
    'veterinary:read', 'veterinary:create', 'veterinary:update',
    'breeding:read', 'breeding:create', 'breeding:update', 'breeding:manage',
    'analytics:read',
    'members:read',
    'sharing:create',
  ],
  [UserRole.VETERINARIAN]: [
    'animals:read',
    'health:read', 'health:create', 'health:update',
    'veterinary:read', 'veterinary:create', 'veterinary:update',
    'breeding:read', 'breeding:manage',
    'analytics:read',
    'sharing:create',
  ],
  [UserRole.WORKER]: [
    'animals:read', 'animals:create', 'animals:update',
    'health:read', 'health:create',
    'breeding:read',
    'analytics:read',              
  ],
  [UserRole.VIEWER]: [
    'animals:read',
    'health:read',
    'breeding:read',
    'analytics:read',
  ],
}

export async function verifyUserInOrganization(userId: string, organizationId: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, organizationId } })
  return !!user
}

export async function getUserPermissions(userId: string, organizationId: string): Promise<Permission[]> {
  const user = await prisma.user.findFirst({ where: { id: userId, organizationId } })
  if (!user) return []
  return ROLE_PERMISSIONS[user.role] || []
}

export async function hasPermission(userId: string, organizationId: string, permission: Permission): Promise<boolean> {
  const permissions = await getUserPermissions(userId, organizationId)
  return permissions.includes(permission)
}

/** Look up an org by its URL slug (used in public/share routes) */
export async function getOrganization(slugOrId: string) {
  // Try slug first, fall back to id — works for both layout (id) and share routes (slug)
  return (
    (await prisma.organization.findUnique({ where: { slug: slugOrId } })) ??
    (await prisma.organization.findUnique({ where: { id: slugOrId } }))
  )
}

export async function getUserOrganizations(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { organization: true },
  })
}