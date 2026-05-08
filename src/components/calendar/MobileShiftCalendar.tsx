import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronLeft, ChevronRight, Plane } from 'lucide-react'
import type { Shift } from '@/lib/shifts'

import {
  WEEKDAY_LABELS,
  formatDateStr,
  getMobileShiftAbbrevLine,
  getMobileTilePalette,
} from './calendarTileHelpers'
import './mobile-shift-calendar.css'

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
    <div className="msc-root">
      <div className="msc-intro">
        <p className="text-xs text-slate-600 leading-snug">Tap a date to add a note, edit, or delete a shift.</p>
      </div>

      <div className="msc-nav">
        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={onPrevMonth} aria-label="Previous month">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onOpenMonthPicker}
          className="min-w-0 flex-1 justify-center gap-1 px-2 font-semibold text-[15px]"
        >
          <span className="truncate">{currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 opacity-85" aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={onNextMonth} aria-label="Next month">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="msc-weekdays" aria-hidden="false">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="msc-weekday-cell">
            {d}
          </div>
        ))}
      </div>

      <div className="msc-grid">
        {monthGrid.map((cellDate, idx) => {
          if (!cellDate) {
            return <div key={`msc-e-${idx}`} className="msc-placeholder" aria-hidden />
          }

          const dateStr = formatDateStr(cellDate)
          const isLeave = leaveDatesSet.has(dateStr)
          const dayShifts = getShiftsForDate(cellDate)
          const primaryShift = dayShifts[0] ?? null
          const selected = isSameDay(selectedDate, cellDate)
          const palette = getMobileTilePalette(primaryShift, isLeave)

          return (
            <button
              type="button"
              key={dateStr}
              className="msc-slotbtn"
              onClick={() => onDayClick(cellDate)}
              aria-label={`${dateStr}, ${primaryShift ? 'shift' : isLeave ? 'leave' : 'off'}`}
            >
              <div className={`msc-tile-shell ${selected ? 'msc-tile-shell--selected' : ''}`}>
                <div className="msc-tile-fill msc-fill" data-palette={palette}>
                  <p className="msc-dn">{cellDate.getDate()}</p>

                  {primaryShift && (
                    <>
                      <p className="msc-lb">{getMobileShiftAbbrevLine(primaryShift)}</p>
                      <p className="msc-tm">{primaryShift.time}</p>
                      {primaryShift.note ? <span className="msc-note" title="Note" /> : null}
                    </>
                  )}

                  {!primaryShift && isLeave && (
                    <>
                      <Plane className="msc-leave-ic" strokeWidth={2.5} />
                      <p className="msc-lb">LV</p>
                    </>
                  )}

                  {!primaryShift && !isLeave && <p className="msc-lb">OFF</p>}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="msc-legend">
        <p className="msc-legend-title">Legend</p>
        <div className="msc-legend-row">
          <span className="msc-leg">
            <span className="msc-chip msc-chip--morning" /> MORN
          </span>
          <span className="msc-leg">
            <span className="msc-chip msc-chip--afternoon" /> AFTN
          </span>
          <span className="msc-leg">
            <span className="msc-chip msc-chip--evening" /> NGT
          </span>
          <span className="msc-leg">
            <span className="msc-chip msc-chip--off" /> OFF
          </span>
          <span className="msc-leg">
            <span className="msc-chip msc-chip--long" /> LONG
          </span>
          <span className="msc-leg">
            <span className="msc-chip msc-chip--swap" /> SWAP
          </span>
          <span className="msc-leg">
            <span className="msc-chip msc-chip--lv" /> LV
          </span>
        </div>
      </div>
    </div>
  )
}
