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
  Building2,
  Plane,
  Zap,
  CheckCircle,
  Star,
  TrendingUp,
  Globe,
  Lock,
  FileText,
  Award,
  Eye,
  AlertTriangle
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

const Index = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-6">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
              {theme.logo}
            </div>
            <span className="text-xl font-bold text-white">{theme.displayName}</span>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
              Features
            </Button>
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
              Industries
            </Button>
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
              About
            </Button>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={() => navigate('/login')}
              variant="ghost" 
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => navigate('/register')}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-5xl mx-auto">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl mb-8 border border-white/20">
              {theme.logo}
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
              {theme.heroTitle}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mt-2">
                {theme.heroSubtitle}
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
              {theme.heroDescription}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                onClick={() => navigate('/register')}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-10 py-4 text-lg rounded-xl shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105"
              >
                <Zap className="mr-2 h-5 w-5" />
                Start Free Trial
              </Button>
              <Button 
                onClick={() => navigate('/login')}
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 px-10 py-4 text-lg rounded-xl backdrop-blur-sm transition-all duration-300"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Sign In
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-white/60">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <span>Trusted by 10,000+ crew members</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-400" />
                <span>UK GDPR Compliant</span>
              </div>
              <div className="flex items-center space-x-2">
                <Plane className="h-5 w-5 text-blue-400" />
                <span>Aviation Security Standards</span>
              </div>
              <div className="flex items-center space-x-2">
                <Lock className="h-5 w-5 text-purple-400" />
                <span>ISO 27001 Ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">{theme.features.title}</h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              {theme.features.description}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {theme.features.features.map((feature, index) => (
              <Card key={index} className="bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 group">
                <CardHeader className="text-center">
                  <div className={`w-16 h-16 bg-gradient-to-br ${index === 0 ? 'from-blue-500 to-purple-600' : index === 1 ? 'from-purple-500 to-pink-600' : 'from-green-500 to-teal-600'} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <CardTitle className="text-white text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-white/70 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance & Security Section */}
      <section className="py-24 bg-gradient-to-r from-green-600/20 to-blue-600/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl shadow-2xl mb-8">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Enterprise-Grade Security & Compliance</h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Built with the highest security standards and regulatory compliance to protect your data and ensure legal compliance.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* UK GDPR Compliance */}
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-105 group">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-white text-xl">UK GDPR Compliant</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-white/70 leading-relaxed mb-4">
                  Full compliance with UK GDPR regulations including data subject rights, privacy policies, and audit logging.
                </p>
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-green-400 font-semibold">Legal compliance with UK GDPR</span>
                </div>
              </CardContent>
            </Card>

            {/* Aviation Security Standards */}
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 group">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Plane className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-white text-xl">Aviation Security Standards</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-white/70 leading-relaxed mb-4">
                  Meets IATA, CAA, and ISO 27001 standards for aviation industry security requirements.
                </p>
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-blue-400" />
                  <span className="text-blue-400 font-semibold">Aviation industry standards compliance</span>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Security Monitoring */}
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 group">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Eye className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-white text-xl">Enhanced Security Monitoring</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-white/70 leading-relaxed mb-4">
                  Real-time security monitoring, audit logging, and comprehensive threat detection.
                </p>
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-purple-400" />
                  <span className="text-purple-400 font-semibold">Enhanced security monitoring</span>
                </div>
              </CardContent>
            </Card>

            {/* Customer Trust */}
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl hover:shadow-yellow-500/25 transition-all duration-300 transform hover:scale-105 group">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-white text-xl">Customer Trust & Confidence</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-white/70 leading-relaxed mb-4">
                  Transparent data handling and privacy controls build trust with your workforce.
                </p>
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-yellow-400" />
                  <span className="text-yellow-400 font-semibold">Customer trust and confidence</span>
                </div>
              </CardContent>
            </Card>

            {/* Competitive Advantage */}
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl hover:shadow-indigo-500/25 transition-all duration-300 transform hover:scale-105 group">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-white text-xl">Competitive Advantage</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-white/70 leading-relaxed mb-4">
                  Stand out in the market with enterprise-grade security and compliance features.
                </p>
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-indigo-400" />
                  <span className="text-indigo-400 font-semibold">Competitive advantage in the market</span>
                </div>
              </CardContent>
            </Card>

            {/* Reduced Legal Risk */}
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl hover:shadow-red-500/25 transition-all duration-300 transform hover:scale-105 group">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Lock className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-white text-xl">Reduced Legal Risk</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-white/70 leading-relaxed mb-4">
                  Comprehensive compliance framework minimizes legal risks and regulatory penalties.
                </p>
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-red-400" />
                  <span className="text-red-400 font-semibold">Reduced legal risk</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compliance Badges */}
          <div className="mt-16 text-center">
            <h3 className="text-2xl font-bold text-white mb-8">Certified & Compliant</h3>
            <div className="flex flex-wrap justify-center gap-6">
              <Badge variant="outline" className="border-green-500 text-green-400 px-6 py-3 text-lg">
                <Shield className="h-5 w-5 mr-2" />
                UK GDPR Compliant
              </Badge>
              <Badge variant="outline" className="border-blue-500 text-blue-400 px-6 py-3 text-lg">
                <Plane className="h-5 w-5 mr-2" />
                IATA Standards
              </Badge>
              <Badge variant="outline" className="border-purple-500 text-purple-400 px-6 py-3 text-lg">
                <Award className="h-5 w-5 mr-2" />
                ISO 27001 Ready
              </Badge>
              <Badge variant="outline" className="border-yellow-500 text-yellow-400 px-6 py-3 text-lg">
                <Lock className="h-5 w-5 mr-2" />
                CAA Compliant
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            {theme.stats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="text-4xl font-bold text-white">{stat.value}</div>
                <div className="text-white/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Industries */}
      <section className="py-20 bg-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">Trusted Across Industries</h3>
            <p className="text-xl text-white/70">Serving professionals in shift-based industries worldwide</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4">
            {theme.industries.map((industry) => (
              <div key={industry.name} className="group">
                <div className={`bg-gradient-to-r ${industry.color} p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer`}>
                  <div className="text-3xl mb-2">{industry.icon}</div>
                  <div className="text-white font-semibold">{industry.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-gradient-to-r from-slate-800/50 to-blue-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h3 className="text-4xl md:text-5xl font-bold text-white mb-6">Get Started in Minutes</h3>
            <p className="text-xl text-white/70">Simple steps to transform your shift management</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h4 className="text-2xl font-semibold text-white mb-4">Register & Verify</h4>
              <p className="text-white/70 leading-relaxed">
                Sign up with your company email and select your work location. 
                Get verified instantly with our secure authentication system.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h4 className="text-2xl font-semibold text-white mb-4">Upload Your Schedule</h4>
              <p className="text-white/70 leading-relaxed">
                Upload your schedule in any format. Our AI automatically parses 
                and organizes your shifts in a beautiful calendar interface.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h4 className="text-2xl font-semibold text-white mb-4">Swap & Coordinate</h4>
              <p className="text-white/70 leading-relaxed">
                Request swaps and accept requests from team members. 
                Real-time notifications keep everyone in sync.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {theme.cta.title}
          </h3>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            {theme.cta.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/register')}
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-10 py-4 text-lg rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              <TrendingUp className="mr-2 h-5 w-5" />
              Start Free Trial
            </Button>
            <Button 
              onClick={() => navigate('/login')}
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/20 px-10 py-4 text-lg rounded-xl transition-all duration-300"
            >
              <Globe className="mr-2 h-5 w-5" />
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  {theme.logo}
                </div>
                <span className="text-xl font-bold text-white">{theme.displayName}</span>
              </div>
              <p className="text-white/70">
                {theme.footer.description}
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-white font-semibold">Product</h4>
              <ul className="space-y-2 text-white/70">
                <li><a href="/features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="/pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="/security" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="/api" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-white font-semibold">Compliance</h4>
              <ul className="space-y-2 text-white/70">
                <li><a href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/data-rights" className="hover:text-white transition-colors">Data Rights</a></li>
                <li><a href="/security" className="hover:text-white transition-colors">Security Dashboard</a></li>
                <li><a href="/gdpr" className="hover:text-white transition-colors">GDPR Compliance</a></li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-white font-semibold">Company</h4>
              <ul className="space-y-2 text-white/70">
                <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="/careers" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-white font-semibold">Support</h4>
              <ul className="space-y-2 text-white/70">
                <li><a href="/help" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="/docs" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="/status" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="/community" className="hover:text-white transition-colors">Community</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-12 pt-8 text-center">
            <p className="text-white/60">
              © 2024 {theme.displayName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
};

export default Index;
