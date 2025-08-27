import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { signUp, getCompanies, type Company } from '@/lib/auth'
import { Loader2, Building2 } from 'lucide-react'

export const SignUpForm = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    staffNumber: '',
    baseLocation: '',
    canWorkDoubles: false,
    companyId: ''
  })

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const companiesList = await getCompanies()
        setCompanies(companiesList)
      } catch (error) {
        toast({
          title: "Failed to load companies",
          description: "Please refresh the page and try again",
          variant: "destructive"
        })
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
        <Label htmlFor="company">Company</Label>
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">
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

      {selectedCompany && (
        <div className="space-y-2">
          <Label htmlFor="baseLocation">Base Location</Label>
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
        <Label htmlFor="canWorkDoubles" className="text-sm">
          I can work double shifts (complementary times)
        </Label>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 transition-colors"
        disabled={loading || !selectedCompany}
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