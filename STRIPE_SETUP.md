# Stripe Subscription Setup Guide

This guide will help you set up Stripe subscriptions with a 1-month free trial for your Aircrew Shuffle application.

## 1. Stripe Account Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Complete the account verification process
3. Get your API keys from the Stripe Dashboard

## 2. Environment Variables

Add these environment variables to your `.env` file:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (replace with your actual price IDs from Stripe Dashboard)
STRIPE_BASIC_PRICE_ID=price_basic_monthly_id_here
STRIPE_PREMIUM_PRICE_ID=price_premium_monthly_id_here
STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_monthly_id_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:5173
```

## 3. Create Products and Prices in Stripe

### Basic Plan
- Product Name: "Basic Plan"
- Description: "Essential shift management features"
- Price: £9.99/month
- Billing: Recurring monthly

### Premium Plan
- Product Name: "Premium Plan" 
- Description: "Advanced features for larger teams"
- Price: £19.99/month
- Billing: Recurring monthly

### Enterprise Plan
- Product Name: "Enterprise Plan"
- Description: "Full-featured solution for large organizations"
- Price: £49.99/month
- Billing: Recurring monthly

## 4. Webhook Setup

1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
4. Copy the webhook secret and add it to your environment variables

## 5. Database Migration

Run the subscription table migration:

```bash
# Apply the migration
supabase db push
```

## 6. Features Included

### Free Trial
- 30-day free trial for all plans
- No credit card required to start
- Full access to all features during trial
- Email reminders before trial ends

### Subscription Management
- View current subscription status
- Cancel subscription (ends at period end)
- Reactivate canceled subscriptions
- Upgrade/downgrade plans
- View billing history

### Security Features
- Secure payment processing via Stripe
- PCI compliance through Stripe
- Webhook signature verification
- Row-level security in database

## 7. Testing

### Test Cards
Use these test card numbers in Stripe test mode:

- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Requires Authentication**: 4000 0025 0000 3155

### Test Scenarios
1. Create subscription with trial
2. Test payment success/failure
3. Test subscription cancellation
4. Test webhook events
5. Test trial expiration

## 8. Production Deployment

1. Switch to live mode in Stripe Dashboard
2. Update environment variables with live keys
3. Update webhook endpoint to production URL
4. Test with real payment methods
5. Monitor webhook events and logs

## 9. Monitoring

- Monitor subscription metrics in Stripe Dashboard
- Set up alerts for failed payments
- Track trial conversion rates
- Monitor webhook delivery success

## 10. Support

For Stripe-related issues:
- Check Stripe Dashboard logs
- Review webhook event history
- Contact Stripe support if needed
- Monitor application logs for errors
