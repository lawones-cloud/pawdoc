import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export function CustomerPortalLink() {
  const { user } = useAuth()
  const [hasActive, setHasActive] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('subscriptions').select('status').eq('user_id', user.id).eq('status', 'active').maybeSingle()
      .then(({ data }) => setHasActive(!!data))
  }, [user])

  if (!hasActive) return null

  return (
    <a href="https://app.lemonsqueezy.com/billing" target="_blank" rel="noopener noreferrer"
      className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
      Manage subscription
    </a>
  )
}
