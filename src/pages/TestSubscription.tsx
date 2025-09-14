import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  getCurrentSubscription, 
  hasActiveSubscription, 
  getTrialDaysRemaining,
  isInTrial,
  type Subscription
} from '@/lib/subscriptions'
import { getCurrentUser } from '@/lib/auth'

export default function TestSubscription() {
  const [user, setUser] = useState<any>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [hasActive, setHasActive] = useState(false)
  const [trialDays, setTrialDays] = useState<number | null>(null)
  const [inTrial, setInTrial] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Loading user...')
      const currentUser = await getCurrentUser()
      console.log('User:', currentUser)
      setUser(currentUser)
      
      if (!currentUser) {
        setError('No user found')
        return
      }
      
      console.log('Loading subscription data...')
      const [currentSubscription, hasActiveSub, trialDaysRemaining, trialStatus] = await Promise.all([
        getCurrentSubscription(),
        hasActiveSubscription(),
        getTrialDaysRemaining(),
        isInTrial()
      ])
      
      console.log('Subscription data:', {
        currentSubscription,
        hasActiveSub,
        trialDaysRemaining,
        trialStatus
      })
      
      setSubscription(currentSubscription)
      setHasActive(hasActiveSub)
      setTrialDays(trialDaysRemaining)
      setInTrial(trialStatus)
      
    } catch (error) {
      console.error('Error loading data:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testCreateSubscription = async () => {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planKey: 'pro',
          userId: user?.id,
          userEmail: user?.email,
          trialPeriodDays: 30
        })
      })
      
      const data = await response.json()
      console.log('Checkout session response:', data)
      
      if (data.url) {
        // Redirect to Stripe checkout URL
        window.location.href = data.url
      } else {
        setError(data.error || 'Failed to create checkout session')
      }
    } catch (error) {
      console.error('Error creating subscription:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Subscription Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-4 bg-red-100 border border-red-300 rounded text-red-700">
              Error: {error}
            </div>
          )}
          
          <div>
            <h3 className="font-semibold">User Info:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold">Subscription Info:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(subscription, null, 2)}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold">Status:</h3>
            <ul className="list-disc list-inside">
              <li>Has Active: {hasActive ? 'Yes' : 'No'}</li>
              <li>In Trial: {inTrial ? 'Yes' : 'No'}</li>
              <li>Trial Days: {trialDays}</li>
            </ul>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={loadData}>
              Refresh Data
            </Button>
            <Button onClick={testCreateSubscription} disabled={!user}>
              Test Create Subscription
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
