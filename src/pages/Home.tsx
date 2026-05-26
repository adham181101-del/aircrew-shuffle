import { useNavigate } from 'react-router-dom'
import { ShiftCalendar } from '@/components/calendar/ShiftCalendar'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, ChevronRight } from 'lucide-react'
import type { Shift } from '@/lib/shifts'

export default function Home() {
  const navigate = useNavigate()

  const handleShiftClick = (shift: Shift) => {
    navigate(`/swaps/manage?shift_id=${shift.id}&shift_date=${shift.date}`)
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto w-full">
      <ShiftCalendar
        onShiftClick={handleShiftClick}
        onCreateShift={() => navigate('/shifts/create')}
      />

      <Card
        className="border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer bg-white"
        onClick={() => navigate('/upload')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigate('/upload')
          }
        }}
      >
        <CardContent className="flex items-center gap-3 py-4 px-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Upload className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="font-semibold text-slate-900">Upload Roster</p>
            <p className="text-sm text-slate-500 leading-snug">
              Upload your roster to add shifts quickly
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
        </CardContent>
      </Card>
    </div>
  )
}
