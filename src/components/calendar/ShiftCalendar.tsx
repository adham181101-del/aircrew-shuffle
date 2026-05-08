import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getShiftTimeOfDay, deleteShift, updateShiftNote, updateShiftTimeAndNote, type Shift } from '@/lib/shifts'
import { useToast } from '@/hooks/use-toast'
import { useShifts, useInvalidateShifts } from '@/hooks/useShifts'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useLeaveDays } from '@/hooks/useLeaveDays'
import { profiler } from '@/lib/performance'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar as CalendarIcon, Plus, Plane, StickyNote, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, Pencil, Trash2 } from 'lucide-react'
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
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [monthPickerYear, setMonthPickerYear] = useState(() => new Date().getFullYear())
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [shiftPendingDelete, setShiftPendingDelete] = useState<Shift | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [shiftPendingEdit, setShiftPendingEdit] = useState<Shift | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editNote, setEditNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [dayActionsOpen, setDayActionsOpen] = useState(false)
  const [focusedShiftIndex, setFocusedShiftIndex] = useState(0)
  const [noteOnlyOpen, setNoteOnlyOpen] = useState(false)
  const [shiftPendingNote, setShiftPendingNote] = useState<Shift | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const { toast } = useToast()
  const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

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
  const monthGrid = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0).getDate()
    const leadingEmptyCount = firstDay.getDay() // 0 = Sunday ... 6 = Saturday
    const cells: Array<Date | null> = []

    for (let i = 0; i < leadingEmptyCount; i++) cells.push(null)
    for (let day = 1; day <= lastDay; day++) cells.push(new Date(year, month, day))

    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [currentMonth])

  const isSameDay = (a: Date | null, b: Date | null) =>
    !!a &&
    !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  const openMonthPicker = () => {
    setMonthPickerYear(currentMonth.getFullYear())
    setMonthPickerOpen(true)
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
  const focusedShift =
    selectedDateShifts.length > 0
      ? selectedDateShifts[Math.min(focusedShiftIndex, selectedDateShifts.length - 1)]
      : null

  const openDayActions = (cellDate: Date) => {
    setSelectedDate(cellDate)
    setFocusedShiftIndex(0)
    setDayActionsOpen(true)
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-xl border border-slate-200">
        <CardHeader className="bg-white border-b border-slate-200 rounded-t-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-slate-900">Shift Calendar</CardTitle>
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
        
        <CardContent className="p-4 sm:p-6">
          <div className="calendar-container">
            <div className="mb-4 sm:mb-6 text-center">
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">Your Shift Schedule</h3>
              <p className="text-sm sm:text-base text-gray-600">Tap a date to add a note, edit, or delete a shift</p>
            </div>
            
            <div className="w-full">
              <div className="calendar-shell">
                <div className="calendar-nav">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" onClick={openMonthPicker} className="font-semibold text-base px-4">
                    {currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="calendar-weekdays">
                  {weekDays.map((weekday) => (
                    <div key={weekday} className="calendar-weekday-cell">
                      {weekday}
                    </div>
                  ))}
                </div>

                <div className="calendar-grid">
                  {monthGrid.map((cellDate, idx) => {
                    if (!cellDate) return <div key={`empty-${idx}`} className="calendar-empty-cell" />

                    const dayShifts = getShiftsForDate(cellDate)
                    const year = cellDate.getFullYear()
                    const month = String(cellDate.getMonth() + 1).padStart(2, '0')
                    const day = String(cellDate.getDate()).padStart(2, '0')
                    const dateStr = `${year}-${month}-${day}`
                    const isLeaveDay = leaveDatesSet.has(dateStr)
                    const primaryShift = dayShifts[0]
                    const selected = isSameDay(selectedDate, cellDate)

                    return (
                      <button
                        type="button"
                        key={dateStr}
                        onClick={() => openDayActions(cellDate)}
                        className={`calendar-day-cell ${selected ? 'is-selected' : ''}`}
                      >
                        <div className="calendar-tile-content">
                          {primaryShift ? (
                            <div
                              className={`calendar-shift-card ${getShiftColorClass(getShiftTimeOfDay(primaryShift.time), primaryShift.is_swapped, primaryShift.time)}`}
                            >
                              <div className="calendar-day-number">{cellDate.getDate()}</div>
                              <div className="calendar-shift-label">
                                {getShiftTimeOfDay(primaryShift.time).toUpperCase()}
                              </div>
                              <div className="calendar-shift-time">{primaryShift.time}</div>
                              {primaryShift.note && (
                                <div className="calendar-shift-note-indicator">
                                  <StickyNote className="h-3 w-3" />
                                  Note
                                </div>
                              )}
                            </div>
                          ) : isLeaveDay ? (
                            <div className="calendar-leave-card">
                              <span className="calendar-day-number">{cellDate.getDate()}</span>
                              <Plane className="h-3.5 w-3.5" />
                              <span>Leave</span>
                            </div>
                          ) : (
                            <div className="calendar-off-card">
                              <span className="calendar-day-number">{cellDate.getDate()}</span>
                              Off
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-3 text-center text-sm">Shift Types</h4>
            <div className="flex flex-wrap justify-center gap-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full shadow-sm shift-morning"></div>
                <span className="text-xs font-medium text-gray-700">Morning</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full shadow-sm shift-afternoon"></div>
                <span className="text-xs font-medium text-gray-700">Afternoon</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full shadow-sm shift-evening"></div>
                <span className="text-xs font-medium text-gray-700">Night</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full shadow-sm shift-double"></div>
                <span className="text-xs font-medium text-gray-700">Double</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full shadow-sm shift-swapped"></div>
                <span className="text-xs font-medium text-gray-700">Swapped</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full shadow-sm legend-leave border border-purple-300"></div>
                <span className="text-xs font-medium text-gray-700">Leave</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full shadow-sm legend-off border border-slate-300"></div>
                <span className="text-xs font-medium text-gray-700">Off</span>
              </div>
            </div>
          </div>

          {monthPickerOpen && (
            <div className="month-picker-overlay" role="dialog" aria-modal="true">
              <div className="month-picker-panel">
                <div className="month-picker-header">
                  <Button variant="ghost" size="icon" onClick={() => setMonthPickerYear((prev) => prev - 1)}>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-semibold text-lg">{monthPickerYear}</span>
                  <Button variant="ghost" size="icon" onClick={() => setMonthPickerYear((prev) => prev + 1)}>
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="month-picker-grid">
                  {monthNames.map((monthName, monthIndex) => (
                    <button
                      type="button"
                      key={monthName}
                      className={`month-picker-item ${
                        currentMonth.getFullYear() === monthPickerYear && currentMonth.getMonth() === monthIndex
                          ? 'is-active'
                          : ''
                      }`}
                      onClick={() => {
                        setCurrentMonth(new Date(monthPickerYear, monthIndex, 1))
                        setMonthPickerOpen(false)
                      }}
                    >
                      {monthName}
                    </button>
                  ))}
                </div>

                <div className="month-picker-footer">
                  <Button variant="outline" onClick={() => setMonthPickerOpen(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dayActionsOpen}
        onOpenChange={(open) => {
          setDayActionsOpen(open)
          if (!open) setFocusedShiftIndex(0)
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDate
                ? selectedDate.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'Shift'}
            </DialogTitle>
            <DialogDescription>
              {selectedDateShifts.length > 0
                ? selectedDateShifts.length === 1
                  ? 'Choose an action for this shift.'
                  : 'Multiple shifts this day — pick one, then choose an action.'
                : 'No shift on this date. Add one from the toolbar or upload a roster.'}
            </DialogDescription>
          </DialogHeader>

          {selectedDateShifts.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {selectedDateShifts.map((shift, idx) => (
                <Button
                  key={shift.id}
                  type="button"
                  variant={focusedShiftIndex === idx ? 'default' : 'outline'}
                  size="sm"
                  className={
                    focusedShiftIndex === idx
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : ''
                  }
                  onClick={() => setFocusedShiftIndex(idx)}
                >
                  {shift.time}
                </Button>
              ))}
            </div>
          )}

          {focusedShift && (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-1">
                <p className="text-sm font-semibold text-slate-900">{focusedShift.time}</p>
                <p className="text-xs text-slate-600 capitalize">
                  {getShiftTimeOfDay(focusedShift.time)} · {focusedShift.is_swapped ? 'Swapped' : 'Regular'}
                  {focusedShift.note ? ' · Has note' : ''}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-h-[3rem] py-3 justify-start gap-3 border-slate-200"
                  onClick={() => {
                    setShiftPendingNote(focusedShift)
                    setNoteDraft(focusedShift.note ?? '')
                    setDayActionsOpen(false)
                    setNoteOnlyOpen(true)
                  }}
                >
                  <StickyNote className="h-4 w-4 shrink-0 text-amber-600" />
                  <span className="text-left">
                    <span className="block font-semibold">{focusedShift.note ? 'Edit note' : 'Add note'}</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      e.g. colleague names covering or swap follow-up
                    </span>
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-h-[3rem] py-3 justify-start gap-3 border-slate-200"
                  onClick={() => {
                    setShiftPendingEdit(focusedShift)
                    const [s, e] = focusedShift.time.split('-')
                    setEditStart(s)
                    setEditEnd(e)
                    setEditNote(focusedShift.note ?? '')
                    setDayActionsOpen(false)
                    setEditOpen(true)
                  }}
                >
                  <Pencil className="h-4 w-4 shrink-0 text-blue-600" />
                  <span className="text-left">
                    <span className="block font-semibold">Edit shift</span>
                    <span className="block text-xs font-normal text-muted-foreground">Change times and note together</span>
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  className="h-auto min-h-[3rem] py-3 justify-start gap-3 bg-red-600 hover:bg-red-700 text-white hover:text-white"
                  onClick={() => {
                    setShiftPendingDelete(focusedShift)
                    setDayActionsOpen(false)
                    setDeleteOpen(true)
                  }}
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  <span className="text-left">
                    <span className="block font-semibold">Delete shift</span>
                    <span className="block text-xs font-normal opacity-90">Remove this shift from your calendar</span>
                  </span>
                </Button>

                {onShiftClick && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                    onClick={() => {
                      onShiftClick(focusedShift)
                      setDayActionsOpen(false)
                    }}
                  >
                    Create swap request for this shift →
                  </Button>
                )}
              </div>
            </>
          )}

          {selectedDateShifts.length === 0 && onCreateShift && (
            <div className="pt-2">
              <Button
                type="button"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                onClick={() => {
                  setDayActionsOpen(false)
                  onCreateShift()
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add shift
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={noteOnlyOpen}
        onOpenChange={(open) => {
          setNoteOnlyOpen(open)
          if (!open) setShiftPendingNote(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Note</DialogTitle>
            <DialogDescription>
              {shiftPendingNote
                ? `For ${shiftPendingNote.date} · ${shiftPendingNote.time}`
                : 'Saved on this shift'}
            </DialogDescription>
          </DialogHeader>
          <div>
            <label htmlFor="shift-note-draft" className="text-sm font-medium">
              Note
            </label>
            <Textarea
              id="shift-note-draft"
              className="mt-2 min-h-[120px]"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Who might cover this shift? Swap conversation notes…"
              disabled={!shiftPendingNote}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setNoteOnlyOpen(false)
                setShiftPendingNote(null)
              }}
              disabled={savingNote}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!shiftPendingNote || !user) return
                setSavingNote(true)
                try {
                  await updateShiftNote(shiftPendingNote.id, user.id, noteDraft)
                  await invalidateShifts.mutateAsync()
                  toast({ title: 'Note saved', description: 'Your shift note was updated.' })
                  setNoteOnlyOpen(false)
                  setShiftPendingNote(null)
                } catch (error) {
                  toast({
                    title: 'Could not save note',
                    description: error instanceof Error ? error.message : 'Try again.',
                    variant: 'destructive',
                  })
                } finally {
                  setSavingNote(false)
                }
              }}
              disabled={savingNote || !shiftPendingNote}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              {savingNote ? 'Saving…' : 'Save note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        .calendar-shell {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .calendar-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.25rem 0;
        }

        .calendar-weekdays,
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 0.35rem;
        }

        .calendar-weekday-cell {
          text-align: center;
          font-size: 0.78rem;
          font-weight: 700;
          color: #475569;
          letter-spacing: 0.02em;
          padding: 0.45rem 0.2rem;
          text-transform: uppercase;
        }

        .calendar-day-cell,
        .calendar-empty-cell {
          min-height: 104px;
          border-radius: 14px;
        }

        .calendar-day-cell {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 0.45rem;
          text-align: left;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }

        .calendar-day-cell:hover {
          background: #f1f5f9;
        }

        .calendar-day-cell.is-selected {
          background: #eff6ff;
          border-color: #93c5fd;
        }

        .calendar-empty-cell {
          background: transparent;
        }

        .calendar-tile-content {
          height: 100%;
          width: 100%;
          display: flex;
          align-items: stretch;
        }

        .calendar-shift-card,
        .calendar-leave-card,
        .calendar-off-card {
          width: 100%;
          border-radius: 12px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 3px;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
        }

        .calendar-shift-card {
          color: #0f172a;
          border: 1px solid rgba(30, 41, 59, 0.08);
          cursor: pointer;
          transition: transform 0.15s ease;
        }

        .calendar-shift-card:hover {
          transform: translateY(-1px);
        }

        .calendar-shift-label {
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.02em;
        }

        .calendar-day-number {
          font-size: 0.95rem;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 2px;
        }

        .calendar-shift-time {
          font-size: 0.78rem;
          font-weight: 600;
        }

        .calendar-shift-note-indicator {
          margin-top: 2px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.65rem;
          font-weight: 600;
          opacity: 0.85;
        }

        .calendar-leave-card {
          background: #f3e8ff;
          color: #6b21a8;
          border: 1px solid #d8b4fe;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .calendar-off-card {
          background: #e2e8f0;
          color: #475569;
          border: 1px solid #cbd5e1;
          align-items: center;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .calendar-container .react-calendar__month-view__days__day.has-shifts {
          background: transparent;
        }

        .calendar-container .react-calendar__month-view__days__day.has-leave:not(.has-shifts) {
          background: transparent;
        }

        .shift-morning {
          background: #c7f9ff;
        }

        .shift-afternoon {
          background: #bae6fd;
        }

        .shift-evening,
        .shift-night {
          background: #ddd6fe;
        }

        .shift-swapped {
          background: #bbf7d0;
        }

        .shift-double {
          background: #fecaca;
        }

        .shift-day {
          background: #bae6fd;
        }

        .legend-leave {
          background: #f3e8ff;
        }

        .legend-off {
          background: #e2e8f0;
        }

        .month-picker-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.35);
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .month-picker-panel {
          width: min(720px, 100%);
          max-height: min(85vh, 760px);
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 20px 45px rgba(15, 23, 42, 0.2);
          display: flex;
          flex-direction: column;
          padding: 1rem;
        }

        .month-picker-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .month-picker-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.75rem;
          align-content: center;
          justify-items: stretch;
          padding: 0.5rem;
        }

        .month-picker-item {
          border: 1px solid #dbe3ef;
          border-radius: 10px;
          background: #f8fafc;
          color: #1e293b;
          font-weight: 600;
          padding: 0.75rem 0.5rem;
          text-align: center;
          transition: all 0.15s ease;
        }

        .month-picker-item:hover {
          background: #e2e8f0;
        }

        .month-picker-item.is-active {
          border-color: #3b82f6;
          background: #dbeafe;
          color: #1d4ed8;
        }

        .month-picker-footer {
          margin-top: 0.75rem;
          display: flex;
          justify-content: center;
        }
        
        @media (max-width: 768px) {
          .calendar-weekday-cell {
            font-size: 0.68rem;
            padding-top: 0.25rem;
            padding-bottom: 0.25rem;
          }

          .calendar-day-cell,
          .calendar-empty-cell {
            min-height: 90px;
          }

          .calendar-day-cell {
            padding: 0.35rem;
          }

          .month-picker-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .month-picker-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
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
          <div>
            <label className="text-sm">Note (optional)</label>
            <Textarea
              className="mt-1 min-h-[90px]"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="Add a reminder for swap follow-up or colleague conversation"
            />
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
                  await updateShiftTimeAndNote(shiftPendingEdit.id, user!.id, time, editNote)
                  await invalidateShifts.mutateAsync()
                  toast({ title: 'Shift updated', description: 'The shift details were saved.' })
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