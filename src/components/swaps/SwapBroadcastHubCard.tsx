import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock } from 'lucide-react'
import {
  type SwapBroadcastSummary,
  formatBroadcastStatusLine,
  broadcastIsActive,
} from '@/lib/swapBroadcastSummary'
import { format } from 'date-fns'
import { enGB } from 'date-fns/locale'

type SwapBroadcastHubCardProps = {
  summary: SwapBroadcastSummary
  onRevoke?: (anyRequestId: string) => void
  onReviewCounterOffers?: () => void
}

export function SwapBroadcastHubCard({
  summary,
  onRevoke,
  onReviewCounterOffers,
}: SwapBroadcastHubCardProps) {
  const statusLine = formatBroadcastStatusLine(summary)
  const active = broadcastIsActive(summary)
  const revokeTargetId = summary.requests.find((r) => r.status === 'pending')?.id

  return (
    <Card
      className={
        active
          ? 'border-blue-200 bg-gradient-to-br from-white to-blue-50/80 shadow-md'
          : 'border-gray-200 bg-white shadow-sm'
      }
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Swap broadcast</CardTitle>
            <CardDescription>
              Sent{' '}
              {format(new Date(summary.createdAt), 'd MMM yyyy', { locale: enGB })}
              {' · '}
              {summary.requests.length}{' '}
              {summary.requests.length === 1 ? 'recipient' : 'recipients'}
            </CardDescription>
          </div>
          {summary.accepted > 0 && (
            <Badge className="bg-green-100 text-green-800 border-green-200">Filled</Badge>
          )}
          {active && summary.accepted === 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
              In progress
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-blue-600" />
            {summary.shiftDate}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-green-600" />
            {summary.shiftTime}
          </span>
        </div>

        <p className="text-base font-medium text-gray-900 leading-snug">{statusLine}</p>

        <div className="flex flex-wrap gap-2">
          {summary.counterOffers > 0 && onReviewCounterOffers && (
            <Button size="sm" variant="outline" onClick={onReviewCounterOffers}>
              Review counter-offers
            </Button>
          )}
          {active && revokeTargetId && onRevoke && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onRevoke(revokeTargetId)}
            >
              Revoke all pending
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
