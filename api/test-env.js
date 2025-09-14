// Test environment variables
export default async function handler(req, res) {
  const envCheck = {
    hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    hasProPriceId: !!process.env.STRIPE_PRO_PRICE_ID,
    stripeKeyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 10) : 'NOT_SET',
    webhookSecretPrefix: process.env.STRIPE_WEBHOOK_SECRET ? process.env.STRIPE_WEBHOOK_SECRET.substring(0, 10) : 'NOT_SET',
    supabaseUrl: process.env.SUPABASE_URL || 'NOT_SET',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'NOT_SET',
    proPriceId: process.env.STRIPE_PRO_PRICE_ID || 'NOT_SET'
  }
  
  res.status(200).json(envCheck)
}
