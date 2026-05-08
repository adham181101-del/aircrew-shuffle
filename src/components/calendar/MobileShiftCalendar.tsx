import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Shift } from '@/lib/shifts'

import {
  WEEKDAY_LABELS,
  formatDateStr,
  getMobileShiftAbbrevLine,
  splitShiftTimeRange,
  getMobileTilePalette,
  type MobileTilePalette,
} from './calendarTileHelpers'
import './mobile-shift-calendar.css'

const DAY_MODIFIER: Record<MobileTilePalette, string> = {
  morning: 'msc-day--morn',
  afternoon: 'msc-day--aftn',
  evening: 'msc-day--ngt',
  double: 'msc-day--long',
  swapped: 'msc-day--swap',
  leave: 'msc-day--leave',
  off: 'msc-day--off',
}

export interface MobileShiftCalendarProps {
  currentMonth: Date
  monthGrid: Array<Date | null>
  selectedDate: Date | null
  leaveDatesSet: Set<string>
  getShiftsForDate: (date: Date) => Shift[]
  isSameDay: (a: Date | null, b: Date | null) => boolean
  onDayClick: (date: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onOpenMonthPicker: () => void
}

export function MobileShiftCalendar({
  currentMonth,
  monthGrid,
  selectedDate,
  leaveDatesSet,
  getShiftsForDate,
  isSameDay,
  onDayClick,
  onPrevMonth,
  onNextMonth,
  onOpenMonthPicker,
}: MobileShiftCalendarProps) {
  return (
    <div className="msc-calendar-container">
      <p className="msc-intro text-xs text-slate-600 leading-snug">
        Tap a date to add a note, edit, or delete a shift.
      </p>

      <div className="msc-calendar-header">
        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={onPrevMonth} aria-label="Previous month">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onOpenMonthPicker}
          className="min-h-0 min-w-0 flex-1 justify-center px-2 py-1 gap-1"
        >
          <span className="msc-month-title inline-flex items-center justify-center gap-1 max-w-[min(100%,220px)]">
            <span className="truncate">{currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 opacity-80" aria-hidden />
          </span>
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={onNextMonth} aria-label="Next month">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="msc-weekdays">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d}>
            {d}
          </div>
        ))}
      </div>

      <div className="msc-grid">
        {monthGrid.map((cellDate, idx) => {
          if (!cellDate) {
            return <div key={`msc-e-${idx}`} className="msc-empty" aria-hidden />
          }

          const dateStr = formatDateStr(cellDate)
          const isLeave = leaveDatesSet.has(dateStr)
          const dayShifts = getShiftsForDate(cellDate)
          const primaryShift = dayShifts[0] ?? null
          const selected = isSameDay(selectedDate, cellDate)
          const paletteKey = getMobileTilePalette(primaryShift, isLeave)
          const modifier = DAY_MODIFIER[paletteKey]
          const timeParts = primaryShift ? splitShiftTimeRange(primaryShift.time) : null

          return (
            <button
              type="button"
              key={dateStr}
              className="msc-slotbtn"
              onClick={() => onDayClick(cellDate)}
              aria-label={
                primaryShift
                  ? `${dateStr}, shift ${primaryShift.time}`
                  : `${dateStr}, ${isLeave ? 'leave' : 'off'}`
              }
            >
              <div className={`msc-day ${modifier}${selected ? ' msc-day--selected' : ''}`}>
                <p className="msc-date">{cellDate.getDate()}</p>

                {primaryShift && timeParts && (
                  <>
                    <div className="msc-day-primary">
                      <p className="msc-shift">{getMobileShiftAbbrevLine(primaryShift)}</p>
                    </div>
                    <div className="msc-time-stack">
                      {timeParts.end ? (
                        <>
                          <span className="msc-time-line">
                            {timeParts.start}
                            <span className="msc-time-dash" aria-hidden>
                              -
                            </span>
                          </span>
                          <span className="msc-time-line">{timeParts.end}</span>
                        </>
                      ) : (
                        <span className="msc-time-line">{timeParts.start}</span>
                      )}
                    </div>
                    {primaryShift.note ? <span className="msc-note" aria-label="Has note" title="Note" /> : null}
                  </>
                )}

                {!primaryShift && isLeave && <p className="msc-shift msc-shift--solo">LV</p>}

                {!primaryShift && !isLeave && <p className="msc-shift msc-shift--solo">OFF</p>}
              </div>
            </button>
          )
        })}
      </div>

      <div className="msc-legend">
        <p className="msc-legend-title">Legend</p>
        <div className="msc-legend-row">
          <span className="msc-leg">
            <span className="msc-leg-pill msc-leg-pill--morn">MORN</span>
            <span className="msc-leg-name">Morning</span>
          </span>
          <span className="msc-leg">
            <span className="msc-leg-pill msc-leg-pill--aftn">AFTN</span>
            <span className="msc-leg-name">Afternoon</span>
          </span>
          <span className="msc-leg">
            <span className="msc-leg-pill msc-leg-pill--ngt">NGT</span>
            <span className="msc-leg-name">Night</span>
          </span>
          <span className="msc-leg">
            <span className="msc-leg-pill msc-leg-pill--off">OFF</span>
            <span className="msc-leg-name">Off</span>
          </span>
          <span className="msc-leg">
            <span className="msc-leg-pill msc-leg-pill--long">LONG</span>
            <span className="msc-leg-name">Long</span>
          </span>
          <span className="msc-leg">
            <span className="msc-leg-pill msc-leg-pill--swap">SWAP</span>
            <span className="msc-leg-name">Swapped</span>
          </span>
          <span className="msc-leg">
            <span className="msc-leg-pill msc-leg-pill--leave">LV</span>
            <span className="msc-leg-name">Leave</span>
          </span>
        </div>
      </div>
    </div>
  )
}
