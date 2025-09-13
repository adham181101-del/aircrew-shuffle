// Test endpoint to check environment variables
export default async function handler(req, res) {
  try {
    const envCheck = {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
      hasPriceId: !!process.env.STRIPE_PRO_PRICE_ID,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      stripeKeyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 10) : 'NOT_SET',
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'NOT_SET',
      priceId: process.env.STRIPE_PRO_PRICE_ID || 'NOT_SET'
    }
    
    console.log('Environment variables check:', envCheck)
    
    res.status(200).json({
      message: 'Environment variables check',
      environment: envCheck,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in test-env:', error)
    res.status(500).json({ 
      error: 'Failed to check environment variables',
      details: error.message 
    })
  }
}
