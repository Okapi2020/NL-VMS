import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import VisitorPortal from "@/pages/visitor-portal";
import AdminDashboard from "@/pages/admin-dashboard";
import SimpleAdminDashboard from "@/pages/simple-admin-dashboard"; // Simple dashboard for fallback
import AuthPage from "@/pages/auth-page";
import WelcomePage from "@/pages/welcome-page";
import ThankYouPage from "@/pages/thank-you-page";
import { ProtectedRoute } from "@/lib/protected-route";
import { LanguageProvider } from "@/hooks/use-language";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { NotificationProvider } from "@/hooks/use-notifications";

function Router() {
  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV === true;
  
  return (
    <Switch>
      <Route path="/" component={WelcomePage} />
      <Route path="/visitor" component={VisitorPortal} />
      <Route path="/thank-you" component={ThankYouPage} />
      <Route path="/admin">
        {() => {
          if (isDevelopment) {
            console.log("Development mode: Using full admin dashboard with auto-authentication");
            // In development, render the regular admin dashboard directly 
            // (auth is auto-handled in the AuthProvider)
            return <AdminDashboard />;
          }
          // In production, use the ProtectedRoute wrapper for security
          return <ProtectedRoute path="/admin" component={AdminDashboard} />;
        }}
      </Route>
      <Route path="/admin/simple">
        {() => {
          // An alternative simplified dashboard for development troubleshooting
          if (isDevelopment) {
            return <SimpleAdminDashboard />;
          }
          return <Redirect to="/admin" />;
        }}
      </Route>
      <Route path="/auth">
        {() => {
          // In development mode, redirect to admin dashboard
          if (isDevelopment) {
            console.log("Development mode: Redirecting from auth to admin dashboard");
            return <Redirect to="/admin" />;
          }
          // In production, show the auth page
          return <AuthPage />;
        }}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <NotificationProvider>
            <Router />
            <Toaster />
          </NotificationProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
