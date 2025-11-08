import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Code,
  Key,
  Book,
  Zap,
  Shield,
  Globe
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const Api = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const apiFeatures = [
    {
      icon: <Code className="h-6 w-6 text-blue-400" />,
      title: "RESTful API",
      description: "Clean, intuitive REST endpoints for all platform functionality",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: <Key className="h-6 w-6 text-green-400" />,
      title: "API Keys",
      description: "Secure authentication with API keys and OAuth 2.0 support",
      color: "from-green-500 to-green-600"
    },
    {
      icon: <Book className="h-6 w-6 text-purple-400" />,
      title: "Documentation",
      description: "Comprehensive API documentation with interactive examples",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: <Zap className="h-6 w-6 text-orange-400" />,
      title: "Webhooks",
      description: "Real-time notifications for shift changes and swap events",
      color: "from-orange-500 to-orange-600"
    }
  ];

  const endpoints = [
    {
      method: "GET",
      path: "/api/v1/shifts",
      description: "Retrieve all shifts for a user"
    },
    {
      method: "POST",
      path: "/api/v1/shifts",
      description: "Create a new shift"
    },
    {
      method: "GET",
      path: "/api/v1/swaps",
      description: "Get all swap requests"
    },
    {
      method: "POST",
      path: "/api/v1/swaps",
      description: "Create a new swap request"
    },
    {
      method: "PUT",
      path: "/api/v1/swaps/{id}/accept",
      description: "Accept a swap request"
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
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">API</span> Documentation
          </h1>
          <p className="text-xl text-white/70 mb-8 max-w-3xl mx-auto">
            Integrate {theme.displayName} into your existing systems with our powerful REST API.
          </p>
        </div>
      </section>

      {/* API Features */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {apiFeatures.map((feature, index) => (
              <Card key={index} className="bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 group">
                <CardHeader className="text-center">
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <CardTitle className="text-white text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-white/70 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* API Endpoints */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-12">API Endpoints</h2>
            <div className="space-y-4">
              {endpoints.map((endpoint, index) => (
                <Card key={index} className="bg-white/5 backdrop-blur-sm border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Badge 
                          variant={endpoint.method === 'GET' ? 'default' : endpoint.method === 'POST' ? 'secondary' : 'outline'}
                          className={`${
                            endpoint.method === 'GET' ? 'bg-green-500' : 
                            endpoint.method === 'POST' ? 'bg-blue-500' : 
                            'bg-orange-500'
                          } text-white`}
                        >
                          {endpoint.method}
                        </Badge>
                        <code className="text-white font-mono text-lg">{endpoint.path}</code>
                      </div>
                      <p className="text-white/70">{endpoint.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Getting Started */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl">
              <CardHeader className="text-center">
                <CardTitle className="text-white text-2xl">Getting Started</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Key className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-white font-semibold mb-2">1. Get API Key</h3>
                    <p className="text-white/70 text-sm">Generate your API key from the dashboard settings</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Code className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-white font-semibold mb-2">2. Make Requests</h3>
                    <p className="text-white/70 text-sm">Use your API key to authenticate requests</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-white font-semibold mb-2">3. Integrate</h3>
                    <p className="text-white/70 text-sm">Build powerful integrations with your systems</p>
                  </div>
                </div>
                
                <div className="bg-slate-800/50 rounded-lg p-6">
                  <h4 className="text-white font-semibold mb-3">Example Request</h4>
                  <pre className="text-green-400 text-sm overflow-x-auto">
{`curl -X GET "https://api.sswap.com/v1/shifts" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
                  </pre>
                </div>
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
                Ready to Start Building?
              </h2>
              <p className="text-white/70 mb-6">
                Get your API key and start integrating {theme.displayName} into your applications today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => navigate('/register')}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 text-lg"
                >
                  Get API Access
                </Button>
                <Button 
                  onClick={() => window.open('https://docs.sswap.com', '_blank')}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 px-8 py-3 text-lg"
                >
                  <Book className="h-4 w-4 mr-2" />
                  View Docs
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Api;
