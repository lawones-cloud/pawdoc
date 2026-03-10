import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'

// BUILDER: Customise these 3 steps for each app
export interface OnboardingStep {
  title: string
  subtitle: string
  cta: string
  visual?: React.ReactNode
  content?: React.ReactNode
}

const DEFAULT_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome aboard',
    subtitle: 'You\'re about to experience something different. Let\'s get you set up in 60 seconds.',
    cta: 'Let\'s go →',
  },
  {
    title: 'Tell us about yourself',
    subtitle: 'This helps us personalise your experience from day one.',
    cta: 'Continue →',
  },
  {
    title: 'You\'re all set',
    subtitle: 'Your workspace is ready. Everything is configured and waiting for you.',
    cta: 'Enter dashboard →',
  },
]

interface OnboardingProps {
  steps?: OnboardingStep[]
}

export default function Onboarding({ steps = DEFAULT_STEPS }: OnboardingProps) {
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const isLast = current === steps.length - 1

  async function handleNext() {
    if (!isLast) { setCurrent(c => c + 1); return }
    setLoading(true)
    if (user) {
      await supabase.from('users').upsert({ id: user.id, email: user.email, onboarding_complete: true })
    }
    setLoading(false)
    navigate('/dashboard')
  }

  const step = steps[current]
  const progress = ((current + 1) / steps.length) * 100

  return (
    <div className="min-h-screen bg-mesh grid-pattern flex items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-1/3 left-1/4 h-96 w-96 rounded-full bg-violet-600/8 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-cyan-500/6 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-white/30 mb-2">
            <span>Step {current + 1} of {steps.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Step card */}
        <div className="glass-elevated rounded-3xl p-10 glow-primary">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step indicator dots */}
              <div className="flex gap-1.5 mb-8">
                {steps.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-violet-500' : i < current ? 'w-2 bg-violet-500/40' : 'w-2 bg-white/10'}`} />
                ))}
              </div>

              {step.visual && <div className="mb-8">{step.visual}</div>}

              <h2 className="text-2xl font-bold text-white mb-3">{step.title}</h2>
              <p className="text-white/40 leading-relaxed mb-8">{step.subtitle}</p>

              {step.content && <div className="mb-8">{step.content}</div>}

              <div className="flex gap-3">
                {current > 0 && (
                  <Button variant="ghost" onClick={() => setCurrent(c => c - 1)} className="rounded-xl">
                    ← Back
                  </Button>
                )}
                <Button onClick={handleNext} loading={loading} className="flex-1 rounded-xl" size="lg">
                  {step.cta}
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
