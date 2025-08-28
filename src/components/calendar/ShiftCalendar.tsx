import { useState, useEffect } from 'react'
import Calendar from 'react-calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getUserShifts, getShiftTimeOfDay, deleteShift, updateShiftTime, type Shift } from '@/lib/shifts'
import { useToast } from '@/hooks/use-toast'
import { getCurrentUser, type Staff } from '@/lib/auth'
import { Calendar as CalendarIcon, Plus } from 'lucide-react'
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
  const [shifts, setShifts] = useState<Shift[]>([])
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

  // Function to refresh shifts (can be called from parent component)
  const refreshShifts = async () => {
    if (user) {
      setLoading(true)
      try {
        const userShifts = await getUserShifts(user.id)
        setShifts(userShifts)
      } catch (error) {
        console.error('Error refreshing shifts:', error)
      } finally {
        setLoading(false)
      }
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

  const getShiftsForDate = (date: Date): Shift[] => {
    const dateStr = date.toLocaleDateString('en-CA') // YYYY-MM-DD format in local timezone
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
      case 'night':
        return 'bg-calendar-shift-evening' // Using existing evening color for night shifts
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
          const [startTime, endTime] = shift.time.split('-')
          
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
              title={`${startTime}-${endTime}`}
            >
              <span className="hidden sm:inline">{startTime}-{endTime}</span>
              <span className="sm:hidden">{startTime}</span>
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
              <span className="text-sm">Morning</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-calendar-shift-afternoon"></div>
              <span className="text-sm">Afternoon</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-calendar-shift-evening"></div>
              <span className="text-sm">Night</span>
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
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
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
                    <div className="flex items-center gap-2">
                      {onShiftClick && (
                        <Button size="sm" variant="outline" onClick={() => onShiftClick?.(shift)}>
                          Details
                        </Button>
                      )}
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
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setShiftPendingDelete(shift)
                          setDeleteOpen(true)
                        }}
                      >
                        Delete
                      </Button>
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