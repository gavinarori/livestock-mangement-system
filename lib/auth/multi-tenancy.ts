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
    'breeding:read', 'breeding:create', 'breeding:update',
    'analytics:read',
    'members:read', 'members:manage',
    'organization:manage',
    'sharing:create'
  ],
  [UserRole.MANAGER]: [
    'animals:read', 'animals:create', 'animals:update',
    'health:read', 'health:create', 'health:update',
    'veterinary:read', 'veterinary:create', 'veterinary:update',
    'breeding:read', 'breeding:create', 'breeding:update',
    'analytics:read',
    'members:read',
    'sharing:create'
  ],
  [UserRole.VETERINARIAN]: [
    'animals:read',
    'health:read', 'health:create', 'health:update',
    'veterinary:read', 'veterinary:create', 'veterinary:update',
    'breeding:read',
    'analytics:read',
    'sharing:create'
  ],
  [UserRole.WORKER]: [
    'animals:read', 'animals:create', 'animals:update',
    'health:read', 'health:create',
    'breeding:read'
  ],
  [UserRole.VIEWER]: [
    'animals:read',
    'health:read',
    'breeding:read',
    'analytics:read'
  ]
}

export async function verifyUserInOrganization(
  userId: string,
  organizationId: string
) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      organizationId
    }
  })
  return !!user
}

export async function getUserPermissions(
  userId: string,
  organizationId: string
): Promise<Permission[]> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      organizationId
    }
  })

  if (!user) return []
  return ROLE_PERMISSIONS[user.role] || []
}

export async function hasPermission(
  userId: string,
  organizationId: string,
  permission: Permission
): Promise<boolean> {
  const permissions = await getUserPermissions(userId, organizationId)
  return permissions.includes(permission)
}

export async function getOrganization(slug: string) {
  return prisma.organization.findUnique({
    where: { slug }
  })
}

export async function getUserOrganizations(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      organization: true
    }
  })
}
