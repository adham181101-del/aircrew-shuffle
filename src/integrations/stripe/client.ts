import { loadStripe, Stripe } from '@stripe/stripe-js'

// Initialize Stripe with your publishable key
const stripePromise: Promise<Stripe | null> = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51S6XooGdegbWxtcAt5kFY07UUByduEDWr0qRIKd2klrO4kyrlI8neVS595nJzvaFy661QQZzE1O84BSjXu460IcF00TfTspX5G'
)

export const getStripe = () => stripePromise

// Stripe configuration
export const STRIPE_CONFIG = {
  // Subscription plans
  PLANS: {
    BASIC: {
      id: 'price_basic_monthly',
      name: 'Basic Plan',
      description: 'Essential shift management features',
      price: 9.99,
      currency: 'gbp',
      interval: 'month',
      features: [
        'Unlimited shift scheduling',
        'Basic shift swapping',
        'Team management',
        'Premium calculator',
        'Email support'
      ]
    },
    PREMIUM: {
      id: 'price_premium_monthly',
      name: 'Premium Plan',
      description: 'Advanced features for larger teams',
      price: 19.99,
      currency: 'gbp',
      interval: 'month',
      features: [
        'Everything in Basic',
        'Advanced analytics',
        'Custom reporting',
        'API access',
        'Priority support',
        'Multi-location support'
      ]
    },
    ENTERPRISE: {
      id: 'price_enterprise_monthly',
      name: 'Enterprise Plan',
      description: 'Full-featured solution for large organizations',
      price: 49.99,
      currency: 'gbp',
      interval: 'month',
      features: [
        'Everything in Premium',
        'Custom integrations',
        'Dedicated account manager',
        'SLA guarantee',
        'Advanced security features',
        'White-label options'
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
