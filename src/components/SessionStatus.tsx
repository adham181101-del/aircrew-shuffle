import { useState, useEffect } from 'react'
import { useInactivityLogout } from '@/hooks/useInactivityLogout'
import { Badge } from '@/components/ui/badge'
import { Clock, Shield } from 'lucide-react'

export const SessionStatus = () => {
  const [timeUntilLogout, setTimeUntilLogout] = useState<number>(0)
  const [timeUntilWarning, setTimeUntilWarning] = useState<number>(0)
  const [isWarningActive, setIsWarningActive] = useState<boolean>(false)

  const { getTimeUntilLogout, getTimeUntilWarning } = useInactivityLogout({
    timeout: 30 * 60 * 1000, // 30 minutes
    warningTime: 5 * 60 * 1000, // 5 minutes
    onWarning: () => {
      setIsWarningActive(true)
    }
  })

  useEffect(() => {
    const updateTimer = () => {
      const logoutTime = getTimeUntilLogout()
      const warningTime = getTimeUntilWarning()
      
      setTimeUntilLogout(logoutTime)
      setTimeUntilWarning(warningTime)
      
      // Reset warning state if we're not in warning period
      if (warningTime > 0) {
        setIsWarningActive(false)
      }
    }

    // Update immediately
    updateTimer()

    // Update every minute
    const interval = setInterval(updateTimer, 60000)

    return () => clearInterval(interval)
  }, [getTimeUntilLogout, getTimeUntilWarning])

  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000)
    const seconds = Math.floor((milliseconds % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getStatusColor = () => {
    if (isWarningActive) return 'bg-red-500'
    if (timeUntilWarning <= 0) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusText = () => {
    if (isWarningActive) return 'Session Expiring Soon'
    if (timeUntilWarning <= 0) return 'Session Active'
    return 'Session Active'
  }

  return (
    <div className="flex items-center space-x-2">
      <Badge 
        variant="secondary" 
        className={`${getStatusColor()} text-white border-0 px-2 py-1 text-xs`}
      >
        <Shield className="h-3 w-3 mr-1" />
        {getStatusText()}
      </Badge>
      
      {isWarningActive && (
        <Badge 
          variant="outline" 
          className="border-red-300 text-red-600 px-2 py-1 text-xs"
        >
          <Clock className="h-3 w-3 mr-1" />
          {formatTime(timeUntilLogout)}
        </Badge>
      )}
    </div>
  )
}
