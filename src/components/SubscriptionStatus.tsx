import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { 
  Crown, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { 
  getCurrentSubscription, 
  hasActiveSubscription, 
  getTrialDaysRemaining,
  isInTrial,
  type Subscription
} from '@/lib/subscriptions'

interface SubscriptionStatusProps {
  showUpgradeButton?: boolean
  className?: string
}

export const SubscriptionStatus = ({ showUpgradeButton = true, className = '' }: SubscriptionStatusProps) => {
  const navigate = useNavigate()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [hasActive, setHasActive] = useState(false)
  const [trialDays, setTrialDays] = useState<number | null>(null)
  const [inTrial, setInTrial] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSubscriptionStatus()
  }, [])

  const loadSubscriptionStatus = async () => {
    try {
      const [currentSubscription, hasActiveSub, trialDaysRemaining, trialStatus] = await Promise.all([
        getCurrentSubscription(),
        hasActiveSubscription(),
        getTrialDaysRemaining(),
        isInTrial()
      ])

      setSubscription(currentSubscription)
      setHasActive(hasActiveSub)
      setTrialDays(trialDaysRemaining)
      setInTrial(trialStatus)
    } catch (error) {
      // Silently handle subscription errors - they're expected for new users
      console.log('No subscription found - user is on free plan')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <XCircle className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-500">No subscription</span>
        {showUpgradeButton && (
          <Button
            size="sm"
            onClick={() => navigate('/subscription')}
            className="ml-2"
          >
            <Crown className="h-3 w-3 mr-1" />
            Upgrade
          </Button>
        )}
      </div>
    )
  }

  const getStatusIcon = () => {
    if (inTrial) {
      return <Calendar className="h-4 w-4 text-blue-500" />
    }
    
    switch (subscription.status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'trialing':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'past_due':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'canceled':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusText = () => {
    if (inTrial && trialDays !== null) {
      return `Trial: ${trialDays} days left`
    }
    
    switch (subscription.status) {
      case 'active':
        return 'Active'
      case 'trialing':
        return 'Trial Active'
      case 'past_due':
        return 'Payment Due'
      case 'canceled':
        return 'Canceled'
      case 'unpaid':
        return 'Unpaid'
      case 'incomplete':
        return 'Incomplete'
      default:
        return subscription.status
    }
  }

  const getStatusColor = () => {
    if (inTrial) {
      return 'bg-blue-100 text-blue-800 border-blue-200'
    }
    
    switch (subscription.status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'trialing':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'past_due':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'canceled':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'unpaid':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'incomplete':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {getStatusIcon()}
      <Badge variant="outline" className={getStatusColor()}>
        {getStatusText()}
      </Badge>
      {subscription.plan_name && (
        <span className="text-sm text-gray-600">
          {subscription.plan_name}
        </span>
      )}
      {showUpgradeButton && (!hasActive || inTrial) && (
        <Button
          size="sm"
          onClick={() => navigate('/subscription')}
          className="ml-2"
        >
          <Crown className="h-3 w-3 mr-1" />
          {inTrial ? 'Manage' : 'Upgrade'}
        </Button>
      )}
    </div>
  )
}

export default SubscriptionStatus
