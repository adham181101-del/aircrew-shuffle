import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { signUp, getCompanies, validatePasswordStrength, type Company } from '@/lib/auth'
import { Loader2, Building2, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'

export const SignUpForm = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    staffNumber: '',
    baseLocation: '',
    canWorkDoubles: false,
    companyId: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [passwordValidation, setPasswordValidation] = useState({ valid: false, message: '' })

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        setLoadingCompanies(true)
        const companiesList = await getCompanies()
        setCompanies(companiesList)
        if (companiesList.length === 0) {
          toast({
            title: "No companies available",
            description: "Please contact support if this issue persists",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error('Error loading companies:', error)
        toast({
          title: "Failed to load companies",
          description: error instanceof Error ? error.message : "Please refresh the page and try again",
          variant: "destructive"
        })
      } finally {
        setLoadingCompanies(false)
      }
    }
    loadCompanies()
  }, [toast])

  const handleCompanyChange = (companyId: string) => {
    const company = companies.find(c => c.id === companyId)
    setSelectedCompany(company || null)
    setFormData(prev => ({ 
      ...prev, 
      companyId,
      baseLocation: '' // Reset base location when company changes
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.companyId) {
        throw new Error('Please select a company')
      }
      
      if (!formData.baseLocation) {
        throw new Error('Please select a base location')
      }
      
      await signUp(
        formData.email,
        formData.password,
        formData.staffNumber,
        formData.baseLocation,
        formData.canWorkDoubles,
        formData.companyId
      )
      
      toast({
        title: "Account created successfully",
        description: `Welcome to ${selectedCompany?.name}!`
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
        <Label htmlFor="company" className="text-white">Company</Label>
        {loadingCompanies ? (
          <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
            <span className="text-muted-foreground">Loading companies...</span>
            <Loader2 className="h-4 w-4 animate-spin opacity-50" />
          </div>
        ) : companies.length === 0 ? (
          <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            No companies available. Please contact support.
          </div>
        ) : (
          <Select
            value={formData.companyId}
            onValueChange={handleCompanyChange}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{company.name}</div>
                      <div className="text-sm text-muted-foreground">{company.industry}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-white">
          Email Address (Any domain allowed for testing)
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="your.email@anydomain.com"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
        />
        <p className="text-sm text-muted-foreground">
          Temporarily allowing any email domain for testing purposes
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-white">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(e) => {
              const password = e.target.value
              setFormData(prev => ({ ...prev, password }))
              setPasswordValidation(validatePasswordStrength(password))
            }}
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        {formData.password && (
          <div className="space-y-1">
            <div className={`flex items-center gap-2 text-sm ${passwordValidation.valid ? 'text-green-600' : 'text-red-600'}`}>
              {passwordValidation.valid ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {passwordValidation.message}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="staffNumber" className="text-white">Staff Number</Label>
        <Input
          id="staffNumber"
          placeholder="4-10 digits"
          value={formData.staffNumber}
          onChange={(e) => setFormData(prev => ({ ...prev, staffNumber: e.target.value }))}
          required
        />
      </div>

      {selectedCompany && (
        <div className="space-y-2">
          <Label htmlFor="baseLocation" className="text-white">Base Location</Label>
          <Select
            value={formData.baseLocation}
            onValueChange={(value) => setFormData(prev => ({ ...prev, baseLocation: value }))}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your base" />
            </SelectTrigger>
            <SelectContent>
              {selectedCompany.config.bases.map((base) => (
                <SelectItem key={base} value={base}>
                  {base}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Checkbox
          id="canWorkDoubles"
          checked={formData.canWorkDoubles}
          onCheckedChange={(checked) => 
            setFormData(prev => ({ ...prev, canWorkDoubles: checked as boolean }))
          }
        />
        <Label htmlFor="canWorkDoubles" className="text-sm text-white">
          I can work double shifts (complementary times)
        </Label>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 transition-colors"
        disabled={loading || !selectedCompany || !passwordValidation.valid}
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