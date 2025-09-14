// api/create-checkout-session.js
import Stripe from 'stripe'

const { STRIPE_SECRET_KEY, STRIPE_PRO_PRICE_ID, NEXT_PUBLIC_APP_URL, APP_URL } = process.env
if (!STRIPE_SECRET_KEY) throw new Error('Missing STRIPE_SECRET_KEY')
if (!STRIPE_PRO_PRICE_ID) throw new Error('Missing STRIPE_PRO_PRICE_ID')

const BASE_URL = NEXT_PUBLIC_APP_URL || APP_URL
if (!BASE_URL) throw new Error('Missing APP_URL/NEXT_PUBLIC_APP_URL')

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // TODO: replace with your real server auth. Do not trust body for identity in prod.
    const { planKey = 'pro', userId, userEmail, trialPeriodDays = 30 } = req.body || {}
    if (!userId || !userEmail) return res.status(400).json({ error: 'Missing user' })
    if (planKey !== 'pro') return res.status(400).json({ error: 'Invalid plan' })

    const priceId = STRIPE_PRO_PRICE_ID

    // Find or create customer (ideally reuse a stored customerId from your DB)
    let customerId
    const existing = await stripe.customers.list({ email: userEmail, limit: 1 })
    if (existing.data[0]) {
      customerId = existing.data[0].id
      await stripe.customers.update(customerId, {
        metadata: { user_id: userId, source: 'aircrew-shuffle' },
      })
    } else {
      const c = await stripe.customers.create({
        email: userEmail,
        metadata: { user_id: userId, source: 'aircrew-shuffle' },
      })
      customerId = c.id
    }

    // Prevent duplicate sessions
    const idemKey = `chk_${userId}_${planKey}_${trialPeriodDays}`

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        automatic_payment_methods: { enabled: true },
        payment_method_collection: 'always', // collect PM even with trial
        subscription_data: {
          trial_period_days: Math.min(Math.max(parseInt(trialPeriodDays, 10) || 0, 0), 30),
          metadata: { user_id: userId, plan_key: planKey },
        },
        client_reference_id: userId,
        success_url: `${BASE_URL}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${BASE_URL}/subscription?cancelled=true`,
        metadata: { user_id: userId, plan_key: planKey },
        locale: 'auto',
        allow_promotion_codes: true,
      },
      { idempotencyKey: idemKey }
    )

    return res.status(200).json({ url: session.url }) // client should redirect to this URL
  } catch (err) {
    console.error('create-checkout-session error', { message: err?.message, code: err?.code, type: err?.type })
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}