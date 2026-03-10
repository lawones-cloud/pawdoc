import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const signature = req.headers['x-signature'] as string
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!
  const payload = JSON.stringify(req.body)

  if (!signature || !verifySignature(payload, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const { meta, data } = req.body
  const eventName: string = meta?.event_name

  try {
    if (eventName === 'order_created') {
      const attrs = data?.attributes
      const userEmail = attrs?.user_email
      const { data: user } = await supabase.from('users').select('id').eq('email', userEmail).maybeSingle()
      if (user) {
        await supabase.from('subscriptions').upsert({
          user_id: user.id,
          lemonsqueezy_order_id: String(data.id),
          variant_id: String(attrs?.first_order_item?.variant_id),
          status: 'active',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'lemonsqueezy_order_id' })
      }
    }

    if (eventName === 'subscription_cancelled') {
      const subscriptionId = String(data.id)
      await supabase.from('subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('lemonsqueezy_subscription_id', subscriptionId)
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
