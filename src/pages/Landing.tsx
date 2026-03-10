import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const appName = import.meta.env.VITE_APP_NAME || 'AppName'
const tagline = import.meta.env.VITE_APP_TAGLINE || 'The smartest tool for your workflow'

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.5 },
  }
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-mesh grid-pattern overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-violet-500/6 blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <motion.div {...fadeUp(0)} className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <span className="text-xs font-bold text-white">{appName.charAt(0)}</span>
          </div>
          <span className="font-semibold text-white">{appName}</span>
        </motion.div>
        <motion.div {...fadeUp(0.2)} className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost rounded-xl px-4 py-2 text-sm text-white/60 hover:text-white">Sign in</Link>
          <Link to="/login" className="btn-primary rounded-xl px-4 py-2 text-sm text-white">Get started →</Link>
        </motion.div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 mx-auto max-w-4xl px-8 pt-24 pb-32 text-center">
        <motion.div {...fadeUp(0)}>
          <span className="inline-flex items-center gap-2 rounded-full glass border border-violet-500/20 px-4 py-1.5 text-xs text-violet-400 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 pulse-dot" />
            Now available
          </span>
        </motion.div>

        <motion.h1 {...fadeUp(0.1)} className="text-5xl sm:text-7xl font-bold tracking-tight text-white leading-[1.05] mb-6">
          {tagline.split(' ').slice(0, 3).join(' ')}{' '}
          <span className="text-gradient">{tagline.split(' ').slice(3).join(' ') || 'smarter'}</span>
        </motion.h1>

        <motion.p {...fadeUp(0.2)} className="text-lg text-white/40 max-w-xl mx-auto mb-10 leading-relaxed">
          Designed for teams who move fast. Powered by AI. Built for Africa.
        </motion.p>

        <motion.div {...fadeUp(0.3)} className="flex items-center justify-center gap-4">
          <Link to="/login" className="btn-primary rounded-2xl px-8 py-4 text-base font-semibold text-white">
            Start for free
          </Link>
          <button className="btn-ghost rounded-2xl px-6 py-4 text-sm text-white/50">
            See how it works ↓
          </button>
        </motion.div>

        {/* Stats row */}
        <motion.div {...fadeUp(0.5)} className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
          {[['10x', 'Faster workflow'], ['99%', 'Uptime SLA'], ['24/7', 'AI support']].map(([stat, label]) => (
            <div key={stat} className="glass rounded-2xl p-4">
              <div className="text-2xl font-bold text-gradient">{stat}</div>
              <div className="text-xs text-white/40 mt-1">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Feature grid */}
      <div className="relative z-10 mx-auto max-w-5xl px-8 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'AI-Powered', desc: 'Intelligent automation that learns your workflow and saves hours every week.', icon: '✦', delay: 0 },
            { title: 'Instant Setup', desc: 'From signup to running in under 3 minutes. No engineering degree required.', icon: '⚡', delay: 0.1 },
            { title: 'Built for Africa', desc: 'Priced for African markets. Works on slow connections. Supports local payments.', icon: '🌍', delay: 0.2 },
          ].map((f) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: f.delay, duration: 0.4 }}
              className="glass-elevated rounded-2xl p-6 hover:glow-primary transition-all duration-500 group cursor-default"
            >
              <div className="text-2xl mb-4 text-violet-400 group-hover:scale-110 transition-transform duration-300">{f.icon}</div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="relative z-10 mx-auto max-w-2xl px-8 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="glass-elevated rounded-3xl p-12 glow-primary"
        >
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-white/40 mb-8">Join thousands of users already saving time with {appName}.</p>
          <Link to="/login" className="btn-primary rounded-2xl px-8 py-4 text-base font-semibold text-white inline-block">
            Create free account →
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
