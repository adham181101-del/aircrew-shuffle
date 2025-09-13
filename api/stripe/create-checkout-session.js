// API route to create a Stripe checkout session with trial
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51S6XooGdegbWxtcAI6ttxzIvc706pkTjTljdR3lEjQyTF49kgr00CuJk8XyPdXfK4YegqbmLQ3UZHzAzQM2AIylC00vCD8rVBf', {
  apiVersion: '2023-10-16',
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { planId, userId, userEmail, trialPeriodDays } = req.body

    if (!planId || !userId || !userEmail) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Define your price IDs (replace with your actual Stripe price IDs)
    const priceIds = {
      'price_1S6z12GdegbWxtcAQ7q4cnXK': process.env.STRIPE_PRO_PRICE_ID || 'price_1S6z12GdegbWxtcAQ7q4cnXK',
    }

    const stripePriceId = priceIds[planId]
    if (!stripePriceId) {
      return res.status(400).json({ error: 'Invalid plan selected' })
    }

    // Create or retrieve customer
    let customer
    try {
      // Try to find existing customer
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 1
      })
      
      if (customers.data.length > 0) {
        customer = customers.data[0]
      } else {
        // Create new customer
        customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            user_id: userId,
            source: 'aircrew-shuffle'
          }
        })
      }
    } catch (error) {
      console.error('Error with customer:', error)
      return res.status(500).json({ error: 'Failed to create customer' })
    }

    // Create checkout session with trial
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: trialPeriodDays || 30,
        metadata: {
          user_id: userId,
          plan_id: planId
        }
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?subscription=cancelled`,
      metadata: {
        user_id: userId,
        plan_id: planId
      }
    })

    res.status(200).json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
