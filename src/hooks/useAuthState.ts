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
      console.log('useAuthState: refreshUser called')
      setLoading(true)
      
      const currentUser = await getCurrentUser()
      console.log('useAuthState: refreshUser result:', currentUser)
      
      setUser(currentUser)
      userRef.current = currentUser
      setInitialized(true)
      initializedRef.current = true
    } catch (error) {
      console.error('useAuthState: refreshUser error:', error)
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

    // Set a timeout fallback to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      if (mounted && loading) {
        console.log('useAuthState: Loading timeout reached, forcing completion')
        setLoading(false)
        setInitialized(true)
        initializedRef.current = true
      }
    }, 5000) // 5 second timeout

    const initializeAuth = async () => {
      // Prevent multiple initializations
      if (initializedRef.current) {
        console.log('useAuthState: Already initialized, skipping')
        setLoading(false)
        return
      }

      try {
        console.log('useAuthState: Starting initialization...')
        
        // Minimal delay for faster loading
        await new Promise(resolve => setTimeout(resolve, 50))
        
        if (!mounted) return
        
        const currentUser = await getCurrentUser()
        console.log('useAuthState: getCurrentUser result:', currentUser)
        
        if (mounted) {
          setUser(currentUser)
          userRef.current = currentUser
          setInitialized(true)
          initializedRef.current = true
          setLoading(false)
        }
      } catch (error) {
        console.error('useAuthState: Error during initialization:', error)
        if (mounted) {
          setUser(null)
          userRef.current = null
          setInitialized(true)
          initializedRef.current = true
          setLoading(false)
        }
      }
    }

    // Set up Supabase auth listener with optimized handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('useAuthState: Auth state change:', event, session)
        
        if (!mounted) return
        
        if (event === 'SIGNED_IN' && session) {
          console.log('useAuthState: User signed in, refreshing user data')
          // Only set loading briefly for sign in
          setLoading(true)
          
          try {
            const currentUser = await getCurrentUser()
            console.log('useAuthState: Updated user data:', currentUser)
            setUser(currentUser)
            userRef.current = currentUser
            setInitialized(true)
            initializedRef.current = true
          } catch (error) {
            console.error('useAuthState: Error updating user data:', error)
            setUser(null)
            userRef.current = null
            setInitialized(true)
            initializedRef.current = true
          } finally {
            setLoading(false)
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('useAuthState: User signed out')
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
