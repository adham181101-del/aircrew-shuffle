import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Users, 
  ArrowRightLeft, 
  Shield,
  Clock,
  Plane
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'

const Index = () => {
  const navigate = useNavigate()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const user = await getCurrentUser()
    if (user) {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-elegant mb-8">
              <Plane className="h-10 w-10 text-primary" />
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              BA/Iberia Crew
              <span className="block text-accent">Shift Management</span>
            </h1>
            
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Seamlessly manage your flight roster, coordinate shift swaps, and stay connected with your crew team.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/register')}
                size="lg"
                className="bg-white text-primary hover:bg-white/90 font-semibold px-8"
              >
                Join Your Crew
              </Button>
              <Button 
                onClick={() => navigate('/login')}
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Built for Aviation Professionals</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Designed specifically for British Airways and Iberia crew members to streamline shift management.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="shadow-card">
              <CardHeader>
                <Calendar className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Smart Roster Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Upload your PDF roster and automatically extract shifts with intelligent parsing. 
                  View your schedule in a beautiful calendar interface.
                </p>
              </CardContent>
            </Card>
            
            <Card className="shadow-card">
              <CardHeader>
                <ArrowRightLeft className="h-12 w-12 text-secondary mb-4" />
                <CardTitle>Seamless Shift Swaps</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Request and accept shift swaps with intelligent eligibility checking. 
                  Only crew at your base location with compatible schedules see your requests.
                </p>
              </CardContent>
            </Card>
            
            <Card className="shadow-card">
              <CardHeader>
                <Shield className="h-12 w-12 text-accent mb-4" />
                <CardTitle>Secure & Compliant</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Built with airline security standards in mind. 
                  @ba.com email verification and base-restricted access ensure data safety.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Base Locations */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold mb-4">Supported Base Locations</h3>
            <p className="text-muted-foreground">Currently serving crew members across all major BA and Iberia bases</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "BA CER",
              "Iberia CER", 
              "Iberia & BA CER",
              "Iberia IOL",
              "Iberia IGL",
              "Baggage For BA",
              "Drivers For BA"
            ].map((base) => (
              <Badge key={base} variant="secondary" className="px-4 py-2">
                {base}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold mb-4">How It Works</h3>
            <p className="text-muted-foreground text-lg">Simple steps to get started</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Register & Verify</h4>
              <p className="text-muted-foreground">
                Sign up with your @ba.com email and select your base location
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Upload Your Roster</h4>
              <p className="text-muted-foreground">
                Upload your PDF roster and watch shifts automatically appear in your calendar
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-foreground">3</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Swap & Coordinate</h4>
              <p className="text-muted-foreground">
                Request swaps and accept requests from crew members at your base
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Plane className="h-6 w-6 text-white" />
              <span className="text-xl font-bold text-white">Crew Management</span>
            </div>
            <p className="text-white/80">
              Empowering BA and Iberia crew members with smart shift management
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
};

export default Index;
