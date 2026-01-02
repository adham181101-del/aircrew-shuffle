import { useState, useEffect, useMemo } from 'react'
import Calendar from 'react-calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getUserShifts, getShiftTimeOfDay, deleteShift, updateShiftTime, type Shift } from '@/lib/shifts'
import { getMyLeaveDays, addLeaveDay, removeLeaveDay, type LeaveDay } from '@/lib/leave'
import { useToast } from '@/hooks/use-toast'
import { getCurrentUser, type Staff } from '@/lib/auth'
import { Calendar as CalendarIcon, Plus, Clock, Palmtree, DollarSign } from 'lucide-react'
import 'react-calendar/dist/Calendar.css'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Leave day premium amount (£17.24 per day as per aviation rules)
const LEAVE_DAY_PREMIUM = 17.24

interface ShiftCalendarProps {
  onShiftClick?: (shift: Shift) => void
  onCreateShift?: () => void
}

export const ShiftCalendar = ({ onShiftClick, onCreateShift }: ShiftCalendarProps) => {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [leaveDays, setLeaveDays] = useState<LeaveDay[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [user, setUser] = useState<Staff | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [shiftPendingDelete, setShiftPendingDelete] = useState<Shift | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [shiftPendingEdit, setShiftPendingEdit] = useState<Shift | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [saving, setSaving] = useState(false)
  const [togglingLeave, setTogglingLeave] = useState(false)
  const { toast } = useToast()

  // Set of leave day dates for quick lookup
  const leaveDaysSet = useMemo(() => new Set(leaveDays.map(l => l.date)), [leaveDays])

  useEffect(() => {
    loadUserAndShifts()
  }, [])

  const loadUserAndShifts = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) return

      setUser(currentUser)
      const [userShifts, userLeaveDays] = await Promise.all([
        getUserShifts(currentUser.id),
        getMyLeaveDays()
      ])
      setShifts(userShifts)
      setLeaveDays(userLeaveDays)
      
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

  // Function to refresh shifts (can be called from parent component)
  const refreshShifts = async () => {
    console.log('ShiftCalendar: refreshShifts called, user:', user?.id)
    if (user) {
      setLoading(true)
      try {
        console.log('ShiftCalendar: Fetching shifts for user:', user.id)
        const userShifts = await getUserShifts(user.id)
        console.log('ShiftCalendar: Fetched shifts:', userShifts.length)
        setShifts(userShifts)
      } catch (error) {
        console.error('Error refreshing shifts:', error)
      } finally {
        setLoading(false)
      }
    } else {
      console.log('ShiftCalendar: No user found for refresh')
    }
  }

  // Expose refresh function to parent component
  useEffect(() => {
    // @ts-ignore - Adding refreshShifts to window for parent access
    window.refreshCalendarShifts = refreshShifts
    return () => {
      // @ts-ignore
      delete window.refreshCalendarShifts
    }
  }, [user])

  const toDateStr = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getShiftsForDate = (date: Date): Shift[] => {
    const dateStr = toDateStr(date)
    return shifts.filter(shift => shift.date === dateStr)
  }

  const isLeaveDay = (date: Date): boolean => {
    return leaveDaysSet.has(toDateStr(date))
  }

  const toggleLeaveDay = async (date: Date) => {
    const dateStr = toDateStr(date)
    setTogglingLeave(true)
    try {
      if (leaveDaysSet.has(dateStr)) {
        // Remove leave day
        const ok = await removeLeaveDay(dateStr)
        if (ok) {
          setLeaveDays(prev => prev.filter(l => l.date !== dateStr))
          toast({ 
            title: 'Leave day removed', 
            description: `Removed leave for ${date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}` 
          })
        } else {
          toast({ title: 'Failed to remove leave day', variant: 'destructive' })
        }
      } else {
        // Add leave day
        const ok = await addLeaveDay(dateStr)
        if (ok) {
          // Refresh leave days to get the new entry with ID
          const updatedLeaveDays = await getMyLeaveDays()
          setLeaveDays(updatedLeaveDays)
          toast({ 
            title: 'Leave day added', 
            description: `Added leave for ${date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} (+£${LEAVE_DAY_PREMIUM.toFixed(2)} premium)` 
          })
        } else {
          toast({ title: 'Failed to add leave day', variant: 'destructive' })
        }
      }
    } catch (error) {
      console.error('Error toggling leave day:', error)
      toast({ title: 'Error updating leave day', variant: 'destructive' })
    } finally {
      setTogglingLeave(false)
    }
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

  const isDoubleShift = (timeRange: string): boolean => {
    return timeRange === '04:15-22:15'
  }

  const getShiftColorClass = (timeOfDay: string, isSwapped: boolean, timeRange: string) => {
    if (isSwapped) {
      return 'shift-swapped'
    }
    
    // Check for double shift first (4:15-22:15)
    if (isDoubleShift(timeRange)) {
      return 'shift-double'
    }
    
    switch (timeOfDay) {
      case 'morning':
        return 'shift-morning'
      case 'afternoon':
        return 'shift-afternoon'
      case 'evening':
        return 'shift-evening'
      default:
        return 'shift-day'
    }
  }

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null
    
    const dayShifts = getShiftsForDate(date)
    const isOnLeave = isLeaveDay(date)

    if (dayShifts.length === 0 && !isOnLeave) return null

    return (
      <div className="flex flex-col items-center mt-1 space-y-1">
        {/* Leave day indicator */}
        {isOnLeave && (
          <div 
            className="w-full text-xs px-1 py-1 rounded-lg text-center font-semibold bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm"
            title={`Leave Day (+£${LEAVE_DAY_PREMIUM.toFixed(2)})`}
          >
            <span className="font-medium text-[10px] leading-tight flex items-center justify-center gap-0.5">
              <Palmtree className="h-2.5 w-2.5" />
              Leave
            </span>
          </div>
        )}
        {/* Shift indicators */}
        {dayShifts.map((shift) => {
          const timeOfDay = getShiftTimeOfDay(shift.time)
          const [startTime, endTime] = shift.time.split('-')
          
          return (
            <div
              key={shift.id}
              className={`w-full text-xs px-1 py-1 rounded-lg text-center font-semibold cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105
                ${getShiftColorClass(timeOfDay, shift.is_swapped, shift.time)}
                ${shift.is_swapped ? 'text-white/90' : 'text-white'}
              `}
              onClick={(e) => {
                e.stopPropagation()
                onShiftClick?.(shift)
              }}
              title={`${startTime}-${endTime}`}
            >
              <span className="font-medium text-[10px] leading-tight">{startTime}</span>
            </div>
          )
        })}
      </div>
    )
  }

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return ''
    
    const dayShifts = getShiftsForDate(date)
    const isOnLeave = isLeaveDay(date)
    
    const classes: string[] = []
    if (dayShifts.length > 0) classes.push('has-shifts')
    if (isOnLeave) classes.push('is-leave-day')
    if (classes.length > 0) classes.push('relative')
    
    return classes.join(' ')
  }

  if (loading) {
    return (
      <Card className="bg-white shadow-lg border border-gray-100">
        <CardContent className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your shifts...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const selectedDateShifts = selectedDate ? getShiftsForDate(selectedDate) : []

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-xl border border-gray-100">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100 rounded-t-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-gray-900">Shift Calendar</CardTitle>
                <p className="text-gray-600">View and manage your scheduled shifts</p>
              </div>
            </div>
            {onCreateShift && (
              <Button 
                onClick={onCreateShift} 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Shift
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-4 sm:p-8">
          <div className="calendar-container">
            <div className="mb-4 sm:mb-6 text-center">
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">Your Shift Schedule</h3>
              <p className="text-sm sm:text-base text-gray-600">Click on any date to view shift details</p>
            </div>
            
            <div className="w-full overflow-x-auto">
              <Calendar
                onChange={(value) => setSelectedDate(value as Date)}
                value={selectedDate}
                tileContent={tileContent}
                tileClassName={tileClassName}
                className="react-calendar"
                minDetail="year"
                maxDetail="month"
                showNeighboringMonth={false}
                navigationLabel={({ date, view }) => {
                  if (view === 'month') {
                    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                  }
                  return date.toLocaleDateString('en-GB', { year: 'numeric' });
                }}
              />
            </div>
          </div>
          
          {/* Legend */}
          <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-3 text-center text-sm">Shift Types</h4>
            <div className="flex flex-wrap justify-center gap-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-cyan-500 shadow-sm"></div>
                <span className="text-xs font-medium text-gray-700">Morning</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-400 to-red-500 shadow-sm"></div>
                <span className="text-xs font-medium text-gray-700">Afternoon</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-700 shadow-sm"></div>
                <span className="text-xs font-medium text-gray-700">Night</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-600 to-red-700 shadow-sm"></div>
                <span className="text-xs font-medium text-gray-700">Double</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-sm"></div>
                <span className="text-xs font-medium text-gray-700">Swapped</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-sm"></div>
                <span className="text-xs font-medium text-gray-700">Leave</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details - Show when date is selected */}
      {selectedDate && (
        <Card className="bg-white shadow-xl border border-gray-100">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isLeaveDay(selectedDate) 
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500' 
                    : 'bg-gradient-to-br from-blue-500 to-purple-600'
                }`}>
                  {isLeaveDay(selectedDate) ? (
                    <Palmtree className="h-5 w-5 text-white" />
                  ) : (
                    <CalendarIcon className="h-5 w-5 text-white" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">
                    {selectedDate.toLocaleDateString('en-GB', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    {selectedDateShifts.length > 0 
                      ? `${selectedDateShifts.length} shift${selectedDateShifts.length > 1 ? 's' : ''} scheduled`
                      : 'No shifts scheduled'}
                    {isLeaveDay(selectedDate) && ' • On Leave'}
                  </p>
                </div>
              </div>
              
              {/* Toggle Leave Button */}
              <Button
                variant={isLeaveDay(selectedDate) ? "destructive" : "outline"}
                size="sm"
                onClick={() => toggleLeaveDay(selectedDate)}
                disabled={togglingLeave}
                className={isLeaveDay(selectedDate) 
                  ? "bg-amber-500 hover:bg-amber-600 text-white border-0"
                  : "border-amber-300 text-amber-700 hover:bg-amber-50"
                }
              >
                <Palmtree className="h-4 w-4 mr-2" />
                {togglingLeave 
                  ? 'Updating...' 
                  : isLeaveDay(selectedDate) 
                    ? 'Remove Leave' 
                    : 'Mark as Leave'
                }
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Leave Day Premium Info */}
            {isLeaveDay(selectedDate) && (
              <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-900">Leave Day Premium</h4>
                    <p className="text-sm text-amber-700">
                      This leave day adds <span className="font-bold">£{LEAVE_DAY_PREMIUM.toFixed(2)}</span> to your premium pay calculation
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Shifts for the day */}
            {selectedDateShifts.length > 0 ? (
              <div className="space-y-4">
              {selectedDateShifts.map((shift) => (
                <div 
                  key={shift.id} 
                  className="p-4 border-2 border-gray-100 rounded-xl hover:border-blue-200 transition-all duration-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getShiftColorClass(getShiftTimeOfDay(shift.time), shift.is_swapped, shift.time)}`}>
                        <Clock className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-lg">
                          {shift.time} Shift
                        </h4>
                        <p className="text-gray-600">
                          {getShiftTimeOfDay(shift.time).charAt(0).toUpperCase() + getShiftTimeOfDay(shift.time).slice(1)} • {shift.is_swapped ? 'Swapped' : 'Regular'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {shift.is_swapped && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                          Swapped
                        </Badge>
                      )}
                      <Badge variant="outline" className="border-blue-200 text-blue-700">
                        {shift.time}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      {onShiftClick && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => onShiftClick?.(shift)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          View Details
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShiftPendingEdit(shift)
                          const [s, e] = shift.time.split('-')
                          setEditStart(s)
                          setEditEnd(e)
                          setEditOpen(true)
                        }}
                        className="text-green-600 border-green-200 hover:bg-green-50"
                      >
                        Edit Shift
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setShiftPendingDelete(shift)
                          setDeleteOpen(true)
                        }}
                        className="text-white bg-red-600 border-red-600 hover:bg-red-700 hover:text-white"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No shifts scheduled for this day.</p>
                <p className="text-sm mt-1">You can mark this day as leave if needed.</p>
              </div>
            )}
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
          cursor: pointer;
          pointer-events: auto;
          z-index: 10;
          position: relative;
        }
        
        .calendar-container .react-calendar__navigation button:hover {
          background-color: hsl(var(--accent));
        }
        
        .calendar-container .react-calendar__navigation {
          position: relative;
          z-index: 10;
        }
        
        .calendar-container .react-calendar__navigation__label {
          cursor: pointer;
          pointer-events: auto;
          z-index: 10;
          position: relative;
        }
        
        .calendar-container .react-calendar__navigation__label:hover {
          background-color: hsl(var(--accent));
        }
        
        /* Ensure the month/year label is clickable */
        .calendar-container .react-calendar__navigation__label button {
          cursor: pointer;
          pointer-events: auto;
          z-index: 10;
          position: relative;
          background: none;
          border: none;
          font-size: 1rem;
          color: hsl(var(--foreground));
        }
        
        .calendar-container .react-calendar__navigation__label button:hover {
          background-color: hsl(var(--accent));
        }
        
        /* Remove any potential blocking elements */
        .calendar-container .react-calendar__navigation * {
          pointer-events: auto;
        }
        
        /* Style the month/year selection dropdown */
        .calendar-container .react-calendar__year-view__months__month,
        .calendar-container .react-calendar__decade-view__years__year {
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.375rem;
          transition: background-color 0.2s;
        }
        
        .calendar-container .react-calendar__year-view__months__month:hover,
        .calendar-container .react-calendar__decade-view__years__year:hover {
          background-color: hsl(var(--accent));
        }
        
        .calendar-container .react-calendar__year-view__months__month--active,
        .calendar-container .react-calendar__decade-view__years__year--active {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        
        /* Ensure dropdown views are properly styled */
        .calendar-container .react-calendar__year-view,
        .calendar-container .react-calendar__decade-view {
          padding: 1rem;
        }
        
        /* Fix mobile layout - prevent navigation from overlapping calendar */
        @media (max-width: 768px) {
          .calendar-container .react-calendar__navigation {
            margin-bottom: 1rem;
            padding: 0.5rem 0;
          }
          
          .calendar-container .react-calendar__navigation__label {
            font-size: 1.1rem;
            padding: 0.5rem;
            margin: 0.25rem 0;
          }
          
          .calendar-container .react-calendar__navigation button {
            padding: 0.5rem;
            margin: 0.25rem;
          }
          
          .calendar-container .react-calendar__month-view__weekdays {
            margin-top: 0.5rem;
          }
        }
      `}</style>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this shift?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected shift will be permanently removed from your calendar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={async () => {
                if (!shiftPendingDelete || !user) return
                setDeleting(true)
                try {
                  await deleteShift(shiftPendingDelete.id, user.id)
                  setShifts((prev) => prev.filter((s) => s.id !== shiftPendingDelete.id))
                  toast({ title: 'Shift deleted', description: 'The shift was removed from your calendar.' })
                } catch (error) {
                  toast({
                    title: 'Failed to delete shift',
                    description: error instanceof Error ? error.message : 'Please try again',
                    variant: 'destructive',
                  })
                } finally {
                  setDeleting(false)
                  setShiftPendingDelete(null)
                  setDeleteOpen(false)
                }
              }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Shift Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit shift time</DialogTitle>
            <DialogDescription>
              Update the start and end times for this shift (format HH:MM).
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Start</label>
              <input
                className="mt-1 w-full border rounded px-2 py-2 bg-background"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                placeholder="HH:MM"
              />
            </div>
            <div>
              <label className="text-sm">End</label>
              <input
                className="mt-1 w-full border rounded px-2 py-2 bg-background"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                placeholder="HH:MM"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!shiftPendingEdit || !user) return
                const time = `${editStart}-${editEnd}`
                setSaving(true)
                try {
                  const updated = await updateShiftTime(shiftPendingEdit.id, user.id, time)
                  setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
                  toast({ title: 'Shift updated', description: 'The shift time was saved.' })
                  setEditOpen(false)
                  setShiftPendingEdit(null)
                } catch (error) {
                  toast({
                    title: 'Failed to update shift',
                    description: error instanceof Error ? error.message : 'Please use HH:MM-HH:MM',
                    variant: 'destructive',
                  })
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}