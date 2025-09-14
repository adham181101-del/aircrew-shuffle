import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  CreditCard, 
  Check, 
  X, 
  Crown, 
  Star, 
  Zap, 
  Shield,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  Loader2
} from 'lucide-react'
import { 
  getCurrentSubscription, 
  hasActiveSubscription, 
  createSubscription, 
  cancelSubscription,
  reactivateSubscription,
  getSubscriptionPlans,
  getTrialDaysRemaining,
  isInTrial,
  type Subscription,
  type SubscriptionPlan
} from '@/lib/subscriptions'
import { useAuth } from '@/contexts/AuthContext'

const Subscription = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null)
  const [inTrial, setInTrial] = useState(false)

  useEffect(() => {
    loadSubscriptionData()
    
    // Handle success/cancel parameters from Stripe redirect
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const cancelled = urlParams.get('cancelled')
    const sessionId = urlParams.get('session_id')
    
    if (success === 'true' && sessionId) {
      // Manually create subscription since webhook might not be working
      try {
        // Use the user from the hook
        
        if (user) {
          const createResponse = await fetch('/api/create-subscription-manual', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId,
              userId: user.id
            })
          })
          
          const createData = await createResponse.json()
          
          if (createData.success) {
            toast({
              title: "Payment Successful! 🎉",
              description: "Your subscription has been activated successfully!",
              duration: 5000,
            })
          } else {
            toast({
              title: "Payment Successful! 🎉",
              description: "Your subscription is being activated. Please wait a moment...",
              duration: 5000,
            })
          }
        } else {
          toast({
            title: "Payment Successful! 🎉",
            description: "Your subscription is being activated. Please wait a moment...",
            duration: 5000,
          })
        }
      } catch (error) {
        console.error('Error creating subscription:', error)
        toast({
          title: "Payment Successful! 🎉",
          description: "Your subscription is being activated. Please wait a moment...",
          duration: 5000,
        })
      }
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
      
      // Refresh subscription data immediately
      loadSubscriptionData()
    } else if (cancelled === 'true') {
      toast({
        title: "Payment Cancelled",
        description: "Your payment was cancelled. You can try again anytime.",
        variant: "destructive",
        duration: 5000,
      })
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const loadSubscriptionData = async () => {
    try {
      setLoading(true)
      const [currentSubscription, hasActive, plansData, trialDays, trialStatus] = await Promise.all([
        getCurrentSubscription(),
        hasActiveSubscription(),
        Promise.resolve(getSubscriptionPlans()),
        getTrialDaysRemaining(),
        isInTrial()
      ])

      setSubscription(currentSubscription)
      setPlans(plansData)
      setTrialDaysRemaining(trialDays)
      setInTrial(trialStatus)
    } catch (error) {
      console.error('Error loading subscription data:', error)
      toast({
        title: "Error",
        description: "Failed to load subscription information",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (planId: string) => {
    try {
      setActionLoading(planId)
      await createSubscription(planId)
    } catch (error) {
      console.error('Error creating subscription:', error)
      toast({
        title: "Error",
        description: "Failed to start subscription. Please try again.",
        variant: "destructive"
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async () => {
    try {
      setActionLoading('cancel')
      await cancelSubscription()
      toast({
        title: "Subscription Canceled",
        description: "Your subscription will end at the current period.",
      })
      await loadSubscriptionData()
    } catch (error) {
      console.error('Error canceling subscription:', error)
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive"
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReactivate = async () => {
    try {
      setActionLoading('reactivate')
      await reactivateSubscription()
      toast({
        title: "Subscription Reactivated",
        description: "Your subscription has been reactivated.",
      })
      await loadSubscriptionData()
    } catch (error) {
      console.error('Error reactivating subscription:', error)
      toast({
        title: "Error",
        description: "Failed to reactivate subscription. Please try again.",
        variant: "destructive"
      })
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      trialing: { variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800' },
      past_due: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
      canceled: { variant: 'outline' as const, color: 'bg-gray-100 text-gray-800' },
      unpaid: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
      incomplete: { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' }
    }
    
    const config = variants[status as keyof typeof variants] || variants.incomplete
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading subscription information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Subscription & Billing</h1>
            <p className="text-lg text-gray-600">Manage your subscription and billing preferences</p>
          </div>
        </div>

        {/* Trial Status Alert */}
        {inTrial && trialDaysRemaining !== null && (
          <Alert className="mb-8 border-blue-200 bg-blue-50">
            <Calendar className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Free Trial Active:</strong> You have {trialDaysRemaining} days remaining in your free trial. 
              {trialDaysRemaining <= 7 && " Don't forget to add a payment method to continue using the service."}
            </AlertDescription>
          </Alert>
        )}

        {/* Current Subscription */}
        {subscription && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Current Subscription
                  </CardTitle>
                  <CardDescription>
                    {subscription.plan_name} - {getStatusBadge(subscription.status)}
                  </CardDescription>
                </div>
                {subscription.cancel_at_period_end && (
                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                    Cancels at period end
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Current Period</p>
                  <p className="text-lg font-semibold">
                    {new Date(subscription.current_period_start).toLocaleDateString()} - {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                </div>
                {subscription.trial_end && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Trial End</p>
                    <p className="text-lg font-semibold">
                      {new Date(subscription.trial_end).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500">Actions</p>
                  <div className="flex gap-2">
                    {subscription.cancel_at_period_end ? (
                      <Button
                        size="sm"
                        onClick={handleReactivate}
                        disabled={actionLoading === 'reactivate'}
                      >
                        {actionLoading === 'reactivate' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Reactivate'
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={actionLoading === 'cancel'}
                      >
                        {actionLoading === 'cancel' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Cancel'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Plans */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Upgrade to Pro</h2>
          <div className="max-w-md mx-auto">
            {plans.map((plan) => (
              <Card key={plan.id} className="relative ring-2 ring-blue-500 shadow-lg">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white px-3 py-1">
                    <Star className="h-3 w-3 mr-1" />
                    Pro Plan
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 justify-center">
                    <Crown className="h-5 w-5 text-blue-500" />
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-center">{plan.description}</CardDescription>
                  <div className="mt-4 text-center">
                    <span className="text-4xl font-bold">£{plan.price}</span>
                    <span className="text-gray-500">/{plan.interval}</span>
                    <p className="text-sm text-gray-600 mt-1">per person</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={actionLoading === plan.id || (subscription && subscription.plan_id === plan.id)}
                  >
                    {actionLoading === plan.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : subscription && subscription.plan_id === plan.id ? (
                      'Current Plan'
                    ) : (
                      `Start Free Trial - £${plan.price}/${plan.interval}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Free vs Pro Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Free Plan */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-700">Free Plan</CardTitle>
              <CardDescription>Limited access to core features</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-bold text-gray-600">£0</span>
                <span className="text-gray-500">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Shift calendar view</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Premium calculator</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Team view</span>
                </li>
                <li className="flex items-center gap-2">
                  <X className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-gray-500">Shift swapping</span>
                </li>
                <li className="flex items-center gap-2">
                  <X className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-gray-500">Advanced features</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Pro Plan</CardTitle>
              <CardDescription>Full access to all features</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-bold text-blue-900">£2.99</span>
                <span className="text-blue-700">/month</span>
                <p className="text-sm text-blue-600">per person</p>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Everything in Free</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Shift swapping</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Advanced features</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Priority support</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">30-day free trial</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Free Trial Information */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Calendar className="h-5 w-5" />
              30-Day Free Trial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">What's Included:</h3>
                <ul className="space-y-1 text-blue-800">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Full access to all Pro features
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    No credit card required to start
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Cancel anytime during trial
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Email reminders before trial ends
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">After Trial:</h3>
                <ul className="space-y-1 text-blue-800">
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Upgrade to Pro for £2.99/month
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Or continue with Free plan (limited features)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Data preserved for 30 days
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Subscription
