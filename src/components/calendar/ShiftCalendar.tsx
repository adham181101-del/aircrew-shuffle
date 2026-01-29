import { useState, useEffect, useMemo } from 'react'
import Calendar from 'react-calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getUserShifts, getShiftTimeOfDay, deleteShift, updateShiftTime, type Shift } from '@/lib/shifts'
import { useToast } from '@/hooks/use-toast'
import { getCurrentUser, type Staff } from '@/lib/auth'
import { useShifts, useInvalidateShifts } from '@/hooks/useShifts'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useLeaveDays } from '@/hooks/useLeaveDays'
import { profiler } from '@/lib/performance'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar as CalendarIcon, Plus, Clock, Plane } from 'lucide-react'
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

interface ShiftCalendarProps {
  onShiftClick?: (shift: Shift) => void
  onCreateShift?: () => void
}

export const ShiftCalendar = ({ onShiftClick, onCreateShift }: ShiftCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [shiftPendingDelete, setShiftPendingDelete] = useState<Shift | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [shiftPendingEdit, setShiftPendingEdit] = useState<Shift | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Performance profiling
  useEffect(() => {
    profiler.mark('ShiftCalendar rendered', 'render')
  }, [])

  // Use React Query hooks
  const { data: user } = useCurrentUser()
  const { data: shiftsData, isLoading: loading } = useShifts()
  const { data: leaveDays = [] } = useLeaveDays()
  const invalidateShifts = useInvalidateShifts()

  // Extract shifts from query result
  const shifts = useMemo(() => shiftsData?.shifts || [], [shiftsData])
  
  // Create a set of leave dates for quick lookup
  const leaveDatesSet = useMemo(() => 
    new Set(leaveDays.map(ld => ld.date)),
    [leaveDays]
  )

  // Function to refresh shifts (can be called from parent component)
  const refreshShifts = async () => {
    profiler.mark('ShiftCalendar refresh', 'fetch')
    await invalidateShifts.mutateAsync()
  }

  // Expose refresh function to parent component
  useEffect(() => {
    // @ts-ignore - Adding refreshShifts to window for parent access
    window.refreshCalendarShifts = refreshShifts
    return () => {
      // @ts-ignore
      delete window.refreshCalendarShifts
    }
  }, [invalidateShifts])

  const getShiftsForDate = (date: Date): Shift[] => {
    // Convert date to YYYY-MM-DD format to match database format
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
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
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    const isLeaveDay = leaveDatesSet.has(dateStr)

    return (
      <div className="flex flex-col items-center mt-1 space-y-1">
        {isLeaveDay && (
          <div className="w-full text-xs px-1 py-0.5 rounded bg-purple-100 border border-purple-300 text-purple-700 text-center flex items-center justify-center gap-1">
            <Plane className="h-3 w-3" />
            <span className="text-[9px] font-medium">Leave</span>
          </div>
        )}
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
              {/* Show full time with minutes on all devices */}
              <span className="font-medium text-[10px] leading-tight">{startTime}</span>
            </div>
          )
        })}
      </div>
    )
  }

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return ''
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    const dayShifts = getShiftsForDate(date)
    const isLeaveDay = leaveDatesSet.has(dateStr)
    
    const classes = []
    if (dayShifts.length > 0) classes.push('has-shifts')
    if (isLeaveDay) classes.push('has-leave')
    
    return classes.length > 0 ? classes.join(' ') + ' relative' : ''
  }

  if (loading && !shifts.length) {
    return (
      <Card className="bg-white shadow-lg border border-gray-100">
        <CardContent className="p-8">
          <Skeleton className="h-64 w-full" />
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
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-purple-500 shadow-sm border border-purple-300"></div>
                <span className="text-xs font-medium text-gray-700">Leave</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && selectedDateShifts.length > 0 && (
        <Card className="bg-white shadow-xl border border-gray-100">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
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
                  {selectedDateShifts.length} shift{selectedDateShifts.length > 1 ? 's' : ''} scheduled
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
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
                  await deleteShift(shiftPendingDelete.id, user!.id)
                  await invalidateShifts.mutateAsync()
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
                  await updateShiftTime(shiftPendingEdit.id, user!.id, time)
                  await invalidateShifts.mutateAsync()
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