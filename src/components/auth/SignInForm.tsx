import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { signIn } from '@/lib/auth'
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowRight, User, Hash } from 'lucide-react'

export const SignInForm = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { refreshUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loginType, setLoginType] = useState<'email' | 'staff_number'>('email')
  const [formData, setFormData] = useState({
    email: '',
    staff_number: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let email = formData.email
      
      // If logging in with staff number, we need to find the email first
      if (loginType === 'staff_number') {
        const { supabase } = await import('@/integrations/supabase/client')
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('email')
          .eq('staff_number', formData.staff_number)
          .single()

        if (staffError || !staffData) {
          throw new Error('Invalid staff number')
        }
        
        email = staffData.email
      }

      await signIn(email, formData.password)
      
      // Redirect to dashboard on success
      navigate('/dashboard')
    } catch (error) {
      console.error('Login error:', error)
      
      let errorMessage = "Please check your credentials"
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = "Connection timeout - please check your internet and try again"
        } else if (error.message.includes('Invalid login credentials')) {
          errorMessage = loginType === 'email' ? "Invalid email or password" : "Invalid staff number or password"
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Please check your email and confirm your account"
        } else if (error.message.includes('Invalid staff number')) {
          errorMessage = "Staff number not found"
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Login Type Toggle */}
      <div className="flex space-x-2 bg-white/10 rounded-xl p-1">
        <button
          type="button"
          onClick={() => setLoginType('email')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg transition-all duration-300 ${
            loginType === 'email' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <Mail className="h-4 w-4" />
          <span className="text-sm font-medium">Email</span>
        </button>
        <button
          type="button"
          onClick={() => setLoginType('staff_number')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg transition-all duration-300 ${
            loginType === 'staff_number' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <Hash className="h-4 w-4" />
          <span className="text-sm font-medium">Staff Number</span>
        </button>
      </div>

      {/* Email/Staff Number Field */}
      <div className="space-y-3">
        <Label htmlFor={loginType} className="text-white font-medium text-sm">
          {loginType === 'email' ? 'Email Address' : 'Staff Number'}
        </Label>
        <div className="relative">
          {loginType === 'email' ? (
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
          ) : (
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
          )}
          <Input
            id={loginType}
            type={loginType === 'email' ? 'email' : 'text'}
            placeholder={loginType === 'email' ? 'your.email@company.com' : 'Enter your staff number'}
            value={loginType === 'email' ? formData.email : formData.staff_number}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              [loginType]: e.target.value 
            }))}
            required
            className="pl-10 pr-4 py-3 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40 focus:ring-white/20 rounded-xl backdrop-blur-sm transition-all duration-300"
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="space-y-3">
        <Label htmlFor="password" className="text-white font-medium text-sm">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            required
            className="pl-10 pr-12 py-3 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40 focus:ring-white/20 rounded-xl backdrop-blur-sm transition-all duration-300"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:opacity-70"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Signing In...
          </>
        ) : (
          <>
            Sign In
            <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/20"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-transparent px-2 text-white/50">Or</span>
        </div>
      </div>

      {/* Register Link */}
      <div className="text-center">
        <Button
          type="button"
          variant="link"
          onClick={() => navigate('/register')}
          className="text-white/80 hover:text-white text-base font-medium transition-colors"
        >
          Don't have an account? 
          <span className="ml-1 text-blue-300 hover:text-blue-200 underline">Register here</span>
        </Button>
      </div>

      {/* Additional Info */}
      <div className="text-center pt-4">
        <p className="text-white/60 text-xs">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </form>
  )
}