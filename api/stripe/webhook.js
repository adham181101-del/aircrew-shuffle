// Stripe webhook handler for subscription events
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object)
        break
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object)
        break
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
      
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}

async function handleSubscriptionCreated(subscription) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer)
    const userId = customer.metadata.user_id

    if (!userId) {
      console.error('No user_id found in customer metadata')
      return
    }

    // Get plan details
    const planId = subscription.metadata.plan_id
    const planName = getPlanName(planId)

    // Insert subscription into database
    const { error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        stripe_customer_id: subscription.customer,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        plan_id: planId,
        plan_name: planName,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end
      })

    if (error) {
      console.error('Error inserting subscription:', error)
    } else {
      console.log('Subscription created successfully for user:', userId)
    }
  } catch (error) {
    console.error('Error handling subscription created:', error)
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    const planName = getPlanName(subscription.metadata.plan_id)

    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        plan_id: subscription.metadata.plan_id,
        plan_name: planName,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('Error updating subscription:', error)
    } else {
      console.log('Subscription updated successfully:', subscription.id)
    }
  } catch (error) {
    console.error('Error handling subscription updated:', error)
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        cancel_at_period_end: false
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('Error updating deleted subscription:', error)
    } else {
      console.log('Subscription marked as canceled:', subscription.id)
    }
  } catch (error) {
    console.error('Error handling subscription deleted:', error)
  }
}

async function handlePaymentSucceeded(invoice) {
  try {
    if (invoice.subscription) {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active'
        })
        .eq('stripe_subscription_id', invoice.subscription)

      if (error) {
        console.error('Error updating subscription after payment:', error)
      } else {
        console.log('Subscription activated after payment:', invoice.subscription)
      }
    }
  } catch (error) {
    console.error('Error handling payment succeeded:', error)
  }
}

async function handlePaymentFailed(invoice) {
  try {
    if (invoice.subscription) {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'past_due'
        })
        .eq('stripe_subscription_id', invoice.subscription)

      if (error) {
        console.error('Error updating subscription after payment failure:', error)
      } else {
        console.log('Subscription marked as past due:', invoice.subscription)
      }
    }
  } catch (error) {
    console.error('Error handling payment failed:', error)
  }
}

async function handleTrialWillEnd(subscription) {
  try {
    // You could send an email notification here
    console.log('Trial will end for subscription:', subscription.id)
    
    // Get customer details to send notification
    const customer = await stripe.customers.retrieve(subscription.customer)
    console.log('Trial ending for customer:', customer.email)
    
    // Here you would typically send an email notification
    // await sendTrialEndingEmail(customer.email, subscription)
  } catch (error) {
    console.error('Error handling trial will end:', error)
  }
}

function getPlanName(planId) {
  const planNames = {
    'price_basic_monthly': 'Basic Plan',
    'price_premium_monthly': 'Premium Plan',
    'price_enterprise_monthly': 'Enterprise Plan'
  }
  return planNames[planId] || 'Unknown Plan'
}
