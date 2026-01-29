import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShiftCalendar } from '@/components/calendar/ShiftCalendar'
import { SessionStatus } from '@/components/SessionStatus'
import NotificationDropdown from '@/components/NotificationDropdown'
import { getUserShifts, deleteAllShifts, type Shift } from '@/lib/shifts'
import { getCurrentUser, type Staff, type Company } from '@/lib/auth'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useShifts, useInvalidateShifts } from '@/hooks/useShifts'
import { useIncomingSwapRequests } from '@/hooks/useSwapRequests'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { profiler } from '@/lib/performance'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Calendar, 
  Upload, 
  Settings, 
  LogOut,
  Plus,
  ArrowRightLeft,
  DollarSign,
  Building2,
  Trash2,
  Bell,
  X,
  User,
  Menu,
  RefreshCw,
  Shield,
  FileText,
  Lock
} from 'lucide-react'
import { PremiumCalculator } from '@/components/premium/PremiumCalculator'
import { SubscriptionStatus } from '@/components/SubscriptionStatus'
import { hasActiveSubscription } from '@/lib/subscriptions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const Dashboard = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<'calendar' | 'premiums'>('calendar')
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  // TEMPORARY: Always grant Pro access during development/testing
  const TEMPORARY_PRO_ACCESS = true
  const [hasProAccess, setHasProAccess] = useState(TEMPORARY_PRO_ACCESS)

  // Performance profiling
  useEffect(() => {
    profiler.mark('Dashboard rendered', 'render')
  }, [])

  // Use React Query hooks for data fetching
  const { data: currentUser } = useCurrentUser()
  const { data: shiftsData, isLoading: shiftsLoading } = useShifts()
  const { data: incomingRequests = [], isLoading: requestsLoading } = useIncomingSwapRequests(currentUser?.id || null)
  const invalidateShifts = useInvalidateShifts()

  // Extract shifts from query result
  const shifts = useMemo(() => shiftsData?.shifts || [], [shiftsData])
  const loading = shiftsLoading || requestsLoading

  // Calculate stats from cached data
  const stats = useMemo(() => {
    const totalShifts = shifts.length
    const pendingSwaps = incomingRequests.length
    const acceptedSwaps = incomingRequests.filter((r: any) => r.status === 'accepted').length
    return { totalShifts, pendingSwaps, acceptedSwaps }
  }, [shifts, incomingRequests])

  console.log('🏠 DASHBOARD PAGE LOADED - CONSOLE IS WORKING!');

  useEffect(() => {
    profiler.mark('Dashboard tab change', 'tab-change')
  }, [activeTab])

  useEffect(() => {
    if (user) {
      // Check for pending subscription
      const pendingSession = localStorage.getItem('pending_subscription_session')
      if (pendingSession) {
        console.log('Found pending subscription session:', pendingSession)
        // Try to complete the subscription
        completePendingSubscription(pendingSession)
      }
    }
  }, [user])

  // Handle refresh parameter from PDF upload
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    console.log('Dashboard URL params:', window.location.search)
    if (urlParams.get('refresh') === 'true') {
      console.log('Refresh parameter detected - triggering calendar refresh')
      // Clear the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname)
      
      // Refresh calendar shifts if available
      if (typeof window !== 'undefined' && (window as any).refreshCalendarShifts) {
        console.log('Calling refreshCalendarShifts function...')
        setTimeout(() => {
          (window as any).refreshCalendarShifts()
          console.log('refreshCalendarShifts called')
        }, 1000) // Small delay to ensure calendar is mounted
      } else {
        console.log('refreshCalendarShifts function not available')
      }
      
      // Also refresh dashboard stats
      setTimeout(() => {
        console.log('Refreshing dashboard stats...')
        refreshDashboardStats()
      }, 1500)
    }
  }, [])

  const completePendingSubscription = async (sessionId: string) => {
    try {
      const response = await fetch('/api/complete-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Welcome to Pro! 🎉",
          description: "Your subscription has been activated successfully! You now have access to all Pro features.",
          duration: 8000,
        })
        localStorage.removeItem('pending_subscription_session')
        // Refresh subscription data
        window.location.reload()
      } else {
        console.warn('Failed to complete subscription:', data.error)
        toast({
          title: "Payment Successful! 🎉",
          description: "Your payment was processed successfully. Your subscription will be activated shortly.",
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Error completing pending subscription:', error)
    }
  }

  // Handle subscription success redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('subscription') === 'success') {
      console.log('Subscription success detected - refreshing subscription status')
      toast({
        title: "Payment Successful! 🎉",
        description: "Your subscription is being activated. Please wait a moment...",
        duration: 5000,
      })
      
      // Remove the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname)
      
      // Refresh the page after a short delay to ensure webhook has processed
      setTimeout(() => {
        window.location.reload()
      }, 3000)
    }
  }, [])

  // Refresh dashboard stats (now uses React Query invalidation)
  const refreshDashboardStats = async () => {
    profiler.mark('refresh dashboard stats', 'fetch')
    // Invalidate queries to trigger refetch
    await invalidateShifts.mutateAsync()
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      // The AuthContext will handle clearing the user state
      // Navigation will be handled by the ProtectedRoute component
    } catch (error) {
      toast({
        title: "Error signing out",
        variant: "destructive"
      })
    }
  }

  const handleShiftClick = (shift: Shift) => {
    navigate(`/swaps?shift_id=${shift.id}&shift_date=${shift.date}`)
  }

  const handleDeleteAllShifts = async () => {
    if (!user) return
    
    setDeletingAll(true)
    try {
      await deleteAllShifts(user.id)
      // Invalidate shifts cache to refetch
      await invalidateShifts.mutateAsync()
      setDeleteAllDialogOpen(false)
      
      toast({
        title: "All shifts deleted",
        description: "Your shifts have been cleared. You can now upload a new roster.",
      })
    } catch (error) {
      toast({
        title: "Error deleting shifts",
        description: error instanceof Error ? error.message : "Failed to delete shifts",
        variant: "destructive"
      })
    } finally {
      setDeletingAll(false)
    }
  }

  // Show skeleton loader instead of blocking spinner
  if (loading && !shiftsData && !incomingRequests.length) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-16 w-full mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Header */}
      <header className="bg-blue-900 shadow-lg">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Side - Logo and Company Name */}
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded border-2 border-blue-900 flex items-center justify-center">
                <span className="text-blue-900 font-bold text-sm md:text-lg">B</span>
              </div>
              <h1 className="text-lg md:text-2xl font-bold text-white truncate">
                <span className="hidden sm:inline">{user?.company?.name || 'British Airways'}</span>
                <span className="sm:hidden">BA</span>
              </h1>
            </div>
            
            {/* Right Side - Actions */}
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Mobile: Show only essential items */}
              <div className="hidden md:flex items-center space-x-4">
                <SessionStatus />
                <Badge className="bg-blue-800 text-white border-0 px-3 py-1 rounded-full">
                  {user?.company?.industry || 'Aviation'}
                </Badge>
                <SubscriptionStatus showUpgradeButton={false} />
                <NotificationDropdown />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/subscription')}
                  className="text-white hover:bg-blue-800 px-3 py-1"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Subscription
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/profile')}
                  className="text-white hover:bg-blue-800 px-3 py-1"
                >
                  Profile
                </Button>
              </div>
              
              {/* Mobile: Show Profile and Sign Out buttons */}
              <div className="flex md:hidden items-center space-x-2">
                <NotificationDropdown />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/subscription')}
                  className="text-white hover:bg-blue-800 px-2 py-1 text-sm"
                >
                  <DollarSign className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/profile')}
                  className="text-white hover:bg-blue-800 px-2 py-1 text-sm"
                >
                  Profile
                </Button>
              </div>
              
              {/* Sign Out Button - Always visible */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-white hover:bg-red-600 hover:text-white px-3 py-1 border border-white/20 md:border-0"
              >
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Sign Out</span>
              </Button>
            </div>
          </div>
          
          {/* Welcome Message */}
          <div className="mt-4 text-center">
            <p className="text-white text-lg">
              Welcome back, <span className="font-semibold">{user?.email?.split('@')[0]?.split('.')[0]?.charAt(0).toUpperCase() + user?.email?.split('@')[0]?.split('.')[0]?.slice(1) || 'Adham'}</span>
            </p>
          </div>
        </div>
      </header>



      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">



        {/* Professional Navigation Tabs */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-8 bg-white p-1 rounded-lg shadow-sm border border-gray-200 w-full max-w-md">
          <Button
            variant={activeTab === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 px-4 py-2 rounded-md transition-all duration-200 ${
              activeTab === 'calendar' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Button>
          <Button
            variant={activeTab === 'premiums' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('premiums')}
            className={`flex-1 px-4 py-2 rounded-md transition-all duration-200 ${
              activeTab === 'premiums' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Premiums
          </Button>
        </div>

        {/* Professional Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Button
            onClick={() => navigate('/upload')}
            className="flex items-center justify-center h-16 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-all duration-200"
          >
            <Upload className="h-5 w-5 mr-2" />
            Upload Roster
          </Button>
          
          <Button
            onClick={() => navigate('/swaps/create')}
            variant="outline"
            className="flex items-center justify-center h-16 border border-gray-300 font-medium rounded-lg transition-all duration-200 hover:border-blue-500 hover:bg-blue-50"
          >
            <ArrowRightLeft className="h-5 w-5 mr-2" />
            Request Swap
          </Button>
          
          <Button
            onClick={() => navigate('/swaps')}
            variant="outline"
            className="flex items-center justify-center h-16 border border-gray-300 font-medium rounded-lg transition-all duration-200 hover:border-blue-500 hover:bg-blue-50"
          >
            <ArrowRightLeft className="h-5 w-5 mr-2" />
            Manage Swaps
          </Button>
        </div>

        {/* Content based on active tab - Use hidden/display to prevent remounts */}
        <div className="relative">
          <div className={activeTab === 'calendar' ? 'block' : 'hidden'}>
            <ShiftCalendar 
              onShiftClick={handleShiftClick}
              onCreateShift={() => navigate('/shifts/create')}
            />
          </div>
          <div className={activeTab === 'premiums' ? 'block' : 'hidden'}>
            <PremiumCalculator />
          </div>
        </div>

        {/* Delete All Shifts Confirmation Dialog */}
        <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete All Shifts</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete all {stats.totalShifts} shifts from your calendar.
                <br /><br />
                You can then upload a new roster PDF to replace them.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingAll}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteAllShifts}
                disabled={deletingAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletingAll ? 'Deleting...' : 'Delete All Shifts'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}

export default Dashboard