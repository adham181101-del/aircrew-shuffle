import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { InactivityManager } from "./components/InactivityManager";
import CookieConsent from "./components/gdpr/CookieConsent";
import { lazy, Suspense } from "react";

// Force Vercel cache refresh - v2.0.0
// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Upload = lazy(() => import("./pages/Upload"));
const ManageSwaps = lazy(() => import("./pages/ManageSwaps"));
const CreateShift = lazy(() => import("./pages/CreateShift"));
const CreateSwapRequest = lazy(() => import("./pages/CreateSwapRequest"));
const Profile = lazy(() => import("./pages/Profile"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const DataSubjectRights = lazy(() => import("./pages/DataSubjectRights"));
const SecurityDashboard = lazy(() => import("./pages/SecurityDashboard"));
const Features = lazy(() => import("./pages/Features"));
const Pricing = lazy(() => import("./pages/Pricing"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Api = lazy(() => import("./pages/Api"));
const Placeholder = lazy(() => import("./pages/Placeholder"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, initialized } = useAuth();
  
  // Show loading only briefly, with fallback
  if (loading && !initialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-sm text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }
  
  // If initialized but no user, redirect to login
  if (initialized && !user) {
    // Use window.location for Safari compatibility
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
      return null;
    }
    return <Navigate to="/login" replace />;
  }
  
  // If still loading after initialization, show content anyway
  if (loading && initialized) {
    return <InactivityManager>{children}</InactivityManager>;
  }
  
  return <InactivityManager>{children}</InactivityManager>;
};

// Public Route Component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/" element={<PublicRoute><Index /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
      <Route path="/swaps" element={<ProtectedRoute><ManageSwaps /></ProtectedRoute>} />
      <Route path="/swaps/create" element={<ProtectedRoute><CreateSwapRequest /></ProtectedRoute>} />
      <Route path="/shifts/create" element={<ProtectedRoute><CreateShift /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/data-rights" element={<ProtectedRoute><DataSubjectRights /></ProtectedRoute>} />
      <Route path="/security" element={<ProtectedRoute><SecurityDashboard /></ProtectedRoute>} />
      <Route path="/features" element={<Features />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/api" element={<Api />} />
      <Route path="/blog" element={<Placeholder title="Blog" description="Stay updated with the latest news, tips, and insights about shift management and workforce optimization." />} />
      <Route path="/careers" element={<Placeholder title="Careers" description="Join our team and help us revolutionize shift management for businesses worldwide." />} />
      <Route path="/help" element={<Placeholder title="Help Center" description="Find answers to common questions and learn how to get the most out of ShiftFlex." />} />
      <Route path="/docs" element={<Placeholder title="Documentation" description="Comprehensive guides and tutorials to help you integrate and use ShiftFlex effectively." />} />
      <Route path="/status" element={<Placeholder title="System Status" description="Check the current status of ShiftFlex services and get real-time updates on any issues." />} />
      <Route path="/community" element={<Placeholder title="Community" description="Connect with other ShiftFlex users, share tips, and get support from the community." />} />
      <Route path="/gdpr" element={<Placeholder title="GDPR Compliance" description="Learn about our commitment to data protection and privacy in compliance with UK GDPR regulations." />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ThemeProvider>
              <NotificationProvider>
                <AppRoutes />
                <CookieConsent />
              </NotificationProvider>
            </ThemeProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
