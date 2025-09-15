import { useState, useEffect } from 'react'
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
import { 
  Calendar, 
  Users, 
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
import { TeamView } from '@/components/team/TeamView'
import { SubscriptionStatus } from '@/components/SubscriptionStatus'
import { hasActiveSubscription } from '@/lib/subscriptions'
import { supabase } from '@/integrations/supabase/client'
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
  const [shifts, setShifts] = useState<Shift[]>([])
  const [activeTab, setActiveTab] = useState<'calendar' | 'premiums' | 'team'>('calendar')
  const [stats, setStats] = useState({
    totalShifts: 0,
    pendingSwaps: 0,
    acceptedSwaps: 0
  })
  const [loading, setLoading] = useState(true)
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [incomingRequests, setIncomingRequests] = useState<any[]>([])
  const [hasProAccess, setHasProAccess] = useState(false)

  useEffect(() => {
    if (user) {
      loadDashboardData()
      
      // Check for pending subscription
      const pendingSession = localStorage.getItem('pending_subscription_session')
      if (pendingSession) {
        console.log('Found pending subscription session:', pendingSession)
        // Try to complete the subscription
        completePendingSubscription(pendingSession)
      }
    }
  }, [user])

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

  const loadDashboardData = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      // Use getCurrentUser() to match ManageSwaps approach
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        console.error('No current user found');
        return;
      }
      
      const userShifts = await getUserShifts(currentUser.id)
      setShifts(userShifts)
      
      // Fetch incoming requests using getCurrentUser ID (EXACT SAME AS MANAGESWAPS)
      const incomingRequestsData = await loadIncomingRequests(currentUser.id)
      setIncomingRequests(incomingRequestsData)
      
      // Fetch accepted swaps count from swap_requests table using getCurrentUser ID
      const { data: acceptedSwapsData, error: acceptedError } = await supabase
        .from('swap_requests')
        .select('id')
        .eq('accepter_id', currentUser.id)
        .eq('status', 'accepted');

      if (acceptedError) {
        console.error('Error fetching accepted swaps:', acceptedError);
      }

      const acceptedSwapsCount = acceptedSwapsData?.length || 0;
      
      // Update stats after all data is fetched
      const newStats = {
        totalShifts: userShifts.length,
        pendingSwaps: incomingRequestsData.length, // This is all incoming requests (like ManageSwaps)
        acceptedSwaps: acceptedSwapsCount // This is properly counted accepted swaps
      };
      
      setStats(newStats);
      
      // Check if user has Pro access
      const proAccess = await hasActiveSubscription()
      setHasProAccess(proAccess)

    } catch (error) {
      toast({
        title: "Error loading dashboard",
        description: "Please try refreshing the page",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshDashboardStats = async () => {
    if (!user) return;
    
    try {
      // Use getCurrentUser() to match ManageSwaps approach
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        console.error('No current user found in refresh');
        return;
      }
      
      // Refresh pending swaps (incoming requests) using getCurrentUser ID
      const incomingRequestsData = await loadIncomingRequests(currentUser.id);
      setIncomingRequests(incomingRequestsData);
      
      // Refresh accepted swaps count using getCurrentUser ID
      const { data: acceptedSwapsData, error: acceptedError } = await supabase
        .from('swap_requests')
        .select('id')
        .eq('accepter_id', currentUser.id)
        .eq('status', 'accepted');

      if (acceptedError) {
        console.error('Error refreshing accepted swaps:', acceptedError);
        return;
      }

      const acceptedSwapsCount = acceptedSwapsData?.length || 0;
      
      setStats(prev => ({
        ...prev,
        pendingSwaps: incomingRequestsData.length,
        acceptedSwaps: acceptedSwapsCount
      }));
      
    } catch (error) {
      console.error('Error refreshing dashboard stats:', error);
    }
  };

  const checkAuthAndLoadData = async () => {
    // This function is no longer needed since we use AuthContext
    // Keeping it for backward compatibility but it's not used
  }

  const loadIncomingRequests = async (userId: string) => {
    try {
      
      // EXACT SAME QUERY AS MANAGESWAPS
      const { data, error } = await supabase
        .from('swap_requests')
        .select(`
          *,
          requester_staff:staff!swap_requests_requester_id_fkey(*),
          requester_shift:shifts!swap_requests_requester_shift_id_fkey(*)
        `)
        .eq('accepter_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching incoming requests:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in loadIncomingRequests:', error);
      return [];
    }
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
      setShifts([])
      setStats(prev => ({ ...prev, totalShifts: 0, acceptedSwaps: 0 }))
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
          <Button
            variant={activeTab === 'team' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('team')}
            className={`flex-1 px-4 py-2 rounded-md transition-all duration-200 ${
              activeTab === 'team' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <Users className="h-4 w-4 mr-2" />
            Team
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
            onClick={() => hasProAccess ? navigate('/swaps/create') : navigate('/subscription')}
            variant="outline"
            className={`flex items-center justify-center h-16 border border-gray-300 font-medium rounded-lg transition-all duration-200 relative ${
              hasProAccess 
                ? 'hover:border-blue-500 hover:bg-blue-50' 
                : 'opacity-60 cursor-pointer hover:opacity-80'
            }`}
          >
            <ArrowRightLeft className="h-5 w-5 mr-2" />
            Request Swap
            {!hasProAccess && (
              <Lock className="h-4 w-4 ml-2 text-gray-500" />
            )}
          </Button>
          
          <Button
            onClick={() => hasProAccess ? navigate('/swaps') : navigate('/subscription')}
            variant="outline"
            className={`flex items-center justify-center h-16 border border-gray-300 font-medium rounded-lg transition-all duration-200 relative ${
              hasProAccess 
                ? 'hover:border-blue-500 hover:bg-blue-50' 
                : 'opacity-60 cursor-pointer hover:opacity-80'
            }`}
          >
            <ArrowRightLeft className="h-5 w-5 mr-2" />
            Manage Swaps
            {!hasProAccess && (
              <Lock className="h-4 w-4 ml-2 text-gray-500" />
            )}
          </Button>
        </div>

        {/* Mobile Sign Out Button */}
        <div className="md:hidden mb-6">
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'calendar' ? (
          <ShiftCalendar 
            onShiftClick={handleShiftClick}
            onCreateShift={() => navigate('/shifts/create')}
          />
        ) : activeTab === 'premiums' ? (
          <PremiumCalculator />
        ) : (
          <TeamView />
        )}

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