// app/(app)/layout.tsx — Layout for all authenticated app pages

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/sidebar'
import { verifyToken } from '@/lib/auth/utils'
import { getOrganization } from '@/lib/auth/multi-tenancy'
import type { UserRole } from '@/components/sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // 1. Read the token from the cookie (set it as 'token' on login)
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) {
    redirect('/login')
  }

  // 2. Verify the JWT and extract the session payload
  const session = verifyToken(token)
  if (!session || !session.organizationId) {
    redirect('/login')
  }

  // 3. Fetch the org so we can pass name/logo to the sidebar
  const org = await getOrganization(session.organizationId)
  if (!org) {
    redirect('/login')
  }

  return (
    <AppSidebar
      orgName={org.name}
      orgLogoUrl={org.logoUrl ?? null}
      userRole={(session.role as UserRole) ?? 'VIEWER'}
    >
      {children}
    </AppSidebar>
  )
}