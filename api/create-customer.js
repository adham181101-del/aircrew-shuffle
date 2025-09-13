// API route to create a Stripe customer
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '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', {
  apiVersion: '2023-10-16',
})

export default async function handler(req, res) {
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
