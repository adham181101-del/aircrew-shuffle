// Simplified checkout session function for debugging
const Stripe = require('stripe')

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('=== Starting checkout session creation ===')
    
    // Check if Stripe key exists
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY not found in environment variables')
      return res.status(500).json({ error: 'Stripe configuration missing' })
    }

    console.log('Stripe key found:', stripeKey.substring(0, 10) + '...')

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    })

    console.log('Stripe initialized successfully')

    const { planId, userId, userEmail, trialPeriodDays } = req.body
    console.log('Request data:', { planId, userId, userEmail, trialPeriodDays })

    if (!planId || !userId || !userEmail) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Use the hardcoded price ID for now
    const stripePriceId = 'price_1S6z12GdegbWxtcAQ7q4cnXK'
    console.log('Using price ID:', stripePriceId)

    // Create or retrieve customer
    console.log('Creating/finding customer...')
    let customer
    try {
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 1
      })
      
      if (customers.data.length > 0) {
        customer = customers.data[0]
        console.log('Found existing customer:', customer.id)
      } else {
        customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            user_id: userId,
            source: 'aircrew-shuffle'
          }
        })
        console.log('Created new customer:', customer.id)
      }
    } catch (customerError) {
      console.error('Customer error:', customerError)
      return res.status(500).json({ error: 'Failed to create customer', details: customerError.message })
    }

    // Create checkout session
    console.log('Creating checkout session...')
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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://aircrew-shuffle-qkqv9e5oe-adhams-projects-f02cd21b.vercel.app'}/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://aircrew-shuffle-qkqv9e5oe-adhams-projects-f02cd21b.vercel.app'}/subscription?subscription=cancelled`,
      metadata: {
        user_id: userId,
        plan_id: planId
      }
    })

    console.log('Checkout session created successfully:', session.id)
    res.status(200).json({ sessionId: session.id })

  } catch (error) {
    console.error('=== ERROR in checkout session ===')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message,
      type: error.constructor.name
    })
  }
}
