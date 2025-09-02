import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getUserShifts, type Shift } from '@/lib/shifts'
import { getCurrentUser, getAllStaff, type Staff } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Users, Clock, MapPin } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface TeamMember {
  id: string
  name: string
  email: string
  staffNumber: string
  baseLocation: string
  shiftTime: string
  role?: 'Working Today' | 'Off Duty' | 'location_header'
  workingDetails?: string
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
    if (selectedMonth && allStaff.length > 0) {
      loadShiftsForMonth(selectedMonth)
    }
  }, [selectedMonth, allStaff])

  const loadShiftsForMonth = async (month: string) => {
    try {
      // Fetch all shifts for the selected month
      const { data: monthShifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .gte('date', month + '-01')
        .lt('date', month + '-32') // Get all shifts in the month
        .order('date', { ascending: true })

      if (shiftsError) {
        console.error('Error fetching shifts for month:', shiftsError)
        return
      }
      
      setShifts(monthShifts || [])
    } catch (error) {
      console.error('Error loading shifts for month:', error)
    }
  }

  // Regenerate team data when shifts change
  useEffect(() => {
    if (shifts.length > 0 && allStaff.length > 0) {
      generateTeamData()
    }
  }, [shifts, allStaff])

  const loadShifts = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      // Get all staff first
      const staffData = await getAllStaff()
      setAllStaff(staffData)
      
      // Get ALL shifts for the current month, not just user shifts
      const currentMonth = new Date().toISOString().slice(0, 7)
      setSelectedMonth(currentMonth)
      
      // Fetch all shifts for the current month
      const { data: allShifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .gte('date', currentMonth + '-01')
        .lt('date', currentMonth + '-32') // Get all shifts in the month
        .order('date', { ascending: true })

      if (shiftsError) {
        console.error('Error fetching shifts:', shiftsError)
        toast({
          title: "Error loading shifts",
          description: "Could not load shift data for team view",
          variant: "destructive"
        })
        return
      }
      
      setShifts(allShifts || [])
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

      // Group staff by base location for better organization
      const staffByLocation = allStaff.reduce((acc, staff) => {
        const location = staff.base_location || 'Unknown Location'
        if (!acc[location]) {
          acc[location] = []
        }
        acc[location].push(staff)
        return acc
      }, {} as Record<string, typeof allStaff>)

      // Create team members with location grouping
      const teamMembers: TeamMember[] = []
      
      Object.entries(staffByLocation).forEach(([location, locationStaff]) => {
        // Add location header
        if (locationStaff.length > 0) {
          teamMembers.push({
            id: `location-${location}`,
            name: `📍 ${location}`,
            email: '',
            staffNumber: `${locationStaff.length} staff`,
            baseLocation: location,
            shiftTime: '',
            role: 'location_header'
          })
        }

        // Add staff members for this location
        locationStaff.forEach((staffMember) => {
          const staffShift = dayShifts.find(shift => shift.staff_id === staffMember.id)
          const isWorkingToday = dayShifts.some(shift => shift.staff_id === staffMember.id)
          
          teamMembers.push({
            id: staffMember.id,
            name: staffMember.email?.split('@')[0] || `Staff Member`,
            email: staffMember.email,
            staffNumber: staffMember.staff_number,
            baseLocation: staffMember.base_location,
            shiftTime: staffShift ? staffShift.time : 'Off duty',
            role: isWorkingToday ? 'Working Today' : 'Off Duty',
            workingDetails: staffShift ? `${staffShift.time} shift` : 'No shifts scheduled'
          })
        })
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
                    const isLocationHeader = member.role === 'location_header'
                    
                    if (isLocationHeader) {
                      return (
                        <div 
                          key={member.id} 
                          className="bg-blue-50 dark:bg-blue-950/20 p-3 border border-blue-200 dark:border-blue-800 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="font-semibold text-blue-800 dark:text-blue-200">{member.name}</p>
                              <p className="text-sm text-blue-600 dark:text-blue-300">{member.staffNumber}</p>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    
                    return (
                      <div 
                        key={member.id} 
                        className={`flex items-center justify-between p-3 border rounded-lg ${
                          isWorking ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isWorking ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'
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
                               isWorking ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'
                             }`}>
                               {member.shiftTime}
                             </span>
                           </div>
                           <div className="flex items-center gap-2">
                             <MapPin className="h-4 w-4 text-muted-foreground" />
                             <span className="text-sm text-muted-foreground">{member.baseLocation}</span>
                           </div>
                           {isWorking && (
                             <Badge variant="default" className="mt-1 bg-green-600 dark:bg-green-500">
                               Working Today
                             </Badge>
                           )}
                           {member.workingDetails && (
                             <p className={`text-xs mt-1 ${
                               isWorking ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                             }`}>
                               {member.workingDetails}
                             </p>
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
