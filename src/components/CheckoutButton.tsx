import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getCheckoutUrl } from '@/lib/lemonsqueezy'
import { Button } from '@/components/ui/Button'

interface CheckoutButtonProps {
  variantId?: string
  label?: string
  className?: string
}

export function CheckoutButton({ variantId, label = 'Upgrade to Pro', className = '' }: CheckoutButtonProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const vid = variantId || (import.meta.env.VITE_LEMONSQUEEZY_VARIANT_ID as string)

  function handleClick() {
    if (!user?.email || !vid) return
    setLoading(true)
    window.location.href = getCheckoutUrl(vid, user.email)
  }

  return (
    <Button onClick={handleClick} loading={loading} disabled={!user} className={`rounded-xl ${className}`} size="sm">
      {label}
    </Button>
  )
}
