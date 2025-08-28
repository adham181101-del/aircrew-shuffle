import { createContext, useContext, ReactNode } from 'react'
import { signOut, type Staff, type Company } from '@/lib/auth'
import { useAuthState } from '@/hooks/useAuthState'

interface AuthContextType {
  user: (Staff & { company: Company }) | null
  loading: boolean
  initialized: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { user, loading, initialized, refreshUser } = useAuthState()

  const handleSignOut = async () => {
    try {
      await signOut()
      // Force a page reload to clear all state
      window.location.href = '/login'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading: loading || !initialized,
      initialized,
      signOut: handleSignOut,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}
