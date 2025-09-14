// api/checkout-verify.js
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

export default async function handler(req, res) {
  const { session_id } = req.query
  if (!session_id) return res.status(400).json({ error: 'Missing session_id' })
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ['subscription', 'customer'] })
    return res.status(200).json({
      mode: session.mode,
      payment_status: session.payment_status,
      subscription_id: session.subscription?.id ?? null,
      customer_id: session.customer?.id ?? null,
      email: session.customer_details?.email ?? null,
    })
  } catch (e) {
    console.error('verify error', e?.message)
    return res.status(500).json({ error: 'Failed to verify session' })
  }
}
