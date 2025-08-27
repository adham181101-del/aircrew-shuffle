import { useState, useEffect } from 'react'
import { getCurrentUser, type Staff, type Company } from '@/lib/auth'
import { supabase } from '@/integrations/supabase/client'

export const useAuthState = () => {
  const [user, setUser] = useState<(Staff & { company: Company }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const refreshUser = async () => {
    try {
      console.log('useAuthState: refreshUser called')
      setLoading(true)
      
      const currentUser = await getCurrentUser()
      console.log('useAuthState: refreshUser result:', currentUser)
      
      setUser(currentUser)
      setInitialized(true)
    } catch (error) {
      console.error('useAuthState: refreshUser error:', error)
      setUser(null)
      setInitialized(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        console.log('useAuthState: Starting initialization...')
        
        // Check if we're in Safari
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
        console.log('useAuthState: Safari detected:', isSafari)
        
        // Add longer delay for Safari
        if (isSafari) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        if (!mounted) return
        
        const currentUser = await getCurrentUser()
        console.log('useAuthState: getCurrentUser result:', currentUser)
        
        if (mounted) {
          setUser(currentUser)
          setInitialized(true)
        }
      } catch (error) {
        console.error('useAuthState: Error during initialization:', error)
        if (mounted) {
          setUser(null)
          setInitialized(true)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Set up Supabase auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('useAuthState: Auth state change:', event, session)
        
        if (!mounted) return
        
        if (event === 'SIGNED_IN' && session) {
          console.log('useAuthState: User signed in, refreshing user data')
          setLoading(true)
          try {
            const currentUser = await getCurrentUser()
            console.log('useAuthState: Updated user data:', currentUser)
            setUser(currentUser)
            setInitialized(true)
          } catch (error) {
            console.error('useAuthState: Error updating user data:', error)
            setUser(null)
            setInitialized(true)
          } finally {
            setLoading(false)
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('useAuthState: User signed out')
          setUser(null)
          setLoading(false)
          setInitialized(true)
        }
      }
    )

    initializeAuth()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading, initialized, refreshUser }
}
