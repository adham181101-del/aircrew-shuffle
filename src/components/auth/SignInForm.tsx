import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { signIn } from '@/lib/auth'
import { Loader2 } from 'lucide-react'

export const SignInForm = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { refreshUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    console.log('SignInForm: Starting login process...')

    try {
      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout - please try again')), 30000)
      )

      console.log('SignInForm: Calling signIn...')
      const signInPromise = signIn(formData.email, formData.password)
      await Promise.race([signInPromise, timeoutPromise])
      console.log('SignInForm: signIn successful')
      
      // Wait a moment for Supabase session to be established
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('SignInForm: Redirecting to dashboard...')
      
      // Try multiple redirect methods for maximum compatibility
      try {
        // Method 1: Direct location change
        window.location.href = '/dashboard'
        
        // Method 2: Fallback after a short delay
        setTimeout(() => {
          if (window.location.pathname !== '/dashboard') {
            console.log('SignInForm: Fallback redirect triggered')
            window.location.replace('/dashboard')
          }
        }, 500)
        
        // Method 3: Final fallback
        setTimeout(() => {
          if (window.location.pathname !== '/dashboard') {
            console.log('SignInForm: Final fallback redirect')
            window.location.assign('/dashboard')
          }
        }, 2000)
      } catch (redirectError) {
        console.error('SignInForm: Redirect error:', redirectError)
        // Last resort: show success message and manual redirect
        setLoginSuccess(true)
        toast({
          title: "Login successful!",
          description: "Please click the dashboard button below",
        })
      }
    } catch (error) {
      console.error('SignInForm: Login error:', error)
      
      let errorMessage = "Please check your credentials"
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = "Connection timeout - please check your internet and try again"
        } else if (error.message.includes('Invalid login credentials')) {
          errorMessage = "Invalid email or password"
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Please check your email and confirm your account"
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="your.name@ba.com"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          required
        />
      </div>

      {loginSuccess ? (
        <Button 
          type="button"
          onClick={() => window.location.href = '/dashboard'}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 transition-colors"
        >
          Go to Dashboard
        </Button>
      ) : (
        <Button 
          type="submit" 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 transition-colors"
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>
      )}

      <div className="text-center">
        <Button
          type="button"
          variant="link"
          onClick={() => navigate('/register')}
          className="text-muted-foreground"
        >
          Don't have an account? Register
        </Button>
      </div>
    </form>
  )
}