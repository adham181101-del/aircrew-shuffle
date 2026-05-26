import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  getShiftTimeOfDay,
  deleteShift,
  normalizeTimeRange,
  updateShiftNote,
  updateShiftTimeAndNote,
  type Shift,
} from '@/lib/shifts'
import { useMatchMedia } from '@/hooks/useMatchMedia'
import { useToast } from '@/hooks/use-toast'
import { useShifts, useInvalidateShifts } from '@/hooks/useShifts'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useLeaveDays } from '@/hooks/useLeaveDays'
import { profiler } from '@/lib/performance'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar as CalendarIcon, Plus, Plane, StickyNote, ChevronLeft, ChevronRight, ChevronDown, ChevronsLeft, ChevronsRight, X, Pencil, Trash2 } from 'lucide-react'
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
import { MobileShiftCalendar } from './MobileShiftCalendar'
import {
  buildMonthGrid,
  formatDateStr,
  isToday,
  getDesktopShiftTileLabel,
  getShiftPaletteClass,
  splitShiftTimeRange,
  WEEKDAY_LABELS,
} from './calendarTileHelpers'

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
  const showMobileCalendar = useMatchMedia('(max-width: 768px)')
  const weekDays = [...WEEKDAY_LABELS]
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

  const monthGrid = useMemo(() => buildMonthGrid(currentMonth), [currentMonth])

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
      <Card className="bg-white shadow-lg border border-gray-100 max-md:rounded-none max-md:border-x-0 max-md:shadow-md">
        <CardContent className="p-8 max-md:px-3 max-md:py-6">
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
      <Card className="bg-white shadow-xl border border-slate-200 max-md:rounded-none max-md:border-x-0 max-md:shadow-md">
        <CardHeader className="bg-white border-b border-slate-200 rounded-t-2xl max-md:rounded-none max-md:px-3 max-md:pt-4 max-md:pb-3">
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
        
        <CardContent className="p-2 px-0 max-md:pt-2 max-md:pb-3 sm:p-6 sm:px-6 w-full max-w-full min-w-0 overflow-x-hidden">
          <div className={showMobileCalendar ? 'w-full max-w-full min-w-0 overflow-x-hidden' : 'calendar-container'}>
            {!showMobileCalendar && (
              <div className="mb-6 text-center px-1">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Your Shift Schedule</h3>
                <p className="text-base text-gray-600 leading-snug">
                  Tap a date to add a note, edit, or delete a shift
                </p>
              </div>
            )}

            {showMobileCalendar ? (
              <MobileShiftCalendar
                currentMonth={currentMonth}
                monthGrid={monthGrid}
                selectedDate={selectedDate}
                leaveDatesSet={leaveDatesSet}
                getShiftsForDate={getShiftsForDate}
                isSameDay={isSameDay}
                onDayClick={openDayActions}
                onPrevMonth={() =>
                  setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
                }
                onNextMonth={() =>
                  setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
                }
                onOpenMonthPicker={openMonthPicker}
              />
            ) : (
              <div className="calendar-shell">
                <div className="calendar-nav">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="calendar-nav-chevron shrink-0 h-9 w-9"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={openMonthPicker}
                    className="calendar-month-trigger font-semibold text-base px-4 min-w-0 flex flex-1 items-center justify-center gap-1 max-w-[min(100%,320px)]"
                  >
                    <span className="truncate text-center tracking-tight">
                      {currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 opacity-80" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="calendar-nav-chevron shrink-0 h-9 w-9"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-5 w-5" />
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
                    const dateStr = formatDateStr(cellDate)
                    const isLeaveDay = leaveDatesSet.has(dateStr)
                    const primaryShift = dayShifts[0]
                    const selected = isSameDay(selectedDate, cellDate)
                    const todayCell = isToday(cellDate)

                    return (
                      <button
                        type="button"
                        key={dateStr}
                        onClick={() => openDayActions(cellDate)}
                        className={`calendar-day-cell ${selected ? 'is-selected' : ''} ${todayCell ? 'is-today' : ''}`}
                      >
                        <div className="calendar-tile-content">
                          {primaryShift ? (
                            <div
                              className={`calendar-shift-card ${getShiftPaletteClass(getShiftTimeOfDay(primaryShift.time), primaryShift.is_swapped, primaryShift.time)}`}
                            >
                              <div className="calendar-shift-stack">
                                <span className="calendar-day-number">{cellDate.getDate()}</span>
                                <span className="calendar-shift-label">
                                  {getDesktopShiftTileLabel(primaryShift)}
                                </span>
                                <span className="calendar-shift-time">{primaryShift.time}</span>
                                {primaryShift.note && (
                                  <span className="calendar-shift-note-indicator">
                                    <StickyNote className="h-3 w-3" />
                                    Note
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : isLeaveDay ? (
                            <div className="calendar-leave-card">
                              <span className="calendar-day-number">{cellDate.getDate()}</span>
                              <Plane className="calendar-leave-plane" />
                              <span className="calendar-leave-word">Leave</span>
                            </div>
                          ) : (
                            <div className="calendar-off-card">
                              <span className="calendar-day-number">{cellDate.getDate()}</span>
                              <span className="calendar-off-word">OFF</span>
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {!showMobileCalendar && (
            <div className="mt-6 p-4 bg-gradient-to-r from-slate-50/90 to-blue-50/90 rounded-xl border border-slate-100/90">
              <h4 className="font-semibold text-gray-900 mb-3 text-center text-sm">Shift types</h4>
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
                <span className="text-xs font-medium text-gray-700">Long (&gt;16h)</span>
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
          )}

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
        <DialogContent className="z-[100] sm:max-w-md max-h-[90vh] overflow-y-auto">
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
                    const { start, end } = splitShiftTimeRange(focusedShift.time)
                    setEditStart(start)
                    setEditEnd(end ?? '')
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
        <DialogContent className="z-[100] sm:max-w-md">
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
        /*
         Desktop-only calendar visuals (viewport > 768).
         Mobile uses MobileShiftCalendar + mobile-shift-calendar.css — no overlapping rules below.
        */
        .calendar-shell {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .calendar-container {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .calendar-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 4px 0 8px;
        }

        .calendar-weekdays,
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .calendar-weekday-cell {
          text-align: center;
          font-size: 0.8rem;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.04em;
          padding: 10px 4px;
          text-transform: uppercase;
        }

        .calendar-empty-cell {
          border-radius: 14px;
          pointer-events: none;
          background: transparent;
          min-height: 104px;
        }

        .calendar-day-cell {
          min-height: 104px;
          border-radius: 14px;
          border: 1px solid #e8edf3;
          background: linear-gradient(180deg, #fbfcfd 0%, #f6f8fa 100%);
          text-align: center;
          transition: background-color 0.15s ease, border-color 0.15s ease;
          min-width: 0;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          padding: 6px;
        }

        .calendar-day-cell:hover {
          background: #eff3f8;
          border-color: #d1dae4;
        }

        .calendar-day-cell.is-selected {
          background: linear-gradient(180deg, #eff8ff 0%, #e0f2fe 100%);
          border-color: #7dd3fc;
          box-shadow: 0 0 0 1px rgba(14, 165, 233, 0.2);
        }

        .calendar-day-cell.is-today {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
          border-color: #3b82f6;
        }

        .calendar-day-cell.is-today.is-selected {
          outline: 2px solid #1d4ed8;
          outline-offset: 1px;
        }

        .calendar-tile-content {
          flex: 1;
          min-height: 0;
          width: 100%;
          min-width: 0;
          display: flex;
          align-items: stretch;
          justify-content: center;
          overflow: hidden;
        }

        .calendar-shift-stack {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 6px;
          width: 100%;
          min-width: 0;
          flex: 1;
          padding: 4px;
          box-sizing: border-box;
        }

        .calendar-shift-stack .calendar-day-number,
        .calendar-shift-stack .calendar-shift-label,
        .calendar-shift-stack .calendar-shift-time {
          margin: 0;
          padding: 0;
          writing-mode: horizontal-tb;
          text-orientation: mixed;
          word-break: normal;
          overflow-wrap: normal;
          min-width: 0;
        }

        .calendar-shift-stack .calendar-day-number {
          font-size: 1.15rem;
          font-weight: 800;
          line-height: 1.1;
        }

        .calendar-shift-stack .calendar-shift-label {
          font-size: 0.78rem;
          font-weight: 800;
          line-height: 1.25;
          max-width: 100%;
        }

        .calendar-shift-stack .calendar-shift-time {
          font-size: 0.8rem;
          font-weight: 700;
          line-height: 1.25;
          color: rgba(15, 23, 42, 0.9);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
          font-variant-numeric: tabular-nums;
        }

        .calendar-shift-card,
        .calendar-leave-card,
        .calendar-off-card {
          width: 100%;
          flex: 1;
          border-radius: 12px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 0;
          box-sizing: border-box;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
        }

        .calendar-shift-card {
          border: 1px solid rgba(51, 65, 85, 0.12);
        }

        .calendar-shift-note-indicator {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.65rem;
          font-weight: 600;
          opacity: 0.9;
        }

        .calendar-leave-plane {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
        }

        .calendar-leave-card {
          background: #f3e8ff;
          color: #5b2186;
          border: 1px solid #e9d5ff;
        }

        .calendar-leave-word {
          font-weight: 800;
          font-size: 0.75rem;
          white-space: nowrap;
        }

        .calendar-off-card {
          background: linear-gradient(180deg, #e8edf3 0%, #dfe5ec 100%);
          border: 1px solid rgba(148, 163, 184, 0.55);
        }

        .calendar-off-word {
          font-weight: 800;
          font-size: 0.8rem;
          letter-spacing: 0.1em;
        }

        .shift-morning { background: #c7f9ff; }
        .shift-afternoon { background: #bae6fd; }
        .shift-evening, .shift-night { background: #ddd6fe; }
        .shift-swapped { background: #bbf7d0; }
        .shift-double { background: #fecaca; }
        .shift-day { background: #bae6fd; }
        .legend-leave { background: #f3e8ff; }
        .legend-off { background: #e2e8f0; }

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
          padding: 0.5rem;
        }

        .month-picker-item {
          border: 1px solid #dbe3ef;
          border-radius: 10px;
          background: #f8fafc;
          font-weight: 600;
          padding: 0.75rem 0.5rem;
          text-align: center;
        }

        .month-picker-item:hover { background: #e2e8f0; }
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
        <DialogContent className="z-[100] sm:max-w-md max-h-[90vh] overflow-y-auto">
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
                const time = normalizeTimeRange(`${editStart}-${editEnd}`)
                if (!time) {
                  toast({
                    title: 'Invalid time format',
                    description: 'Use HH:MM for start and end (e.g. 05:30 and 14:30).',
                    variant: 'destructive',
                  })
                  return
                }
                setSaving(true)
                try {
                  const result = await updateShiftTimeAndNote(shiftPendingEdit.id, user!.id, time, editNote)
                  await invalidateShifts.mutateAsync()
                  if (result.noteSaved) {
                    toast({ title: 'Shift updated', description: 'The shift details were saved.' })
                  } else {
                    toast({
                      title: 'Shift time saved',
                      description:
                        result.noteSkippedReason ??
                        'Your note could not be saved until the database is updated.',
                      variant: 'destructive',
                    })
                  }
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