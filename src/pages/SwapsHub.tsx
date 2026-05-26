import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRightLeft, ChevronRight, Inbox, PlusCircle } from 'lucide-react'
import { useIncomingSwapRequests } from '@/hooks/useSwapRequests'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Badge } from '@/components/ui/badge'

export default function SwapsHub() {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const { data: incoming = [] } = useIncomingSwapRequests(user?.id ?? null)
  const pendingCount = incoming.length

  return (
    <div className="max-w-lg mx-auto lg:max-w-3xl w-full space-y-4">
      <div className="text-center lg:text-left">
        <h2 className="text-xl font-bold text-slate-900">Swaps</h2>
        <p className="text-sm text-slate-500">Request coverage or manage responses</p>
      </div>

      <Card
        className="border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer bg-white"
        onClick={() => navigate('/swaps/create')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigate('/swaps/create')
          }
        }}
      >
        <CardContent className="flex items-center gap-3 py-4 px-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            <PlusCircle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="font-semibold text-slate-900">Request Swap</p>
            <p className="text-sm text-slate-500">Send a swap request to crew who are off</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
        </CardContent>
      </Card>

      <Card
        className="border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer bg-white"
        onClick={() => navigate('/swaps/manage')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigate('/swaps/manage')
          }
        }}
      >
        <CardContent className="flex items-center gap-3 py-4 px-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Inbox className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-900">Manage Swaps</p>
              {pendingCount > 0 && (
                <Badge className="bg-blue-600 text-white text-xs px-2 py-0">
                  {pendingCount}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-500">Incoming, outgoing, and counter-offers</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2 pt-2 text-slate-400">
        <ArrowRightLeft className="h-4 w-4" />
        <span className="text-xs">Swap tools live here</span>
      </div>
    </div>
  )
}
