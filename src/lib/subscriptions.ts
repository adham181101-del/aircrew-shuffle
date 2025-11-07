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
        planKey: 'pro',
        userId: user.id,
        userEmail: user.email,
        trialPeriodDays: STRIPE_CONFIG.TRIAL.duration,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create checkout session')
    }

    const { url, error } = await response.json()
    
    if (error) {
      throw new Error(error)
    }

    // Redirect to Stripe Checkout URL
    window.location.href = url
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
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() // Get the most recent active/trialing subscription

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
  // TEMPORARY: Grant Pro access to all users during development/testing
  // TODO: Remove this before production
  const TEMPORARY_PRO_ACCESS = true
  
  if (TEMPORARY_PRO_ACCESS) {
    console.log('🚀 TEMPORARY PRO ACCESS ENABLED - All users have Pro features (OFFLINE MODE)')
    return true
  }

  try {
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
  } catch (error) {
    console.log('Supabase connection failed, using temporary Pro access:', error)
    return true // Fallback to Pro access if Supabase is down
  }
}

/**
 * Cancel subscription at period end
 */
export const cancelSubscription = async () => {
  // TEMPORARY: During TEMPORARY_PRO_ACCESS, cancellation is not needed
  const TEMPORARY_PRO_ACCESS = true
  if (TEMPORARY_PRO_ACCESS) {
    console.log('🚀 TEMPORARY PRO ACCESS - Cancellation not needed (OFFLINE MODE)')
    return true // Just return success, no actual cancellation needed
  }

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
    // During offline mode, just return success instead of throwing
    if (TEMPORARY_PRO_ACCESS) {
      return true
    }
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
  // TEMPORARY: Grant swap access to all users during development/testing
  const TEMPORARY_PRO_ACCESS = true
  if (TEMPORARY_PRO_ACCESS) {
    console.log('🚀 TEMPORARY PRO ACCESS - Swap access granted (OFFLINE MODE)')
    return true
  }
  
  try {
    const hasActive = await hasActiveSubscription()
    return hasActive
  } catch (error) {
    console.log('Supabase connection failed, using temporary swap access:', error)
    return true // Fallback to Pro access if Supabase is down
  }
}

/**
 * Check if user has access to premium features
 */
export const hasPremiumAccess = async (): Promise<boolean> => {
  // TEMPORARY: Grant premium access to all users during development/testing
  const TEMPORARY_PRO_ACCESS = true
  if (TEMPORARY_PRO_ACCESS) {
    console.log('🚀 TEMPORARY PRO ACCESS - Premium access granted (OFFLINE MODE)')
    return true
  }
  
  try {
    const hasActive = await hasActiveSubscription()
    return hasActive
  } catch (error) {
    console.log('Supabase connection failed, using temporary premium access:', error)
    return true // Fallback to Pro access if Supabase is down
  }
}

/**
 * Get user's access level
 */
export const getUserAccessLevel = async (): Promise<'free' | 'trial' | 'paid'> => {
  // TEMPORARY: Grant paid access to all users during development/testing
  const TEMPORARY_PRO_ACCESS = true
  
  if (TEMPORARY_PRO_ACCESS) {
    console.log('🚀 TEMPORARY PRO ACCESS - Returning paid access level (OFFLINE MODE)')
    return 'paid'
  }

  try {
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
  } catch (error) {
    console.log('Supabase connection failed, using temporary paid access level:', error)
    return 'paid' // Fallback to paid access if Supabase is down
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
