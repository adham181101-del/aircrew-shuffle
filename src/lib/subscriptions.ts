import { getStripe, STRIPE_CONFIG } from '@/integrations/stripe/client'
import { supabase } from '@/integrations/supabase/client'
import { getCurrentUser } from './auth'

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete'
  plan_id: string
  plan_name: string
  current_period_start: string
  current_period_end: string
  trial_start: string | null
  trial_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: string
  features: string[]
  stripe_price_id: string
}

/**
 * Create a Stripe customer for the current user
 */
export const createStripeCustomer = async (email: string, name: string) => {
  try {
    const response = await fetch('/api/create-customer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, name }),
    })

    if (!response.ok) {
      throw new Error('Failed to create Stripe customer')
    }

    const { customer } = await response.json()
    return customer
  } catch (error) {
    console.error('Error creating Stripe customer:', error)
    throw error
  }
}

/**
 * Create a subscription with free trial
 */
export const createSubscription = async (planId: string) => {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const stripe = await getStripe()
    if (!stripe) {
      throw new Error('Stripe not loaded')
    }

    // Get the plan details
    const plan = Object.values(STRIPE_CONFIG.PLANS).find(p => p.id === planId)
    if (!plan) {
      throw new Error('Invalid plan selected')
    }

    // Create checkout session with trial
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planId,
        userId: user.id,
        userEmail: user.email,
        trialPeriodDays: STRIPE_CONFIG.TRIAL.duration,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create checkout session')
    }

    const { sessionId } = await response.json()

    // Redirect to Stripe Checkout
    const { error } = await stripe.redirectToCheckout({
      sessionId,
    })

    if (error) {
      throw new Error(error.message)
    }
  } catch (error) {
    console.error('Error creating subscription:', error)
    throw error
  }
}

/**
 * Get current user's subscription
 */
export const getCurrentSubscription = async (): Promise<Subscription | null> => {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return null
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .or('status.eq.trialing')
      .maybeSingle() // Use maybeSingle() instead of single() to handle 0 rows gracefully

    if (error) {
      // Don't log PGRST116 errors (no rows found) as they're expected for new users
      if (error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error)
      }
      return null
    }

    return data
  } catch (error) {
    console.error('Error getting current subscription:', error)
    return null
  }
}

/**
 * Check if user has active subscription or is in trial
 */
export const hasActiveSubscription = async (): Promise<boolean> => {
  const subscription = await getCurrentSubscription()
  if (!subscription) return false

  const now = new Date()
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null
  const periodEnd = new Date(subscription.current_period_end)

  // Check if subscription is active or in trial
  if (subscription.status === 'active') {
    return periodEnd > now
  }

  if (subscription.status === 'trialing' && trialEnd) {
    return trialEnd > now
  }

  return false
}

/**
 * Cancel subscription at period end
 */
export const cancelSubscription = async () => {
  try {
    const subscription = await getCurrentSubscription()
    if (!subscription) {
      throw new Error('No active subscription found')
    }

    const response = await fetch('/api/cancel-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriptionId: subscription.stripe_subscription_id,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to cancel subscription')
    }

    return true
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw error
  }
}

/**
 * Reactivate a canceled subscription
 */
export const reactivateSubscription = async () => {
  try {
    const subscription = await getCurrentSubscription()
    if (!subscription) {
      throw new Error('No subscription found')
    }

    const response = await fetch('/api/reactivate-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriptionId: subscription.stripe_subscription_id,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to reactivate subscription')
    }

    return true
  } catch (error) {
    console.error('Error reactivating subscription:', error)
    throw error
  }
}

/**
 * Get subscription plans
 */
export const getSubscriptionPlans = (): SubscriptionPlan[] => {
  return Object.values(STRIPE_CONFIG.PLANS).map(plan => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: plan.price,
    currency: plan.currency,
    interval: plan.interval,
    features: plan.features,
    stripe_price_id: plan.id,
  }))
}

/**
 * Check if user has access to shift swapping
 */
export const hasSwapAccess = async (): Promise<boolean> => {
  const hasActive = await hasActiveSubscription()
  return hasActive
}

/**
 * Check if user has access to premium features
 */
export const hasPremiumAccess = async (): Promise<boolean> => {
  const hasActive = await hasActiveSubscription()
  return hasActive
}

/**
 * Get user's access level
 */
export const getUserAccessLevel = async (): Promise<'free' | 'trial' | 'paid'> => {
  const subscription = await getCurrentSubscription()
  const inTrial = await isInTrial()
  const hasActive = await hasActiveSubscription()
  
  if (hasActive && subscription?.status === 'active') {
    return 'paid'
  } else if (inTrial) {
    return 'trial'
  } else {
    return 'free'
  }
}

/**
 * Get days remaining in trial
 */
export const getTrialDaysRemaining = async (): Promise<number | null> => {
  const subscription = await getCurrentSubscription()
  if (!subscription || !subscription.trial_end) {
    return null
  }

  const now = new Date()
  const trialEnd = new Date(subscription.trial_end)
  const diffTime = trialEnd.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}

/**
 * Check if user is in trial period
 */
export const isInTrial = async (): Promise<boolean> => {
  const subscription = await getCurrentSubscription()
  if (!subscription) return false

  return subscription.status === 'trialing' && subscription.trial_end && new Date(subscription.trial_end) > new Date()
}
