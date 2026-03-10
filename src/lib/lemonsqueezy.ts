import { supabase } from './supabase'

export async function checkSubscription(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) return false
  return !!data
}

export function getCheckoutUrl(variantId: string, email: string): string {
  const storeId = import.meta.env.VITE_LEMONSQUEEZY_STORE_ID as string
  const base = `https://store.lemonsqueezy.com/checkout/buy/${variantId}`
  return `${base}?checkout[email]=${encodeURIComponent(email)}&store=${storeId}`
}
