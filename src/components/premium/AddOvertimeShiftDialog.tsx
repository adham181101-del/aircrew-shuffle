import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createShift, getShiftDurationHours, normalizeTimeRange } from '@/lib/shifts'
import { useShifts } from '@/hooks/useShifts'
import { findWorkPeriodForDate } from '@/lib/payPeriods'
import {
  OT_FULL_UNPAID_HOURS,
  OT_SHORT_UNPAID_HOURS,
  appendOvertimeExtra,
  extraKindFromDutyHours,
  extraOvertimePay,
  loadOvertimeRates,
  newOvertimeExtraId,
  overtimePaidHoursForDuty,
  rateKindForDate,
  type OvertimeExtra,
} from '@/lib/payrollStorage'
import { useToast } from '@/hooks/use-toast'

interface AddOvertimeShiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dateIso: string
  staffId: string | undefined
  existingShiftCount?: number
  allowPickDate?: boolean
  onSaved?: () => void
}

function formatDateLabel(dateIso: string): string {
  if (!dateIso) return ''
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function AddOvertimeShiftDialog({
  open,
  onOpenChange,
  dateIso,
  staffId,
  existingShiftCount,
  allowPickDate = false,
  onSaved,
}: AddOvertimeShiftDialogProps) {
  const { toast } = useToast()
  const { data: shiftsData } = useShifts()
  const [date, setDate] = useState(dateIso)
  const [start, setStart] = useState('05:00')
  const [end, setEnd] = useState('14:00')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setDate(dateIso)
    setStart('05:00')
    setEnd('14:00')
  }, [open, dateIso])

  const preview = useMemo(() => {
    const range = normalizeTimeRange(`${start}-${end}`)
    if (!range) return null
    const duty = getShiftDurationHours(range)
    const paid = overtimePaidHoursForDuty(duty)
    const rateKind = rateKindForDate(date)
    const rates = loadOvertimeRates()
    const extra: OvertimeExtra = {
      id: 'preview',
      date,
      kind: extraKindFromDutyHours(duty),
      time: range,
    }
    return {
      range,
      duty,
      paid,
      rateKind,
      pay: extraOvertimePay(extra, rates),
    }
  }, [start, end, date])

  const handleSave = async () => {
    if (!staffId || !date) return
    const period = findWorkPeriodForDate(new Date(`${date}T00:00:00`))
    if (!period) {
      toast({
        title: 'Outside pay calendar',
        description: 'This date is not in a known pay period.',
        variant: 'destructive',
      })
      return
    }
    const range = normalizeTimeRange(`${start}-${end}`)
    if (!range) {
      toast({
        title: 'Invalid times',
        description: 'Use a start and end time such as 05:00–14:00.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const duty = getShiftDurationHours(range)
      const created = await createShift(date, range, staffId, 'Overtime extra')
      appendOvertimeExtra(period.id, {
        id: newOvertimeExtraId(),
        date,
        kind: extraKindFromDutyHours(duty),
        time: range,
        shiftId: created.id,
        createdShift: true,
      })
      toast({
        title: 'Overtime extra added',
        description:
          rosterCount > 0
            ? 'Paid on top of your rostered shift. This extra does not include shift premium.'
            : 'Paid at your overtime rate. Shift premium is not included.',
      })
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      toast({
        title: 'Could not add overtime',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const sunday = rateKindForDate(date) === 'sundayBh'
  const rosterCount =
    existingShiftCount ??
    (shiftsData?.shifts || []).filter((shift) => shift.date === date).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[110] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add overtime shift</DialogTitle>
          <DialogDescription>
            {formatDateLabel(date) || 'Choose a date and times for this extra.'}{' '}
            {rosterCount > 0
              ? 'Added on top of your rostered duty. The extra’s shift premium will not count.'
              : 'Day off extra — paid at your overtime rate only.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allowPickDate && (
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700 mb-1 block">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Start</label>
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">End</label>
            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>

        {preview && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 space-y-1">
            <p>
              {sunday ? 'Sunday / bank holiday' : 'Normal weekday'} rate · {preview.paid.toFixed(2)}h paid
              {preview.duty <= 6
                ? ` (${OT_SHORT_UNPAID_HOURS}h unpaid break)`
                : ` (${OT_FULL_UNPAID_HOURS}h unpaid break)`}
            </p>
            <p className="font-semibold text-slate-900">£{preview.pay.toFixed(2)}</p>
            <p className="text-xs text-slate-500">
              Set your overtime rates on Pay → Overtime or Profile. Paid hours are the shift length minus
              30 minutes at 6 hours or under, or minus 1 hour when the shift is longer.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !staffId || !preview}>
            {saving ? 'Saving…' : 'Add overtime extra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
