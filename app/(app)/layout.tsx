// app/(app)/layout.tsx  — Layout for all authenticated app pages
// Place this file at: app/(app)/layout.tsx
// Move your dashboard, animals, breeding, health, inventory, settings, analytics pages
// into the app/(app)/ folder so they get the sidebar automatically.
// Auth pages (login, signup) and share/[token] stay outside this group.

import { AppSidebar } from '@/components/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppSidebar>{children}</AppSidebar>
}