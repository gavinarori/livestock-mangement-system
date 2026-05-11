'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Beef, BarChart3, Settings, ChevronLeft,
  ChevronRight, Leaf, Bell, Search, Moon, Sun, LogOut,
  Activity, Users, Menu, X
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
  { href: '/animals', label: 'Animals', icon: Beef, badge: null },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, badge: null },
  { href: '/settings', label: 'Settings', icon: Settings, badge: null },
  { href: '/healthy', label: 'Healthy', icon: Leaf, badge: null },
]

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const SidebarContent = () => (
    <aside
      aria-label="Main navigation"
      className={`
        flex flex-col h-full bg-sidebar border-r border-sidebar-border
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-sidebar-border ${collapsed ? 'justify-center' : ''}`}>
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Leaf className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
          </div>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-sidebar animate-pulse" aria-hidden="true" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm text-sidebar-foreground leading-tight tracking-tight">HerdWise</p>
            <p className="text-[10px] text-sidebar-foreground/50 tracking-widest uppercase">Enterprise</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1" aria-label="Primary navigation">
        {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 relative overflow-hidden
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring
                ${active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              {active && (
                <span className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" aria-hidden="true" />
              )}
              <Icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-sidebar-primary-foreground' : ''}`} aria-hidden="true" />
              {!collapsed && (
                <span className="truncate">{label}</span>
              )}
              {!collapsed && badge && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
              )}
              {collapsed && (
                <span className="sr-only">{label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom tools */}
      <div className={`px-2 py-4 border-t border-sidebar-border space-y-1`}>
        <button
          onClick={() => setDark(d => !d)}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
        >
          {dark ? <Sun className="w-4 h-4 flex-shrink-0" aria-hidden="true" /> : <Moon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
          {!collapsed && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <Link
          href="/login"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {!collapsed && <span>Sign Out</span>}
          {collapsed && <span className="sr-only">Sign Out</span>}
        </Link>
      </div>

      {/* Collapse toggle — desktop only */}
      <button
        onClick={() => setCollapsed(c => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-sidebar border border-sidebar-border rounded-full items-center justify-center shadow-sm hover:bg-sidebar-accent transition-colors z-10"
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3 text-sidebar-foreground/70" aria-hidden="true" />
          : <ChevronLeft className="w-3 h-3 text-sidebar-foreground/70" aria-hidden="true" />
        }
      </button>
    </aside>
  )

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:block relative flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-64 h-full">
            <SidebarContent />
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-sidebar-accent"
            >
              <X className="w-4 h-4 text-sidebar-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center gap-4 px-4 md:px-6 py-3 bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-30"
          role="banner"
        >
          <button
            className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <label htmlFor="global-search" className="sr-only">Search animals, records, reports</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
              <input
                id="global-search"
                type="search"
                placeholder="Search animals, records…"
                className="w-full pl-9 pr-4 py-2 text-sm bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-all placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Live status indicator */}
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-full border border-emerald-200 dark:border-emerald-800" role="status" aria-label="System online">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" aria-hidden="true" />
              Live
            </span>

            {/* Notifications */}
            <button
              aria-label="Notifications (3 unread)"
              className="relative p-2 rounded-xl hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Bell className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" aria-hidden="true" />
            </button>

            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors"
              role="img"
              aria-label="User profile"
            >
              <span className="text-xs font-bold text-primary">FM</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
          tabIndex={-1}
        >
          {/* Skip link target */}
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg">
            Skip to main content
          </a>
          {children}
        </main>
      </div>
    </div>
  )
}