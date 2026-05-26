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

  const uploadCard = (
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
      <CardContent className="flex items-center gap-3 py-4 px-4 lg:flex-col lg:items-start lg:gap-4 lg:py-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 lg:h-12 lg:w-12">
          <Upload className="h-5 w-5 lg:h-6 lg:w-6" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="font-semibold text-slate-900">Upload Roster</p>
          <p className="text-sm text-slate-500 leading-snug">
            Upload your roster to add shifts quickly
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-400 shrink-0 lg:hidden" />
      </CardContent>
    </Card>
  )

  return (
    <div className="w-full max-w-3xl mx-auto lg:max-w-none">
      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-6 lg:items-start xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <ShiftCalendar
            onShiftClick={handleShiftClick}
            onCreateShift={() => navigate('/shifts/create')}
          />
        </div>
        <aside className="lg:sticky lg:top-4">{uploadCard}</aside>
      </div>
    </div>
  )
}
