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
  return (
    <Switch>
      <Route path="/" component={WelcomePage} />
      <Route path="/visitor" component={VisitorPortal} />
      <Route path="/thank-you" component={ThankYouPage} />
      {/* Wrapped in a try-catch to handle potential context errors */}
      <Route path="/admin">
        {() => {
          try {
            return <ProtectedRoute path="/admin" component={AdminDashboard} />;
          } catch (error) {
            console.error("Error in protected route:", error);
            return <Redirect to="/auth" />;
          }
        }}
      </Route>
      <Route path="/auth" component={AuthPage} />
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
