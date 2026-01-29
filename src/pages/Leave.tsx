import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { useLeaveDays, useAddLeaveDay, useRemoveLeaveDay } from '@/hooks/useLeaveDays'

const toIso = (d: Date) => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const Leave = () => {
  const { toast } = useToast()
  const { data: leaveDays = [], isLoading: loading } = useLeaveDays()
  const addLeaveDay = useAddLeaveDay()
  const removeLeaveDay = useRemoveLeaveDay()
  const [selected, setSelected] = useState<Date[] | undefined>([])

  const selectedIsoSet = useMemo(() => new Set((selected || []).map(toIso)), [selected])
  const leaveIsoSet = useMemo(() => new Set(leaveDays.map(l => l.date)), [leaveDays])

  // Update selected dates when leave days change
  useEffect(() => {
    if (leaveDays.length > 0) {
      setSelected(leaveDays.map(i => new Date(`${i.date}T00:00:00`)))
    }
  }, [leaveDays])

  const onDaySelect = async (dates: Date[] | undefined) => {
    // Determine additions and removals
    const next = dates || []
    const nextIso = new Set(next.map(toIso))

    // Additions: in next but not in existing leave
    for (const iso of nextIso) {
      if (!leaveIsoSet.has(iso)) {
        const success = await addLeaveDay.mutateAsync(iso)
        if (!success) {
          toast({ title: 'Failed to add leave day', variant: 'destructive' })
        }
      }
    }
    // Removals: in existing leave but not in next
    for (const iso of leaveIsoSet) {
      if (!nextIso.has(iso)) {
        const success = await removeLeaveDay.mutateAsync(iso)
        if (!success) {
          toast({ title: 'Failed to remove leave day', variant: 'destructive' })
        }
      }
    }

    toast({ title: 'Leave updated' })
  }

  const removeSingle = async (iso: string) => {
    const success = await removeLeaveDay.mutateAsync(iso)
    if (!success) {
      toast({ title: 'Failed to remove leave day', variant: 'destructive' })
      return
    }
    toast({ title: 'Leave day removed' })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Manage Leave Days</CardTitle>
              <p className="text-sm text-muted-foreground">Select the days you are on leave. You will not receive swap requests for these days.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <Calendar
              mode="multiple"
              selected={selected}
              onSelect={onDaySelect}
              className="rounded-md border"
              showOutsideDays={false}
              captionLayout="dropdown"
            />
          </div>

          <div>
            <h3 className="font-semibold mb-2">Your Leave Days</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : leaveDays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leave days added yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {leaveDays.map(l => (
                  <div key={l.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>{format(new Date(`${l.date}T00:00:00`), 'EEE d MMM yyyy')}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeSingle(l.date)} aria-label="Remove">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Leave



