import { useState, useEffect, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Crown, Lock, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { hasSwapAccess, getUserAccessLevel } from '@/lib/subscriptions'

interface AccessControlProps {
  children: ReactNode
  feature: 'swap' | 'premium'
  fallback?: ReactNode
}

export const AccessControl = ({ children, feature, fallback }: AccessControlProps) => {
  const navigate = useNavigate()
  const [hasAccess, setHasAccess] = useState(false)
  const [accessLevel, setAccessLevel] = useState<'free' | 'trial' | 'paid'>('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      // TEMPORARY: Grant access to all users during development/testing
      const TEMPORARY_PRO_ACCESS = true
      
      if (TEMPORARY_PRO_ACCESS) {
        console.log('🚀 TEMPORARY PRO ACCESS - Granting access to', feature)
        setHasAccess(true)
        setAccessLevel('paid') // Show as paid user
        setLoading(false)
        return
      }

      const [swapAccess, userAccessLevel] = await Promise.all([
        hasSwapAccess(),
        getUserAccessLevel()
      ])

      setAccessLevel(userAccessLevel)
      
      if (feature === 'swap') {
        setHasAccess(swapAccess)
      } else if (feature === 'premium') {
        setHasAccess(swapAccess) // Same access level for now
      }
    } catch (error) {
      console.error('Error checking access:', error)
      setHasAccess(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
  }

  if (hasAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-orange-900">Pro Feature Required</CardTitle>
        </div>
        <CardDescription className="text-orange-700">
          {feature === 'swap' 
            ? 'Shift swapping is available with a Pro subscription'
            : 'This premium feature requires a Pro subscription'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              {accessLevel === 'free' ? 'Free Plan' : accessLevel === 'trial' ? 'Trial Active' : 'Pro Plan'}
            </Badge>
            {accessLevel === 'trial' && (
              <Badge className="bg-blue-100 text-blue-800">
                Full Access During Trial
              </Badge>
            )}
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold text-orange-900">Upgrade to Pro for:</h4>
            <ul className="text-sm text-orange-800 space-y-1">
              <li>• Shift swapping functionality</li>
              <li>• All premium features</li>
              <li>• Priority support</li>
              <li>• Only £2.99/month per person</li>
            </ul>
          </div>

          <Button 
            onClick={() => navigate('/subscription')}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Pro
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default AccessControl
