import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const Features = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const features = [
    {
      icon: <Calendar className="h-8 w-8 text-white" />,
      title: "Smart Roster Management",
      description: "AI-powered schedule parsing automatically extracts shifts from any format. Beautiful calendar interface with drag-and-drop functionality.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: <ArrowRightLeft className="h-8 w-8 text-white" />,
      title: "Intelligent Shift Swaps",
      description: "Smart eligibility checking ensures only compatible team members see your requests. Real-time notifications and approval workflows.",
      color: "from-green-500 to-green-600"
    },
    {
      icon: <Shield className="h-8 w-8 text-white" />,
      title: "Enterprise Security",
      description: "Built with SOC 2 compliance in mind. Company email verification and location-restricted access ensure data safety.",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: <Clock className="h-8 w-8 text-white" />,
      title: "Dynamic Scheduling",
      description: "AI-powered schedule generation and easy adjustments for any shift pattern.",
      color: "from-orange-500 to-orange-600"
    },
    {
      icon: <Users className="h-8 w-8 text-white" />,
      title: "Team Coordination",
      description: "Real-time team visibility, shift coverage tracking, and seamless communication tools.",
      color: "from-cyan-500 to-cyan-600"
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-white" />,
      title: "Analytics & Insights",
      description: "Comprehensive reporting on shift patterns, team performance, and operational efficiency.",
      color: "from-pink-500 to-pink-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Navigation */}
      <nav className="bg-white/5 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                {theme.logo}
              </div>
              <span className="text-xl font-bold text-white">{theme.displayName}</span>
            </div>
            <Button 
              onClick={() => navigate('/')}
              variant="ghost" 
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Powerful Features for <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Modern Teams</span>
          </h1>
          <p className="text-xl text-white/70 mb-8 max-w-3xl mx-auto">
            Discover the comprehensive suite of tools designed to streamline your shift management and boost team productivity.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 group">
                <CardHeader className="text-center">
                  <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
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

      {/* CTA Section */}
      <section className="pb-20">
        <div className="container mx-auto px-4 text-center">
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Transform Your Operations?
              </h2>
              <p className="text-white/70 mb-6">
                Join thousands of businesses already using {theme.displayName} to streamline their shift management.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => navigate('/register')}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 text-lg"
                >
                  Get Started Free
                </Button>
                <Button 
                  onClick={() => navigate('/login')}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 px-8 py-3 text-lg"
                >
                  Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Features;
