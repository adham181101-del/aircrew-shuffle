// API route to cancel a Stripe subscription
const Stripe = require('stripe')

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51S6XooGdegbWxtcAI6ttxzIvc706pkTjTljdR3lEjQyTF49kgr00CuJk8XyPdXfK4YegqbmLQ3UZHzAzQM2AIylC00vCD8rVBf', {
  apiVersion: '2023-10-16',
})

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { subscriptionId } = req.body

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID is required' })
    }

    // Cancel the subscription at period end
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })

    res.status(200).json({ subscription })
  } catch (error) {
    console.error('Error canceling subscription:', error)
    res.status(500).json({ error: 'Failed to cancel subscription' })
  }
}
