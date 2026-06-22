import { prismaMock } from '../mocks/prisma'

/**
 * Queues prismaMock.user.findFirst resolves to satisfy withOrgAuth's internal
 * checks for a single request:
 *   1. verifyUserInOrganization(userId, organizationId) -> needs a truthy user
 *   2. hasPermission(...) -> needs the SAME user, with `role` set, so
 *      ROLE_PERMISSIONS[role] can be checked against the route's permission
 *      string (only called when withOrgAuth was given a permission argument)
 *
 * Call this BEFORE any handler-internal prismaMock.user.findFirst mocks for
 * the same test, since those are queued (and consumed) after these two.
 *
 * @param role - the role to attach to the mocked user record. Should match
 *   the `role` in the JWT (authHeader({ role })) for realistic scenarios,
 *   but can differ to simulate stale-DB-role edge cases.
 * @param opts.skipPermissionCheck - pass true for routes called via
 *   withOrgAuth() with NO permission argument (only 1 call happens, not 2).
 * @param opts.userId / opts.organizationId - only used for documentation/
 *   clarity; the mock doesn't actually inspect call args.
 */
export function mockOrgAuthSuccess(
  role: string = 'ADMIN',
  opts: { skipPermissionCheck?: boolean } = {}
) {
  const user = { id: 'user-1', organizationId: 'org-1', role }

  // Call 1: verifyUserInOrganization
  prismaMock.user.findFirst.mockResolvedValueOnce(user)

  // Call 2: getUserPermissions (inside hasPermission) — skip if the route's
  // withOrgAuth() call has no permission argument.
  if (!opts.skipPermissionCheck) {
    prismaMock.user.findFirst.mockResolvedValueOnce(user)
  }
}

/** Simulates the user not belonging to the organization -> 403 Forbidden. */
export function mockOrgAuthNotInOrg() {
  prismaMock.user.findFirst.mockResolvedValueOnce(null)
}

/**
 * Simulates the user being in the org but lacking the required permission
 * -> 403 "Insufficient permissions". Give it a role with no access to the
 * route's permission (e.g. 'VIEWER' for a breeding:manage-gated route).
 */
export function mockOrgAuthInsufficientPermission(role: string = 'VIEWER') {
  const user = { id: 'user-1', organizationId: 'org-1', role }
  prismaMock.user.findFirst.mockResolvedValueOnce(user) // verifyUserInOrganization
  prismaMock.user.findFirst.mockResolvedValueOnce(user) // getUserPermissions
}