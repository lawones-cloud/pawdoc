import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-xl glass px-4 py-3 text-sm text-white placeholder-white/30',
        'border border-white/10 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20',
        'outline-none transition-all duration-200',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'
