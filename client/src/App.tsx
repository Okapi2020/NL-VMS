import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import VisitorPortal from "@/pages/visitor-portal";
import AdminDashboard from "@/pages/admin-dashboard";
import AuthPage from "@/pages/auth-page";
import WelcomePage from "@/pages/welcome-page";
import ThankYouPage from "@/pages/thank-you-page";
import { ProtectedRoute } from "@/lib/protected-route";
import { LanguageProvider } from "@/hooks/use-language";

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
          // In development mode, render the AdminDashboard directly without protection
          if (isDevelopment) {
            console.log("Development mode: Bypassing protected route wrapper for admin dashboard");
            return <AdminDashboard />;
          }
          // In production, use the ProtectedRoute wrapper
          return <ProtectedRoute path="/admin" component={AdminDashboard} />;
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
    <>
      <Router />
    </>
  );
}

export default App;
