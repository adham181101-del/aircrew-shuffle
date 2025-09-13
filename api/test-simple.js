// Simple test function to verify basic functionality
module.exports = async function handler(req, res) {
  try {
    res.status(200).json({
      message: 'Simple test function working',
      method: req.method,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in test-simple:', error)
    res.status(500).json({ 
      error: 'Test function failed',
      details: error.message 
    })
  }
}
