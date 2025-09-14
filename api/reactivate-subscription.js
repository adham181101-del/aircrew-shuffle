// API route to reactivate a Stripe subscription
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { subscriptionId } = req.body

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID is required' })
    }

    // Reactivate the subscription by removing cancel_at_period_end
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    })

    res.status(200).json({ subscription })
  } catch (error) {
    console.error('Error reactivating subscription:', error)
    res.status(500).json({ error: 'Failed to reactivate subscription' })
  }
}
