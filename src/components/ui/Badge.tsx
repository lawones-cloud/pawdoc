import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'muted'
}

export function Badge({ variant = 'muted', className, children, ...props }: BadgeProps) {
  const variants = {
    primary: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    muted: 'bg-white/5 text-white/50 border-white/10',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', variants[variant], className)} {...props}>
      {children}
    </span>
  )
}
