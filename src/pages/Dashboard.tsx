import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShiftCalendar } from '@/components/calendar/ShiftCalendar'
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
  RefreshCw
} from 'lucide-react'
import { PremiumCalculator } from '@/components/premium/PremiumCalculator'
import { TeamView } from '@/components/team/TeamView'
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
  const [pendingSwaps, setPendingSwaps] = useState<any[]>([])

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      const userShifts = await getUserShifts(user.id)
      setShifts(userShifts)
      
      // Fetch pending swap requests (incoming requests)
      const pendingSwapsData = await fetchPendingSwaps(user.id)
      setPendingSwaps(pendingSwapsData)
      
      // Fetch accepted swaps count from swap_requests table
      const { data: acceptedSwapsData, error: acceptedError } = await supabase
        .from('swap_requests')
        .select('id')
        .eq('accepter_id', user.id)
        .eq('status', 'accepted');

      if (acceptedError) {
        console.error('Error fetching accepted swaps:', acceptedError);
      }

      const acceptedSwapsCount = acceptedSwapsData?.length || 0;
      
      // Update stats after all data is fetched
      const newStats = {
        totalShifts: userShifts.length,
        pendingSwaps: pendingSwapsData.length, // This is incoming requests
        acceptedSwaps: acceptedSwapsCount // This is properly counted accepted swaps
      };
      
      setStats(newStats);
      
      console.log('Dashboard stats updated:', {
        totalShifts: userShifts.length,
        incomingRequests: pendingSwapsData.length,
        acceptedSwaps: acceptedSwapsCount
      });
      console.log('New stats object:', newStats);

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
      // Refresh pending swaps (incoming requests)
      const pendingSwapsData = await fetchPendingSwaps(user.id);
      setPendingSwaps(pendingSwapsData);
      
      // Refresh accepted swaps count
      const { data: acceptedSwapsData, error: acceptedError } = await supabase
        .from('swap_requests')
        .select('id')
        .eq('accepter_id', user.id)
        .eq('status', 'accepted');

      if (acceptedError) {
        console.error('Error refreshing accepted swaps:', acceptedError);
        return;
      }

      const acceptedSwapsCount = acceptedSwapsData?.length || 0;
      
      setStats(prev => ({
        ...prev,
        pendingSwaps: pendingSwapsData.length,
        acceptedSwaps: acceptedSwapsCount
      }));
      
      console.log('Dashboard stats refreshed:', {
        incomingRequests: pendingSwapsData.length,
        acceptedSwaps: acceptedSwapsCount
      });
      
    } catch (error) {
      console.error('Error refreshing dashboard stats:', error);
    }
  };

  const checkAuthAndLoadData = async () => {
    // This function is no longer needed since we use AuthContext
    // Keeping it for backward compatibility but it's not used
  }

  const fetchPendingSwaps = async (userId: string) => {
    try {
      console.log('=== FETCHING INCOMING REQUESTS ===');
      console.log('User ID:', userId);
      
      // Use the EXACT same query as ManageSwaps to see if it works
      const { data: incomingData, error: incomingError } = await supabase
        .from('swap_requests')
        .select(`
          *,
          requester_staff:staff!swap_requests_requester_id_fkey(*),
          requester_shift:shifts!swap_requests_requester_shift_id_fkey(*)
        `)
        .eq('accepter_id', userId)
        .order('created_at', { ascending: false });

      console.log('Supabase query result (using ManageSwaps query):');
      console.log('  - Data:', incomingData);
      console.log('  - Error:', incomingError);
      console.log('  - Data length:', incomingData?.length || 0);

      if (incomingError) {
        console.error('Error fetching incoming pending swaps:', incomingError);
        return [];
      }

      // Let's also check if there are ANY swap requests for this user
      const { data: allSwapsForUser, error: allSwapsError } = await supabase
        .from('swap_requests')
        .select('id, status, accepter_id, requester_id')
        .or(`accepter_id.eq.${userId},requester_id.eq.${userId}`);

      console.log('All swaps for user (as accepter OR requester):');
      console.log('  - Data:', allSwapsForUser);
      console.log('  - Error:', allSwapsError);
      console.log('  - Total swaps found:', allSwapsForUser?.length || 0);

      if (allSwapsForUser && allSwapsForUser.length > 0) {
        console.log('Breakdown of swaps:');
        allSwapsForUser.forEach((swap, index) => {
          console.log(`  Swap ${index + 1}:`, {
            id: swap.id,
            status: swap.status,
            accepter_id: swap.accepter_id,
            requester_id: swap.requester_id,
            isUserAccepter: swap.accepter_id === userId,
            isUserRequester: swap.requester_id === userId
          });
        });
      }

      // Now filter for only pending requests (like the original query intended)
      const pendingIncomingData = incomingData?.filter(swap => swap.status === 'pending') || [];
      console.log('Filtered pending incoming data:', pendingIncomingData);
      console.log('Pending incoming swaps found:', pendingIncomingData.length);

      console.log('Raw incoming data:', incomingData);
      console.log('Incoming pending swaps found:', pendingIncomingData.length);
      
      if (pendingIncomingData && pendingIncomingData.length > 0) {
        console.log('Sample pending incoming request:', {
          id: pendingIncomingData[0].id,
          requester_id: pendingIncomingData[0].requester_id,
          accepter_id: pendingIncomingData[0].accepter_id,
          status: pendingIncomingData[0].status,
          requester_staff: pendingIncomingData[0].requester_staff
        });
      }
      
      return pendingIncomingData;
    } catch (error) {
      console.error('Error in fetchPendingSwaps:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 shadow-xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-2xl font-bold text-white">{user?.company?.name || 'Company'}</h1>
                <p className="text-white/80 text-base">
                  Welcome back, <span className="font-semibold">{user?.email?.split('@')[0] || 'User'}</span>
                </p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-lg font-bold text-white">{user?.company?.name || 'Company'}</h1>
                <p className="text-white/80 text-xs">
                  {user?.email?.split('@')[0] || 'User'}
                </p>
              </div>
            </div>
            
            {/* Desktop Header Actions */}
            <div className="hidden md:flex items-center space-x-3">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 px-3 py-1">
                {user?.company?.industry || 'Aviation'}
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 px-3 py-1">
                {user?.base_location}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/profile')}
                className="text-white hover:bg-white/20 px-4 py-2"
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-white hover:bg-white/20 px-4 py-2"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>

            {/* Mobile Header Actions */}
            <div className="md:hidden flex items-center space-x-2">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                {user?.base_location}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 p-2"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>



      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Refresh Button */}
        <div className="flex justify-end mb-4">
          <Button
            onClick={refreshDashboardStats}
            variant="outline"
            size="sm"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Stats
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-blue-800">Total Shifts</CardTitle>
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{stats.totalShifts}</div>
              <p className="text-xs text-blue-600 mt-1">This month</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-purple-800">Incoming Requests</CardTitle>
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <ArrowRightLeft className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">{stats.pendingSwaps}</div>
              <p className="text-xs text-purple-600 mt-1">Awaiting review</p>
              {/* Debug info */}
              <div className="text-xs text-purple-500 mt-1">
                Debug: stats.pendingSwaps = {stats.pendingSwaps} | pendingSwaps.length = {pendingSwaps.length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-green-800">Completed Swaps</CardTitle>
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">{stats.acceptedSwaps}</div>
              <p className="text-xs text-green-600 mt-1">Successfully completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Notification Bar for Incoming Requests */}
        {pendingSwaps.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 mb-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                <span className="text-amber-800 font-semibold">Incoming Swap Requests</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-amber-700">Requests to Review:</span>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                    {pendingSwaps.length}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Quick Action Buttons */}
            <div className="mt-3 pt-3 border-t border-amber-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-700">
                  You have {pendingSwaps.length} incoming swap request{pendingSwaps.length > 1 ? 's' : ''} waiting for your response
                </span>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => navigate('/swaps')}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2"
                  >
                    Review All
                  </Button>
                  {pendingSwaps.length === 1 && (
                    <Button
                      onClick={() => navigate('/swaps')}
                      size="sm"
                      variant="outline"
                      className="border-amber-300 text-amber-700 hover:bg-amber-100 px-4 py-2"
                    >
                      Quick Review
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Show details for single request */}
              {pendingSwaps.length === 1 && (
                <div className="mt-2 text-xs text-amber-600">
                  From: {pendingSwaps[0].requester_staff?.staff_number || 'Staff Member'} • 
                  Date: {pendingSwaps[0].requester_shift?.date || 'Unknown'} • 
                  Time: {pendingSwaps[0].requester_shift?.time || 'Unknown'}
                </div>
              )}
              
              {/* Show summary for multiple requests */}
              {pendingSwaps.length > 1 && (
                <div className="mt-2 text-xs text-amber-600">
                  From {pendingSwaps.length} different crew members • 
                  Various dates and times
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="dashboard-nav-tabs flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-8 bg-white p-2 rounded-2xl shadow-lg w-full max-w-lg border border-gray-100">
          <Button
            variant={activeTab === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('calendar')}
            className={`w-full sm:flex-1 px-4 sm:px-6 py-3 rounded-xl transition-all duration-300 ${
              activeTab === 'calendar' 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                : 'hover:bg-gray-100'
            }`}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Button>
          <Button
            variant={activeTab === 'premiums' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('premiums')}
            className={`w-full sm:flex-1 px-4 sm:px-6 py-3 rounded-xl transition-all duration-300 ${
              activeTab === 'premiums' 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                : 'hover:bg-gray-100'
            }`}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Premiums
          </Button>
          <Button
            variant={activeTab === 'team' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('team')}
            className={`w-full sm:flex-1 px-4 sm:px-6 py-3 rounded-xl transition-all duration-300 ${
              activeTab === 'team' 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                : 'hover:bg-gray-100'
            }`}
          >
            <Users className="h-4 w-4 mr-2" />
            Team
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Button
            onClick={() => navigate('/upload')}
            className="flex items-center justify-center h-20 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <Upload className="h-6 w-6 mr-2" />
            Upload Roster PDF
          </Button>
          
          <Button
            onClick={() => navigate('/shifts/create')}
            variant="outline"
            className="flex items-center justify-center h-20 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105"
          >
            <Plus className="h-6 w-6 mr-2" />
            Add Manual Shift
          </Button>
          
          <Button
            onClick={() => navigate('/swaps/create')}
            variant="outline"
            className="flex items-center justify-center h-20 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105"
          >
            <ArrowRightLeft className="h-6 w-6 mr-2" />
            Request Swap
          </Button>
          
          <Button
            onClick={() => navigate('/swaps')}
            variant="outline"
            className="flex items-center justify-center h-20 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105"
          >
            <ArrowRightLeft className="h-6 w-6 mr-2" />
            Manage Swaps
          </Button>

          <Button
            onClick={() => setDeleteAllDialogOpen(true)}
            variant="destructive"
            className="flex items-center justify-center h-20 border-2 border-red-200 hover:border-red-300 hover:bg-red-600 hover:text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105"
            disabled={stats.totalShifts === 0}
          >
            <Trash2 className="h-6 w-6 mr-2" />
            Delete All Shifts
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