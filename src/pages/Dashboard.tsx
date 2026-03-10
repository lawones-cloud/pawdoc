import { motion } from 'framer-motion'
import { DashboardShell, NavItem } from '@/components/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CheckoutButton } from '@/components/CheckoutButton'
import { useAuth } from '@/contexts/AuthContext'

// BUILDER: Replace these nav items and content with app-specific features
const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: <span>◈</span> },
  { label: 'Features', href: '/dashboard/features', icon: <span>◇</span> },
  { label: 'Settings', href: '/dashboard/settings', icon: <span>◉</span> },
]

const STATS = [
  { label: 'Actions today', value: '0', trend: '+0%' },
  { label: 'Saved this week', value: '0h', trend: 'vs last week' },
  { label: 'AI credits used', value: '0', trend: 'of 100 free' },
]

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <DashboardShell navItems={NAV_ITEMS}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-bold text-white">
            Good day{user?.email ? `, ${user.email.split('@')[0]}` : ''} 👋
          </h1>
          <p className="text-white/40 mt-1 text-sm">Here's what's happening today.</p>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATS.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="space-y-2">
                <p className="text-xs text-white/40 font-medium uppercase tracking-wide">{stat.label}</p>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <Badge variant="muted">{stat.trend}</Badge>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main content placeholder — Builder replaces this */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card elevated className="text-center py-16 space-y-4">
            <div className="text-5xl">◈</div>
            <h3 className="text-lg font-semibold text-white">Your features go here</h3>
            <p className="text-sm text-white/40 max-w-xs mx-auto">
              This is the main dashboard area. The Builder agent will replace this with app-specific features from the PRD.
            </p>
          </Card>
        </motion.div>

        {/* Upgrade CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <Card className="flex flex-col sm:flex-row items-center gap-4 sm:justify-between bg-gradient-to-r from-violet-500/5 to-cyan-500/5 border-violet-500/10">
            <div>
              <h4 className="font-semibold text-white text-sm">Unlock full access</h4>
              <p className="text-xs text-white/40 mt-0.5">Get unlimited AI features and premium support.</p>
            </div>
            <CheckoutButton label="Upgrade to Pro →" />
          </Card>
        </motion.div>
      </div>
    </DashboardShell>
  )
}
