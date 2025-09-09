import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft,
  Users,
  Target,
  Heart,
  Award,
  Globe,
  Zap
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const About = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const values = [
    {
      icon: <Users className="h-8 w-8 text-white" />,
      title: "People First",
      description: "We believe technology should empower people, not replace them. Our platform is designed to make work life better for everyone.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: <Target className="h-8 w-8 text-white" />,
      title: "Simplicity",
      description: "Complex problems deserve simple solutions. We've stripped away the complexity to focus on what matters most.",
      color: "from-green-500 to-green-600"
    },
    {
      icon: <Heart className="h-8 w-8 text-white" />,
      title: "Trust",
      description: "Security and privacy aren't just features—they're fundamental to everything we build. Your data is safe with us.",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: <Zap className="h-8 w-8 text-white" />,
      title: "Innovation",
      description: "We're constantly pushing the boundaries of what's possible in shift management, always looking for better ways to serve our users.",
      color: "from-orange-500 to-orange-600"
    }
  ];

  const stats = [
    { number: "50K+", label: "Active Users" },
    { number: "100+", label: "Companies" },
    { number: "99.9%", label: "Uptime" },
    { number: "24/7", label: "Support" }
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
            About <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{theme.displayName}</span>
          </h1>
          <p className="text-xl text-white/70 mb-8 max-w-3xl mx-auto">
            We're on a mission to revolutionize how teams manage shifts, making work more flexible, efficient, and human-centered.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <Card key={index} className="bg-white/5 backdrop-blur-sm border-white/10 text-center">
                <CardContent className="p-6">
                  <div className="text-3xl font-bold text-white mb-2">{stat.number}</div>
                  <div className="text-white/70">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold text-white mb-6 text-center">Our Story</h2>
                <div className="space-y-6 text-white/70 leading-relaxed">
                  <p>
                    {theme.displayName} was born from a simple observation: shift management shouldn't be complicated. 
                    After years of working in industries where scheduling was a constant source of stress and inefficiency, 
                    we set out to build something better.
                  </p>
                  <p>
                    What started as a solution for aviation professionals has evolved into a comprehensive platform 
                    that serves teams across healthcare, hospitality, retail, manufacturing, and beyond. We've learned 
                    that while industries differ, the core challenges remain the same: people need flexibility, 
                    managers need visibility, and everyone needs simplicity.
                  </p>
                  <p>
                    Today, we're proud to serve thousands of users worldwide, helping them transform their shift 
                    management from a source of frustration into a competitive advantage. But we're just getting started.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {values.map((value, index) => (
              <Card key={index} className="bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 group">
                <CardHeader className="text-center">
                  <div className={`w-16 h-16 bg-gradient-to-br ${value.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    {value.icon}
                  </div>
                  <CardTitle className="text-white text-xl">{value.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-white/70 leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">Meet Our Team</h2>
            <p className="text-white/70 mb-8 text-lg">
              We're a diverse group of engineers, designers, and industry experts who are passionate 
              about solving real-world problems with technology.
            </p>
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="p-8">
                <div className="flex items-center justify-center mb-6">
                  <Globe className="h-12 w-12 text-blue-400 mr-4" />
                  <div>
                    <h3 className="text-xl font-semibold text-white">Remote-First Culture</h3>
                    <p className="text-white/70">We believe great work happens anywhere</p>
                  </div>
                </div>
                <p className="text-white/70 leading-relaxed">
                  Our team spans across multiple time zones, bringing together diverse perspectives 
                  and experiences. This global approach helps us build products that work for teams 
                  everywhere, regardless of their location or industry.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="pb-20">
        <div className="container mx-auto px-4 text-center">
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Join Our Journey?
              </h2>
              <p className="text-white/70 mb-6">
                Whether you're looking for a better way to manage shifts or want to be part of our team, 
                we'd love to hear from you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => navigate('/register')}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 text-lg"
                >
                  Get Started Free
                </Button>
                <Button 
                  onClick={() => navigate('/contact')}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 px-8 py-3 text-lg"
                >
                  Contact Us
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default About;
