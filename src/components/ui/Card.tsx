import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
  glow?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ elevated, glow, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl p-6',
        elevated ? 'glass-elevated' : 'glass',
        glow && 'glow-primary',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
Card.displayName = 'Card'
