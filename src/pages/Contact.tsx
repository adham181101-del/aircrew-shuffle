import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';

const Contact = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsSubmitted(true);
      toast({
        title: "Message sent successfully!",
        description: "We'll get back to you within 24 hours.",
      });
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        company: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      toast({
        title: "Error sending message",
        description: "Please try again or contact us directly.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const contactInfo = [
    {
      icon: <Mail className="h-6 w-6 text-blue-400" />,
      title: "Email",
      details: "hello@shiftflex.com",
      description: "We'll respond within 24 hours"
    },
    {
      icon: <Phone className="h-6 w-6 text-green-400" />,
      title: "Phone",
      details: "+44 20 7946 0958",
      description: "Mon-Fri, 9am-6pm GMT"
    },
    {
      icon: <MapPin className="h-6 w-6 text-purple-400" />,
      title: "Office",
      details: "London, UK",
      description: "Remote-first company"
    }
  ];

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Message Sent!</h2>
            <p className="text-white/70 mb-6">
              Thank you for reaching out. We'll get back to you within 24 hours.
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            Get in <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Touch</span>
          </h1>
          <p className="text-xl text-white/70 mb-8 max-w-3xl mx-auto">
            Have questions? Need support? Want to learn more? We're here to help.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Form */}
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white text-2xl">Send us a message</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/70 text-sm font-medium mb-2">Name *</label>
                      <Input
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-white/70 text-sm font-medium mb-2">Email *</label>
                      <Input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-white/70 text-sm font-medium mb-2">Company</label>
                    <Input
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      placeholder="Your company name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/70 text-sm font-medium mb-2">Subject *</label>
                    <Input
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      placeholder="What's this about?"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white/70 text-sm font-medium mb-2">Message *</label>
                    <Textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={5}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      placeholder="Tell us more about your inquiry..."
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Other ways to reach us</h2>
                <div className="space-y-6">
                  {contactInfo.map((info, index) => (
                    <Card key={index} className="bg-white/5 backdrop-blur-sm border-white/10">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            {info.icon}
                          </div>
                          <div>
                            <h3 className="text-white font-semibold mb-1">{info.title}</h3>
                            <p className="text-white/90 font-medium mb-1">{info.details}</p>
                            <p className="text-white/70 text-sm">{info.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardContent className="p-6">
                  <h3 className="text-white font-semibold mb-4">Frequently Asked Questions</h3>
                  <div className="space-y-4 text-white/70">
                    <div>
                      <p className="font-medium text-white">How quickly do you respond?</p>
                      <p className="text-sm">We typically respond within 24 hours during business days.</p>
                    </div>
                    <div>
                      <p className="font-medium text-white">Do you offer custom solutions?</p>
                      <p className="text-sm">Yes, we work with enterprise clients to create tailored solutions.</p>
                    </div>
                    <div>
                      <p className="font-medium text-white">Is there phone support?</p>
                      <p className="text-sm">Phone support is available for Professional and Enterprise plans.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
