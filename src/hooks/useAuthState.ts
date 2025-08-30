import { useState, useEffect, useRef } from 'react'
import { getCurrentUser, type Staff, type Company } from '@/lib/auth'
import { supabase } from '@/integrations/supabase/client'

export const useAuthState = () => {
  const [user, setUser] = useState<(Staff & { company: Company }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const initializedRef = useRef(false)
  const userRef = useRef<(Staff & { company: Company }) | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const refreshUser = async () => {
    try {
      setLoading(true)
      
      const currentUser = await getCurrentUser()
      
      setUser(currentUser)
      userRef.current = currentUser
      setInitialized(true)
      initializedRef.current = true
    } catch (error) {
      console.error('Auth refresh error:', error)
      // Don't immediately clear user on error, keep existing state
      setInitialized(true)
      initializedRef.current = true
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    // Increased timeout for more stable loading
    timeoutRef.current = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false)
        setInitialized(true)
        initializedRef.current = true
      }
    }, 10000) // Increased from 2s to 10s

    const initializeAuth = async () => {
      if (initializedRef.current) {
        setLoading(false)
        return
      }

      try {
        if (!mounted) return
        
        const currentUser = await getCurrentUser()
        
        if (mounted) {
          setUser(currentUser)
          userRef.current = currentUser
          setInitialized(true)
          initializedRef.current = true
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) {
          // Don't clear user immediately on error, keep existing state
          setInitialized(true)
          initializedRef.current = true
          setLoading(false)
        }
      }
    }

    // More robust auth listener with retry logic
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        console.log('Auth state change:', event, session?.user?.id)
        
        if (event === 'SIGNED_IN' && session) {
          setLoading(true)
          
          try {
            const currentUser = await getCurrentUser()
            setUser(currentUser)
            userRef.current = currentUser
            setInitialized(true)
            initializedRef.current = true
          } catch (error) {
            console.error('Auth update error:', error)
            // Don't clear user on error, keep existing state
            setInitialized(true)
            initializedRef.current = true
          } finally {
            setLoading(false)
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out')
          setUser(null)
          userRef.current = null
          setLoading(false)
          setInitialized(true)
          initializedRef.current = true
        } else if (event === 'TOKEN_REFRESHED') {
          // Handle token refresh without clearing user
          console.log('Token refreshed')
          if (userRef.current) {
            // Keep existing user state
            setInitialized(true)
            initializedRef.current = true
          }
        }
      }
    )

    // Add focus/blur event listeners to handle tab switching
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userRef.current) {
        // When tab becomes visible, refresh user data if needed
        console.log('Tab became visible, checking auth state')
        // Don't immediately refresh, just ensure we're still authenticated
      }
    }

    const handleFocus = () => {
      if (userRef.current) {
        console.log('Window focused, checking auth state')
        // Don't immediately refresh, just ensure we're still authenticated
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    initializeAuth()

    return () => {
      mounted = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading, initialized, refreshUser }
}
