import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SessionStatus } from '@/components/SessionStatus'
import NotificationDropdown from '@/components/NotificationDropdown'
import { SubscriptionStatus } from '@/components/SubscriptionStatus'
import { useAuth } from '@/contexts/AuthContext'
import { DollarSign, LogOut } from 'lucide-react'

function getDisplayName(email?: string | null): string {
  if (!email) return 'there'
  const local = email.split('@')[0]?.split('.')[0] ?? ''
  if (!local) return 'there'
  return local.charAt(0).toUpperCase() + local.slice(1)
}

export function AppHeader() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch {
      /* AuthContext handles state */
    }
  }

  return (
    <header className="bg-blue-900 shadow-lg shrink-0">
      <div className="container mx-auto px-4 max-md:px-3 md:px-6 lg:max-w-none py-3 md:py-3 lg:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1 lg:flex-initial">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded border-2 border-blue-900 flex items-center justify-center shrink-0">
              <span className="text-blue-900 font-bold text-sm md:text-lg">B</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-white truncate leading-tight">
                <span className="hidden sm:inline">{user?.company?.name || 'British Airways'}</span>
                <span className="sm:hidden">BA</span>
              </h1>
              <p className="hidden lg:block text-blue-100 text-sm truncate">
                Welcome back,{' '}
                <span className="font-semibold text-white">{getDisplayName(user?.email)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 md:space-x-3 shrink-0">
            <div className="hidden md:flex items-center space-x-3">
              <SessionStatus />
              <Badge className="bg-blue-800 text-white border-0 px-3 py-1 rounded-full">
                {user?.company?.industry || 'Aviation'}
              </Badge>
              <SubscriptionStatus showUpgradeButton={false} />
            </div>
            <NotificationDropdown />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/subscription')}
              className="text-white hover:bg-blue-800 px-2 md:px-3"
              aria-label="Subscription"
            >
              <DollarSign className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-white hover:bg-red-600 hover:text-white px-2 md:px-3 border border-white/20 md:border-0"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 text-center lg:hidden">
          <p className="text-white text-base md:text-lg">
            Welcome back,{' '}
            <span className="font-semibold">{getDisplayName(user?.email)}</span>
          </p>
        </div>
      </div>
    </header>
  )
}
