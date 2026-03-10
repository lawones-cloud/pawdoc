import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

export interface NavItem {
  label: string
  href: string
  icon: ReactNode
}

interface DashboardShellProps {
  children: ReactNode
  navItems: NavItem[]
  appName?: string
  logo?: ReactNode
}

export function DashboardShell({ children, navItems, appName = import.meta.env.VITE_APP_NAME || 'App', logo }: DashboardShellProps) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const NavContent = () => (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map((item) => {
        const active = location.pathname === item.href
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
              active
                ? 'text-white'
                : 'text-white/40 hover:text-white/80'
            )}
          >
            {active && (
              <motion.div
                layoutId="nav-active"
                className="absolute inset-0 rounded-xl bg-violet-500/10 border border-violet-500/20"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className={cn('relative z-10 transition-colors', active ? 'text-violet-400' : 'text-white/30 group-hover:text-white/60')}>
              {item.icon}
            </span>
            <span className="relative z-10">{item.label}</span>
            {active && (
              <span className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-violet-400 pulse-dot" />
            )}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="flex h-screen bg-mesh overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-64 flex-col glass border-r border-white/5">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
          {logo ? (
            <>{logo}</>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500">
              <span className="text-xs font-bold text-white">{appName.charAt(0)}</span>
            </div>
          )}
          <span className="font-semibold text-white">{appName}</span>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <NavContent />
        </div>

        {/* User footer */}
        <div className="border-t border-white/5 p-4">
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-white/50 truncate mb-2">{user?.email}</p>
            <button
              onClick={signOut}
              className="btn-ghost w-full rounded-lg px-3 py-1.5 text-xs text-white/40 hover:text-white/70"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col glass border-r border-white/5 lg:hidden"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                <span className="font-semibold text-white">{appName}</span>
                <button onClick={() => setMobileOpen(false)} className="text-white/40 hover:text-white">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto py-4"><NavContent /></div>
              <div className="border-t border-white/5 p-4">
                <p className="text-xs text-white/40 truncate mb-2">{user?.email}</p>
                <button onClick={signOut} className="btn-ghost w-full rounded-lg px-3 py-1.5 text-xs text-white/40">Sign out</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="flex items-center gap-4 px-4 py-3 border-b border-white/5 glass lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="btn-ghost rounded-lg p-2 text-white/60">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-white">{appName}</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-6 lg:p-8"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
