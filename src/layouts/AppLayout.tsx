import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AppHeader } from '@/components/layout/AppHeader'
import { AppBottomNav, AppSideNav } from '@/components/layout/AppNavigation'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useInvalidateShifts } from '@/hooks/useShifts'

export function AppLayout() {
  const { user } = useAuth()
  const { toast } = useToast()
  const location = useLocation()
  const invalidateShifts = useInvalidateShifts()

  useEffect(() => {
    if (!user) return
    const pendingSession = localStorage.getItem('pending_subscription_session')
    if (!pendingSession) return

    const completePendingSubscription = async () => {
      try {
        const response = await fetch('/api/complete-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: pendingSession }),
        })
        const data = await response.json()
        if (data.success) {
          toast({
            title: 'Welcome to Pro!',
            description: 'Your subscription has been activated successfully.',
            duration: 8000,
          })
          localStorage.removeItem('pending_subscription_session')
          window.location.reload()
        }
      } catch {
        /* ignore */
      }
    }
    completePendingSubscription()
  }, [user, toast])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('refresh') !== 'true') return

    window.history.replaceState({}, document.title, location.pathname)
    invalidateShifts.mutateAsync()
    if (typeof window !== 'undefined' && (window as Window & { refreshCalendarShifts?: () => void }).refreshCalendarShifts) {
      ;(window as Window & { refreshCalendarShifts?: () => void }).refreshCalendarShifts?.()
    }
  }, [location.pathname, location.search, invalidateShifts])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('subscription') !== 'success') return
    toast({
      title: 'Payment successful',
      description: 'Your subscription is being activated. Please wait a moment…',
      duration: 5000,
    })
    window.history.replaceState({}, document.title, location.pathname)
  }, [location.search, location.pathname, toast])

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <AppHeader />
      <div className="app-shell-body">
        <AppSideNav />
        <main className="app-shell-main container mx-auto px-4 max-md:px-3 py-4 lg:max-w-none lg:w-full app-main-with-tabs">
          <Outlet />
        </main>
      </div>
      <AppBottomNav />
    </div>
  )
}
