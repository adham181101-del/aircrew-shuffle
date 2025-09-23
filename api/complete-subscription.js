// Complete subscription after payment
import Stripe from 'stripe'
import { supabaseAdmin } from './_supabaseAdmin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

export default async function handler(req, res) {
  console.log('Complete subscription endpoint called:', req.method, req.body)
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { sessionId } = req.body
    console.log('Session ID:', sessionId)

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' })
    }

    // Get session from Stripe
    console.log('Retrieving session from Stripe...')
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer']
    })
    console.log('Session retrieved:', {
      id: session.id,
      payment_status: session.payment_status,
      has_subscription: !!session.subscription,
      has_customer: !!session.customer
    })

    if (session.payment_status !== 'paid') {
      console.log('Payment not completed, status:', session.payment_status)
      return res.status(400).json({ error: 'Payment not completed' })
    }

    const subscription = session.subscription
    const customer = session.customer

    if (!subscription || !customer) {
      console.log('Missing subscription or customer:', { subscription: !!subscription, customer: !!customer })
      return res.status(400).json({ error: 'No subscription found' })
    }

    // Create subscription in Supabase
    const subscriptionData = {
      user_id: customer.metadata.user_id,
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      plan_id: 'price_1S6zBqGtIHdiBNCgtN03Fp7c',
      plan_name: 'Pro Plan',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
    }

    // Insert subscription
    const { error } = await supabase
      .from('subscriptions')
      .upsert(subscriptionData, { onConflict: 'stripe_subscription_id' })

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Failed to save subscription' })
    }

    return res.status(200).json({ success: true, subscription: subscriptionData })

  } catch (error) {
    console.error('Complete subscription error:', error)
    return res.status(500).json({ error: 'Failed to complete subscription' })
  }
}
