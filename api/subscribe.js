// Simple subscription endpoint - no webhooks, no complexity
import Stripe from 'stripe'
import { supabaseAdmin } from './_supabaseAdmin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, userEmail } = req.body

    if (!userId || !userEmail) {
      return res.status(400).json({ error: 'Missing userId or userEmail' })
    }

    // Create or get customer
    let customer
    const existing = await stripe.customers.list({ email: userEmail, limit: 1 })
    if (existing.data[0]) {
      customer = existing.data[0]
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: { user_id: userId }
      })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      line_items: [{
        price: 'price_1S6zBqGtIHdiBNCgtN03Fp7c',
        quantity: 1,
      }],
      subscription_data: {
        trial_period_days: 30,
        metadata: { user_id: userId }
      },
      success_url: `https://aircrew-shuffle.vercel.app/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://aircrew-shuffle.vercel.app/subscription`,
      metadata: { user_id: userId }
    })

    return res.status(200).json({ url: session.url })

  } catch (error) {
    console.error('Subscribe error:', error)
    return res.status(500).json({ error: 'Failed to create subscription' })
  }
}
