// api/webhook.js
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Disable body parsing so we can verify signature on raw body
export const config = { api: { bodyParser: false } }

const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
if (!STRIPE_SECRET_KEY) throw new Error('Missing STRIPE_SECRET_KEY')
if (!STRIPE_WEBHOOK_SECRET) throw new Error('Missing STRIPE_WEBHOOK_SECRET')
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing Supabase env')

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function readBuffer(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let event
  try {
    const buf = await readBuffer(req)
    const sig = req.headers['stripe-signature']
    event = stripe.webhooks.constructEvent(buf, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed', err?.message)
    return res.status(400).send(`Webhook Error: ${err?.message}`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const full = await stripe.checkout.sessions.retrieve(session.id, { expand: ['subscription', 'customer'] })
        const sub = full.subscription
        const customer = full.customer
        const userId = (customer?.metadata && customer.metadata.user_id) || full.client_reference_id
        const planKey = (sub?.metadata && sub.metadata.plan_key) || 'pro'
        if (userId && sub?.id) {
          await upsertSubscription({ userId, subscription: sub, customerId: customer.id, planKey })
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const customer = await stripe.customers.retrieve(sub.customer)
        const userId = customer?.metadata?.user_id
        const planKey = sub?.metadata?.plan_key || 'pro'
        if (userId) {
          await upsertSubscription({ userId, subscription: sub, customerId: customer.id, planKey })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        await supabase.from('subscriptions')
          .update({ status: 'canceled', cancel_at_period_end: false })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object
        if (inv.subscription) {
          await supabase.from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', inv.subscription)
        }
        break
      }

      default:
        // no-op
        break
    }

    return res.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error', err)
    return res.status(500).end()
  }
}

async function upsertSubscription({ userId, subscription, customerId, planKey }) {
  const planNames = { pro: 'Pro Plan' }
  const payload = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    plan_id: subscription.items?.data?.[0]?.price?.id || null, // authoritative price ID
    plan_name: planNames[planKey] || 'Unknown Plan',
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
  }

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle()

  if (existing) {
    await supabase.from('subscriptions').update(payload).eq('stripe_subscription_id', subscription.id)
  } else {
    await supabase.from('subscriptions').insert(payload)
  }
}