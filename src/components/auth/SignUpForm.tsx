import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { signUp, ALLOWED_BASES, BaseLocation } from '@/lib/auth'
import { Loader2 } from 'lucide-react'

export const SignUpForm = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    staffNumber: '',
    baseLocation: '' as BaseLocation,
    canWorkDoubles: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signUp(
        formData.email,
        formData.password,
        formData.staffNumber,
        formData.baseLocation,
        formData.canWorkDoubles
      )
      
      toast({
        title: "Account created successfully",
        description: "Welcome to the crew management system!"
      })
      
      navigate('/dashboard')
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">BA Email Address</Label>
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

      <div className="space-y-2">
        <Label htmlFor="staffNumber">Staff Number</Label>
        <Input
          id="staffNumber"
          placeholder="4-10 digits"
          value={formData.staffNumber}
          onChange={(e) => setFormData(prev => ({ ...prev, staffNumber: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="baseLocation">Base Location</Label>
        <Select
          value={formData.baseLocation}
          onValueChange={(value: BaseLocation) => setFormData(prev => ({ ...prev, baseLocation: value }))}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your base" />
          </SelectTrigger>
          <SelectContent>
            {ALLOWED_BASES.map((base) => (
              <SelectItem key={base} value={base}>
                {base}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="canWorkDoubles"
          checked={formData.canWorkDoubles}
          onCheckedChange={(checked) => 
            setFormData(prev => ({ ...prev, canWorkDoubles: checked as boolean }))
          }
        />
        <Label htmlFor="canWorkDoubles" className="text-sm">
          I can work double shifts (complementary times)
        </Label>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
        disabled={loading}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create Account
      </Button>

      <div className="text-center">
        <Button
          type="button"
          variant="link"
          onClick={() => navigate('/login')}
          className="text-muted-foreground"
        >
          Already have an account? Sign in
        </Button>
      </div>
    </form>
  )
}