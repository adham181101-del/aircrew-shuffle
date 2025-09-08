import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface UseInactivityLogoutOptions {
  timeout?: number // in milliseconds, default 30 minutes
  warningTime?: number // in milliseconds, default 5 minutes before logout
  onWarning?: () => void
  onLogout?: () => void
}

export const useInactivityLogout = ({
  timeout = 30 * 60 * 1000, // 30 minutes
  warningTime = 5 * 60 * 1000, // 5 minutes
  onWarning,
  onLogout
}: UseInactivityLogoutOptions = {}) => {
  const { signOut } = useAuth()
  const { toast } = useToast()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const isWarningShownRef = useRef<boolean>(false)

  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }
    
    // Reset warning flag
    isWarningShownRef.current = false
    
    // Update last activity time
    lastActivityRef.current = Date.now()
    
    // Set warning timer
    warningTimeoutRef.current = setTimeout(() => {
      if (!isWarningShownRef.current) {
        isWarningShownRef.current = true
        
        toast({
          title: "Session Timeout Warning",
          description: `You will be automatically signed out in ${Math.round(warningTime / 60000)} minutes due to inactivity. Click anywhere to stay signed in.`,
          variant: "destructive",
          duration: 10000 // Show for 10 seconds
        })
        
        onWarning?.()
      }
    }, timeout - warningTime)
    
    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      handleLogout()
    }, timeout)
  }, [timeout, warningTime, onWarning, onLogout, toast])

  const handleLogout = useCallback(async () => {
    try {
      await signOut()
      
      toast({
        title: "Session Expired",
        description: "You have been automatically signed out due to inactivity.",
        variant: "destructive"
      })
      
      onLogout?.()
    } catch (error) {
      console.error('Error during automatic logout:', error)
    }
  }, [signOut, toast, onLogout])

  const handleActivity = useCallback(() => {
    // Only reset timer if enough time has passed since last activity
    // This prevents excessive timer resets on rapid events
    const now = Date.now()
    const timeSinceLastActivity = now - lastActivityRef.current
    
    if (timeSinceLastActivity > 1000) { // At least 1 second between resets
      resetTimer()
    }
  }, [resetTimer])

  useEffect(() => {
    // List of events to track for user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ]

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Initialize timer
    resetTimer()

    // Cleanup function
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
      }
    }
  }, [handleActivity, resetTimer])

  // Return functions for manual control
  return {
    resetTimer,
    handleLogout,
    getTimeUntilLogout: () => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current
      return Math.max(0, timeout - timeSinceLastActivity)
    },
    getTimeUntilWarning: () => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current
      return Math.max(0, (timeout - warningTime) - timeSinceLastActivity)
    }
  }
}
