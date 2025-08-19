import { useState, useEffect } from 'react'
import Calendar from 'react-calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getUserShifts, getShiftTimeOfDay, type Shift } from '@/lib/shifts'
import { useToast } from '@/hooks/use-toast'
import { getCurrentUser, type Staff } from '@/lib/auth'
import { Calendar as CalendarIcon, Plus } from 'lucide-react'
import 'react-calendar/dist/Calendar.css'

interface ShiftCalendarProps {
  onShiftClick?: (shift: Shift) => void
  onCreateShift?: () => void
}

export const ShiftCalendar = ({ onShiftClick, onCreateShift }: ShiftCalendarProps) => {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [user, setUser] = useState<Staff | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadUserAndShifts()
  }, [])

  const loadUserAndShifts = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) return

      setUser(currentUser)
      const userShifts = await getUserShifts(currentUser.id)
      setShifts(userShifts)
      
      if (userShifts.length === 0) {
        console.log('No shifts found for user:', currentUser.id)
      }
    } catch (error) {
      console.error('Error loading shifts:', error)
      toast({
        title: "Error loading shifts",
        description: error instanceof Error ? error.message : "Failed to load your shifts",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getShiftsForDate = (date: Date): Shift[] => {
    const dateStr = date.toISOString().split('T')[0]
    return shifts.filter(shift => shift.date === dateStr)
  }

  const getShiftBadgeVariant = (timeOfDay: string, isSwapped: boolean) => {
    if (isSwapped) return 'outline'
    
    switch (timeOfDay) {
      case 'morning':
        return 'default'
      case 'afternoon':
        return 'secondary'
      case 'evening':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getShiftColorClass = (timeOfDay: string, isSwapped: boolean) => {
    if (isSwapped) return 'bg-calendar-shift-swapped'
    
    switch (timeOfDay) {
      case 'morning':
        return 'bg-calendar-shift-morning'
      case 'afternoon':
        return 'bg-calendar-shift-afternoon'
      case 'evening':
        return 'bg-calendar-shift-evening'
      default:
        return 'bg-muted'
    }
  }

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null
    
    const dayShifts = getShiftsForDate(date)
    if (dayShifts.length === 0) return null

    return (
      <div className="flex flex-col items-center mt-1 space-y-1">
        {dayShifts.map((shift) => {
          const timeOfDay = getShiftTimeOfDay(shift.time)
          const startTime = shift.time.split('-')[0]
          
          return (
            <div
              key={shift.id}
              className={`w-full text-xs px-1 py-0.5 rounded text-center font-medium cursor-pointer
                ${getShiftColorClass(timeOfDay, shift.is_swapped)}
                ${shift.is_swapped ? 'text-foreground/70' : 'text-foreground'}
              `}
              onClick={(e) => {
                e.stopPropagation()
                onShiftClick?.(shift)
              }}
            >
              {startTime}
            </div>
          )
        })}
      </div>
    )
  }

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return ''
    
    const dayShifts = getShiftsForDate(date)
    if (dayShifts.length === 0) return ''
    
    return 'has-shifts'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const selectedDateShifts = selectedDate ? getShiftsForDate(selectedDate) : []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5" />
            <CardTitle>Shift Calendar</CardTitle>
          </div>
          {onCreateShift && (
            <Button onClick={onCreateShift} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Shift
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="calendar-container">
            <Calendar
              onChange={(value) => setSelectedDate(value as Date)}
              value={selectedDate}
              tileContent={tileContent}
              tileClassName={tileClassName}
              className="react-calendar"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-calendar-shift-morning"></div>
              <span className="text-sm">Morning (04:15)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-calendar-shift-afternoon"></div>
              <span className="text-sm">Afternoon (13:15)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-calendar-shift-evening"></div>
              <span className="text-sm">Evening</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-calendar-shift-swapped"></div>
              <span className="text-sm">Swapped</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedDate && selectedDateShifts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Shifts for {selectedDate.toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedDateShifts.map((shift) => {
                const timeOfDay = getShiftTimeOfDay(shift.time)
                return (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => onShiftClick?.(shift)}
                  >
                    <div className="flex items-center space-x-3">
                      <Badge variant={getShiftBadgeVariant(timeOfDay, shift.is_swapped)}>
                        {shift.time}
                      </Badge>
                      {shift.is_swapped && (
                        <span className="text-sm text-muted-foreground">
                          (Swapped)
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {shifts.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="space-y-4">
              <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-lg font-medium mb-2">No shifts found</p>
                <p className="text-muted-foreground mb-4">
                  You don't have any shifts in your calendar yet. Add shifts by uploading a roster PDF or creating them manually.
                </p>
                {onCreateShift && (
                  <Button onClick={onCreateShift} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Shift
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <style>{`
        .calendar-container .react-calendar {
          width: 100%;
          border: none;
          font-family: inherit;
        }
        
        .calendar-container .react-calendar__tile {
          position: relative;
          padding: 0.75rem 0.25rem;
          background: none;
          border: 1px solid hsl(var(--border));
          font-size: 0.875rem;
        }
        
        .calendar-container .react-calendar__tile:hover {
          background-color: hsl(var(--accent));
        }
        
        .calendar-container .react-calendar__tile--active {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        
        .calendar-container .react-calendar__tile.has-shifts {
          background-color: hsl(var(--muted));
        }
        
        .calendar-container .react-calendar__navigation button {
          font-size: 1rem;
          background: none;
          border: none;
          color: hsl(var(--foreground));
        }
        
        .calendar-container .react-calendar__navigation button:hover {
          background-color: hsl(var(--accent));
        }
      `}</style>
    </div>
  )
}