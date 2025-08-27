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
  Trash2
} from 'lucide-react'
import { PremiumCalculator } from '@/components/premium/PremiumCalculator'
import { TeamView } from '@/components/team/TeamView'
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

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  const checkAuthAndLoadData = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        navigate('/login')
        return
      }

      // User is managed by AuthContext
      
      const userShifts = await getUserShifts(currentUser.id)
      setShifts(userShifts)
      
      setStats({
        totalShifts: userShifts.length,
        pendingSwaps: 0, // TODO: Implement swap request counting
        acceptedSwaps: userShifts.filter(s => s.is_swapped).length
      })
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-gradient-primary">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <Building2 className="text-lg text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{user?.company?.name || 'Company'}</h1>
                <p className="text-white/80 text-sm">
                  Welcome back, {user?.email?.split('@')[0] || 'User'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {user?.company?.industry || 'Aviation'}
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {user?.base_location}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-white hover:bg-white/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalShifts}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Swaps</CardTitle>
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingSwaps}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Swaps</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.acceptedSwaps}</div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg max-w-lg">
          <Button
            variant={activeTab === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('calendar')}
            className="flex-1"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Button>
          <Button
            variant={activeTab === 'premiums' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('premiums')}
            className="flex-1"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Premiums
          </Button>
          <Button
            variant={activeTab === 'team' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('team')}
            className="flex-1"
          >
            <Users className="h-4 w-4 mr-2" />
            Team
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Button
            onClick={() => navigate('/upload')}
            className="flex items-center justify-center h-16 bg-gradient-secondary hover:opacity-90"
          >
            <Upload className="h-5 w-5 mr-2" />
            Upload Roster PDF
          </Button>
          
          <Button
            onClick={() => navigate('/shifts/create')}
            variant="outline"
            className="flex items-center justify-center h-16"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Manual Shift
          </Button>
          
          <Button
            onClick={() => navigate('/swaps/create')}
            variant="outline"
            className="flex items-center justify-center h-16"
          >
            <ArrowRightLeft className="h-5 w-5 mr-2" />
            Request Swap
          </Button>
          
          <Button
            onClick={() => navigate('/swaps')}
            variant="outline"
            className="flex items-center justify-center h-16"
          >
            <ArrowRightLeft className="h-5 w-5 mr-2" />
            Manage Swaps
          </Button>

          <Button
            onClick={() => setDeleteAllDialogOpen(true)}
            variant="destructive"
            className="flex items-center justify-center h-16"
            disabled={stats.totalShifts === 0}
          >
            <Trash2 className="h-5 w-5 mr-2" />
            Delete All Shifts
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