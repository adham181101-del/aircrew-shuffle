import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShiftCalendar } from '@/components/calendar/ShiftCalendar'
import { getUserShifts, type Shift } from '@/lib/shifts'
import { getCurrentUser, signOut, type Staff } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { 
  Calendar, 
  Users, 
  Upload, 
  Settings, 
  LogOut,
  Plus,
  ArrowRightLeft,
  DollarSign
} from 'lucide-react'
import { PremiumCalculator } from '@/components/premium/PremiumCalculator'

const Dashboard = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [user, setUser] = useState<Staff | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [activeTab, setActiveTab] = useState<'calendar' | 'premiums'>('calendar')
  const [stats, setStats] = useState({
    totalShifts: 0,
    pendingSwaps: 0,
    acceptedSwaps: 0
  })
  const [loading, setLoading] = useState(true)

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

      setUser(currentUser)
      
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
      navigate('/login')
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
                <span className="text-xl">✈️</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Crew Management</h1>
                <p className="text-white/80 text-sm">
                  Welcome back, {user?.email.split('@')[0]}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
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
        <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg max-w-md">
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
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
        </div>

        {/* Content based on active tab */}
        {activeTab === 'calendar' ? (
          <ShiftCalendar 
            onShiftClick={handleShiftClick}
            onCreateShift={() => navigate('/shifts/create')}
          />
        ) : (
          <PremiumCalculator />
        )}
      </main>
    </div>
  )
}

export default Dashboard