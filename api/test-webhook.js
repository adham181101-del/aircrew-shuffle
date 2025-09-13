// Test webhook endpoint to verify it's working
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    res.status(200).json({ 
      message: 'Webhook endpoint is working',
      timestamp: new Date().toISOString(),
      url: req.url
    })
  } catch (error) {
    console.error('Error in test webhook:', error)
    res.status(500).json({ error: 'Webhook test failed' })
  }
}
