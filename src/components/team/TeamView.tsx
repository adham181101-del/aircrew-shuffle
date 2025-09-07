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
      const dayName = new Date(date).toLocaleDateString('en-GB', { 
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Team Overview</h2>
              <p className="text-gray-600">See who's working each day this month</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Month:</span>
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40 bg-white border-gray-200 rounded-lg">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date()
                  date.setMonth(date.getMonth() + i)
                  const monthValue = date.toISOString().slice(0, 7)
                  const monthLabel = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                  return (
                    <SelectItem key={monthValue} value={monthValue}>
                      {monthLabel}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading team data...</p>
          </div>
        </div>
      ) : teamData.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No team data available</h3>
          <p className="text-gray-600">Select a different month or check your shift data</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {teamData.map((dayTeam) => (
            <Card key={dayTeam.date} className="bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-900">{dayTeam.dayName}</CardTitle>
                      <p className="text-sm text-gray-600">
                        {dayTeam.totalMembers} team members • {dayTeam.teamMembers.filter(m => m.role === 'Working Today').length} working today
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 px-3 py-1">
                    {dayTeam.date}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                <div className="space-y-4">
                  {dayTeam.teamMembers.map((member) => {
                    if (member.role === 'location_header') {
                      return (
                        <div key={member.id} className="flex items-center space-x-3 py-2">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-blue-600" />
                              <h4 className="font-semibold text-blue-900 text-lg">{member.name}</h4>
                            </div>
                            <p className="text-sm text-blue-700 ml-6">{member.staffNumber}</p>
                          </div>
                        </div>
                      )
                    }

                    const isWorking = member.role === 'Working Today'
                    const isOffDuty = member.role === 'Off Duty'
                    
                    return (
                      <div key={member.id} className="flex items-center space-x-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-all duration-200 hover:shadow-sm">
                        <div className="flex-shrink-0">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            isWorking 
                              ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                              : isOffDuty 
                                ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                                : 'bg-gradient-to-br from-blue-500 to-purple-600'
                          }`}>
                            <span className="text-white font-semibold text-sm">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-gray-900 truncate">{member.name}</h4>
                            <Badge 
                              variant={isWorking ? "default" : "secondary"}
                              className={`${
                                isWorking 
                                  ? 'bg-green-100 text-green-800 border-green-200' 
                                  : 'bg-gray-100 text-gray-600 border-gray-200'
                              }`}
                            >
                              {isWorking ? '🟢 Working' : '⚪ Off Duty'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">Staff:</span>
                              <span className="font-mono">{member.staffNumber}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">Location:</span>
                              <span>{member.baseLocation}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">Status:</span>
                              <span className={isWorking ? 'text-green-700 font-medium' : 'text-gray-500'}>
                                {member.workingDetails}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {isWorking && (
                          <div className="flex-shrink-0">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          </div>
                        )}
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
