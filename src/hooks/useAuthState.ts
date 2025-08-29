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
      setUser(null)
      userRef.current = null
      setInitialized(true)
      initializedRef.current = true
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    // Reduced timeout for faster loading
    timeoutRef.current = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false)
        setInitialized(true)
        initializedRef.current = true
      }
    }, 2000) // Reduced from 5s to 2s

    const initializeAuth = async () => {
      if (initializedRef.current) {
        setLoading(false)
        return
      }

      try {
        // Removed artificial delay
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
          setUser(null)
          userRef.current = null
          setInitialized(true)
          initializedRef.current = true
          setLoading(false)
        }
      }
    }

    // Optimized auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
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
            setUser(null)
            userRef.current = null
            setInitialized(true)
            initializedRef.current = true
          } finally {
            setLoading(false)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          userRef.current = null
          setLoading(false)
          setInitialized(true)
          initializedRef.current = true
        }
      }
    )

    initializeAuth()

    return () => {
      mounted = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading, initialized, refreshUser }
}
