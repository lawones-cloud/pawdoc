import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Link } from 'react-router-dom'

const appName = import.meta.env.VITE_APP_NAME || 'App'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError(null)
    const { error } = await signIn(email)
    setLoading(false)
    if (error) { setError(error); return }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-mesh grid-pattern flex items-center justify-center px-4">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-cyan-500/8 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30 mb-4">
            <span className="text-lg font-bold text-white">{appName.charAt(0)}</span>
          </div>
          <h1 className="text-xl font-semibold text-white">{appName}</h1>
          <p className="text-sm text-white/40 mt-1">Sign in to continue</p>
        </div>

        <div className="glass-elevated rounded-3xl p-8">
          {sent ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
              <div className="text-4xl mb-4">✉️</div>
              <h2 className="font-semibold text-white mb-2">Check your email</h2>
              <p className="text-sm text-white/40">We sent a magic link to <span className="text-violet-400">{email}</span></p>
              <button onClick={() => setSent(false)} className="mt-6 text-xs text-white/30 hover:text-white/60 transition-colors">
                Use a different email
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-2">Email address</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </motion.p>
              )}

              <Button type="submit" loading={loading} size="lg" className="w-full rounded-xl mt-2">
                {loading ? 'Sending link…' : 'Send magic link →'}
              </Button>

              <p className="text-center text-xs text-white/25">
                No password needed. Just click the link we send you.
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          <Link to="/" className="hover:text-white/40 transition-colors">← Back to home</Link>
        </p>
      </motion.div>
    </div>
  )
}
