import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useContext, useState, useEffect } from "react";
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
  
  // State to track manual verification attempts
  const [isVerifyingManually, setIsVerifyingManually] = useState(false);
  const [manualUser, setManualUser] = useState<any>(null);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  
  // Manual verification function
  useEffect(() => {
    async function verifyAuthentication() {
      if (authContext !== null) {
        // If auth context exists, we don't need manual verification
        return;
      }
      
      setIsVerifyingManually(true);
      try {
        // Directly fetch the current user
        const res = await fetch("/api/admin/user", {
          credentials: "include"
        });
        
        if (res.ok) {
          const userData = await res.json();
          console.log("Manual authentication verification successful", userData);
          setManualUser(userData);
        } else {
          console.log("Manual authentication verification failed", res.status);
          setManualUser(null);
        }
      } catch (error) {
        console.error("Error during manual authentication verification:", error);
        setManualUser(null);
      } finally {
        setIsVerifyingManually(false);
      }
    }
    
    // Only run manual verification if auth context is null
    if (authContext === null) {
      console.log(`Attempting manual authentication verification (attempt ${verificationAttempts + 1})`);
      verifyAuthentication();
      
      // Limit verification attempts to prevent infinite loops
      if (verificationAttempts < 3) {
        setVerificationAttempts((prev: number) => prev + 1);
      }
    }
  }, [authContext, verificationAttempts]);
  
  // If auth context is null, try manual auth
  if (authContext === null) {
    if (isVerifyingManually) {
      return (
        <Route path={path}>
          <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-border" />
            <p className="text-muted-foreground">Verifying authentication...</p>
          </div>
        </Route>
      );
    }
    
    // If we have a manual user, show the component
    if (manualUser) {
      console.log("Using manually verified user for protected route");
      return <Route path={path} component={Component} />;
    }
    
    // Log detailed information for debugging
    console.error("Auth context is null and manual verification failed - redirecting to /auth");
    
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }
  
  // Standard auth context handling
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
          <p className="text-muted-foreground">Loading authentication...</p>
        </div>
      </Route>
    );
  }

  if (!user) {
    console.log("No authenticated user found in auth context - redirecting to /auth");
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
