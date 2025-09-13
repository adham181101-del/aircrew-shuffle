import { loadStripe, Stripe } from '@stripe/stripe-js'

// Initialize Stripe with your publishable key
const stripePromise: Promise<Stripe | null> = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_51S6XogGtIHdiBNCgMt5s0OxkF7ZYAN8cBu9JhjZlVYP9AhctEqsbw9NpIcS8w0zcfk2NQORvxLvlIjreSRjirynV00QnZ7Tefi'
)

export const getStripe = () => stripePromise

// Stripe configuration
export const STRIPE_CONFIG = {
  // Subscription plans
  PLANS: {
    PRO: {
      id: 'price_1S6zBqGtIHdiBNCgtN03Fp7c',
      name: 'Pro Plan',
      description: 'Full access to all features including shift swapping',
      price: 2.99,
      currency: 'gbp',
      interval: 'month',
      per_person: true,
      features: [
        'Full shift calendar access',
        'Shift swapping functionality',
        'Premium calculator',
        'Team view and management',
        'All current features',
        'Priority support'
      ]
    }
  },
  
  // Trial settings
  TRIAL: {
    duration: 30, // 30 days
    duration_unit: 'days'
  }
}

// Stripe webhook events
export const STRIPE_EVENTS = {
  CUSTOMER_SUBSCRIPTION_CREATED: 'customer.subscription.created',
  CUSTOMER_SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  CUSTOMER_SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  CUSTOMER_SUBSCRIPTION_TRIAL_WILL_END: 'customer.subscription.trial_will_end'
} as const

export default stripePromise
