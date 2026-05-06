import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { requestPasswordReset } from '@/lib/auth'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'

export const ForgotPasswordForm = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await requestPasswordReset(email)
      toast({
        title: 'Reset email sent',
        description: 'If an account exists for this email, password reset instructions have been sent.',
      })
      setEmail('')
    } catch (error) {
      toast({
        title: 'Could not send reset email',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <Label htmlFor="email" className="text-white font-medium text-sm">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
          <Input
            id="email"
            type="email"
            placeholder="your.email@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="pl-10 pr-4 py-3 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40 focus:ring-white/20 rounded-xl backdrop-blur-sm transition-all duration-300"
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-70"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Sending...
          </>
        ) : (
          'Send Reset Link'
        )}
      </Button>

      <div className="text-center">
        <Button
          type="button"
          variant="link"
          onClick={() => navigate('/login')}
          className="text-white/80 hover:text-white text-base font-medium transition-colors"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to sign in
        </Button>
      </div>
    </form>
  )
}
