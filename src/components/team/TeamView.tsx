import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getUserShifts, type Shift } from '@/lib/shifts'
import { getCurrentUser, getAllStaff, type Staff } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Users, Clock, MapPin } from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  email: string
  staffNumber: string
  baseLocation: string
  shiftTime: string
  role?: string
}

interface DayTeam {
  date: string
  dayName: string
  teamMembers: TeamMember[]
  totalMembers: number
}

export const TeamView = () => {
  const { toast } = useToast()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [allStaff, setAllStaff] = useState<Staff[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [teamData, setTeamData] = useState<DayTeam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadShifts()
  }, [])

  useEffect(() => {
    if (selectedMonth && shifts.length > 0 && allStaff.length > 0) {
      generateTeamData()
    }
  }, [selectedMonth, shifts, allStaff])

  const loadShifts = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      const [userShifts, staffData] = await Promise.all([
        getUserShifts(user.id),
        getAllStaff()
      ])
      
      setShifts(userShifts)
      setAllStaff(staffData)
      
      // Auto-select current month
      const currentMonth = new Date().toISOString().slice(0, 7)
      setSelectedMonth(currentMonth)
    } catch (error) {
      toast({
        title: "Error loading data",
        description: "Could not load shift and staff data for team view",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const generateTeamData = () => {
    if (!selectedMonth || shifts.length === 0 || allStaff.length === 0) return

    // Get current date (start of day)
    const currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    // Filter shifts for selected month and only current/future dates
    const monthShifts = shifts.filter(shift => {
      const shiftDate = new Date(shift.date)
      shiftDate.setHours(0, 0, 0, 0)
      return shift.date.startsWith(selectedMonth) && shiftDate >= currentDate
    })

    // Group shifts by date
    const shiftsByDate = monthShifts.reduce((acc, shift) => {
      const date = shift.date
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(shift)
      return acc
    }, {} as Record<string, Shift[]>)

    // Create team data for each day
    const teamDataArray: DayTeam[] = Object.entries(shiftsByDate).map(([date, dayShifts]) => {
      const dayName = new Date(date).toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      })

      // Show all staff members, highlighting those working on this day
      const staffIdsOnThisDay = dayShifts.map(shift => shift.staff_id)
      const teamMembers: TeamMember[] = allStaff.map((staffMember, index) => {
        // Find the shift for this staff member
        const staffShift = dayShifts.find(shift => shift.staff_id === staffMember.id)
        const isWorkingToday = staffIdsOnThisDay.includes(staffMember.id)
        
        return {
          id: staffMember.id,
          name: staffMember.email?.split('@')[0] || `Staff ${index + 1}`,
          email: staffMember.email,
          staffNumber: staffMember.staff_number,
          baseLocation: staffMember.base_location,
          shiftTime: staffShift ? staffShift.time : 'Off duty',
          role: isWorkingToday ? 'Working Today' : 'Off Duty'
        }
      })

      const workingToday = teamMembers.filter(member => member.role === 'Working Today').length
      
      return {
        date,
        dayName,
        teamMembers,
        totalMembers: workingToday
      }
    })

    // Sort by date
    teamDataArray.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    setTeamData(teamDataArray)
  }

  const getMonthOptions = () => {
    const months = new Set(shifts.map(shift => shift.date.slice(0, 7)))
    return Array.from(months).sort().reverse()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Schedule</h2>
          <p className="text-muted-foreground">See who you're working with each day</p>
          <p className="text-xs text-muted-foreground mt-1">Showing current and future dates only</p>
        </div>
        
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {getMonthOptions().map(month => (
              <SelectItem key={month} value={month}>
                {new Date(month + '-01').toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long' 
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Team Data */}
      {teamData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Team Data</h3>
            <p className="text-muted-foreground text-center">
              {selectedMonth 
                ? "No future shifts found for this month. The team schedule only shows current and upcoming dates."
                : "Select a month to view team schedule."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {teamData.map((day) => (
            <Card key={day.date}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {day.dayName}
                  </CardTitle>
                  <Badge variant="secondary">
                    {day.totalMembers} {day.totalMembers === 1 ? 'member' : 'members'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                                     {day.teamMembers.map((member) => {
                     const isWorking = member.role === 'Working Today'
                     return (
                       <div 
                         key={member.id} 
                         className={`flex items-center justify-between p-3 border rounded-lg ${
                           isWorking ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                         }`}
                       >
                         <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                             isWorking ? 'bg-green-100' : 'bg-gray-100'
                           }`}>
                             <Users className={`h-5 w-5 ${isWorking ? 'text-green-600' : 'text-gray-500'}`} />
                           </div>
                           <div>
                             <p className="font-medium">{member.name}</p>
                             <p className="text-sm text-muted-foreground">{member.staffNumber}</p>
                           </div>
                         </div>
                         <div className="text-right">
                           <div className="flex items-center gap-2 mb-1">
                             <Clock className="h-4 w-4 text-muted-foreground" />
                             <span className={`text-sm font-medium ${
                               isWorking ? 'text-green-700' : 'text-gray-500'
                             }`}>
                               {member.shiftTime}
                             </span>
                           </div>
                           <div className="flex items-center gap-2">
                             <MapPin className="h-4 w-4 text-muted-foreground" />
                             <span className="text-sm text-muted-foreground">{member.baseLocation}</span>
                           </div>
                           {isWorking && (
                             <Badge variant="default" className="mt-1 bg-green-600">
                               Working Today
                             </Badge>
                           )}
                         </div>
                       </div>
                     )
                   })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
