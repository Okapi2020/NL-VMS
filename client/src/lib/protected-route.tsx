import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  let auth;
  
  try {
    auth = useAuth();
  } catch (error) {
    console.error("Error using auth hook:", error);
    // Fallback to redirect to auth page if auth context is not available
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }
  
  const { user, isLoading } = auth;

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
