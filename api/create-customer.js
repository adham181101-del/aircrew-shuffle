// API route to create a Stripe customer
const Stripe = require('stripe')

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51S6XooGdegbWxtcAI6ttxzIvc706pkTjTljdR3lEjQyTF49kgr00CuJk8XyPdXfK4YegqbmLQ3UZHzAzQM2AIylC00vCD8rVBf', {
  apiVersion: '2023-10-16',
})

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, name } = req.body

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' })
    }

    // Create customer in Stripe
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        source: 'aircrew-shuffle'
      }
    })

    res.status(200).json({ customer })
  } catch (error) {
    console.error('Error creating Stripe customer:', error)
    res.status(500).json({ error: 'Failed to create customer' })
  }
}
