// Manual subscription creation endpoint
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { sessionId, userId } = req.body

    if (!sessionId || !userId) {
      return res.status(400).json({ error: 'Missing sessionId or userId' })
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer']
    })

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' })
    }

    const subscription = session.subscription
    const customer = session.customer

    if (!subscription || !customer) {
      return res.status(400).json({ error: 'No subscription or customer found' })
    }

    // Create subscription record in Supabase
    const subscriptionData = {
      user_id: userId,
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      plan_id: subscription.items?.data?.[0]?.price?.id || null,
      plan_name: 'Pro Plan',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
    }

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle()

    let result
    if (existing) {
      result = await supabase
        .from('subscriptions')
        .update(subscriptionData)
        .eq('stripe_subscription_id', subscription.id)
    } else {
      result = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
    }

    if (result.error) {
      console.error('Supabase error:', result.error)
      return res.status(500).json({ error: 'Failed to create subscription record' })
    }

    return res.status(200).json({ 
      success: true, 
      subscription: subscriptionData,
      message: 'Subscription created successfully'
    })

  } catch (error) {
    console.error('Error creating subscription:', error)
    return res.status(500).json({ error: 'Failed to create subscription' })
  }
}
