import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useContext } from "react";
import { AuthContext } from "@/hooks/use-auth";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  // First check if auth context exists before using the hook
  const authContext = useContext(AuthContext);
  
  if (authContext === null) {
    console.error("Auth context is null - provider missing");
    // Redirect to auth page if auth context is not available
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }
  
  // Now use the hook safely
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
