import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import ManageSwaps from "./pages/ManageSwaps";
import CreateShift from "./pages/CreateShift";
import CreateSwapRequest from "./pages/CreateSwapRequest";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  console.log('ProtectedRoute: user=', user, 'loading=', loading);
  
  // Show loading for a bit longer to ensure auth state is properly initialized
  if (loading) {
    console.log('ProtectedRoute: Showing loading spinner');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        <p className="text-sm text-muted-foreground">Please wait while we verify your authentication</p>
      </div>
    );
  }
  
  if (!user) {
    console.log('ProtectedRoute: No user, redirecting to login');
    // Use window.location for Safari compatibility
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
      return null;
    }
    return <Navigate to="/login" replace />;
  }
  
  console.log('ProtectedRoute: User authenticated, showing children');
  return <>{children}</>;
};

// Public Route Component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  console.log('PublicRoute: user=', user, 'loading=', loading);
  
  if (loading) {
    console.log('PublicRoute: Showing loading spinner');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (user) {
    console.log('PublicRoute: User found, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }
  
  console.log('PublicRoute: No user, showing login form');
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<PublicRoute><Index /></PublicRoute>} />
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
    <Route path="/swaps" element={<ProtectedRoute><ManageSwaps /></ProtectedRoute>} />
    <Route path="/swaps/create" element={<ProtectedRoute><CreateSwapRequest /></ProtectedRoute>} />
    <Route path="/shifts/create" element={<ProtectedRoute><CreateShift /></ProtectedRoute>} />
    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
