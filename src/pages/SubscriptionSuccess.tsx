import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2 } from 'lucide-react'

const SubscriptionSuccess = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get('session_id')

    if (!sessionId) {
      setError('No session ID found')
      setLoading(false)
      return
    }

    // Since payment was successful, just show success immediately
    // Store session ID for later processing when user logs back in
    console.log('Payment successful for session:', sessionId)
    localStorage.setItem('pending_subscription_session', sessionId)
    setSuccess(true)
    setLoading(false)
  }, [])

  const goToLogin = () => {
    // Redirect to login page instead of dashboard to avoid auth issues
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-center text-gray-600">
                Completing your subscription...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600 mb-4">{error}</p>
            <Button onClick={goToLogin} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-green-600 flex items-center justify-center space-x-2">
            <CheckCircle className="h-6 w-6" />
            <span>Success!</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-600 mb-4">
            Your payment was successful! Please log in to activate your Pro subscription and access all features.
          </p>
          <Button onClick={goToLogin} className="w-full">
            Go to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default SubscriptionSuccess
