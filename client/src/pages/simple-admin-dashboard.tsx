import React, { useEffect, useState, ErrorInfo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

// Error boundary component to catch rendering errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode, fallback: React.ReactNode },
  { hasError: boolean, error: Error | null }
> {
  constructor(props: { children: React.ReactNode, fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Dashboard render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Loading indicator component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  );
}

// Error display component
function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="container mx-auto py-12">
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Dashboard Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">There was an error loading the dashboard:</p>
          <div className="bg-destructive/10 p-4 rounded border border-destructive text-sm font-mono">
            {error}
          </div>
          <div className="mt-6">
            <p className="text-muted-foreground text-sm mb-2">Troubleshooting steps:</p>
            <ol className="list-decimal pl-5 space-y-1 text-sm">
              <li>Check if the server is running correctly</li>
              <li>Check for console errors (press F12)</li>
              <li>Try refreshing the page</li>
            </ol>
          </div>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// A super simplified admin dashboard for development mode
export default function SimpleAdminDashboard() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get application settings
  const { 
    data: settings,
    isLoading: isLoadingSettings,
    error: settingsError
  } = useQuery<any>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error(`Failed to fetch settings: ${res.status}`);
        return res.json();
      } catch (err) {
        console.error("Settings fetch error:", err);
        setError((err as Error).message);
        throw err;
      }
    },
    retry: 2,
  });

  // Check for connection to server
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/health");
        if (!res.ok) {
          throw new Error(`Server health check failed: ${res.status}`);
        }
        setIsLoading(false);
      } catch (err) {
        console.error("Server connection error:", err);
        setError((err as Error).message);
        setIsLoading(false);
      }
    };
    
    checkConnection();
  }, []);

  // Show error state
  if (error) {
    return <ErrorDisplay error={error} />;
  }

  // Show loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Content for dashboard
  const dashboardContent = (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard (Development)</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
          <Link href="/">
            <Button variant="destructive">Exit</Button>
          </Link>
        </div>
      </div>

      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle>Development Mode Active</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            You are viewing the simplified admin dashboard in development mode. 
            Authentication has been bypassed for easier development.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">System Settings</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingSettings ? (
                  <div className="text-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading settings...</p>
                  </div>
                ) : (
                  <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs h-48">
                    {JSON.stringify(settings, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Authentication Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Authentication Bypass:</span>
                    <span className="font-medium text-green-600">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span>User:</span>
                    <span className="font-medium">admin</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Environment:</span>
                    <span className="font-medium">Development</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Server Status:</span>
                    <span className="font-medium text-green-600">Connected</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Development Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <span className="mr-2 text-green-600">✓</span>
                <span>Authentication Bypass</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-green-600">✓</span>
                <span>Auto Admin Login</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-green-600">✓</span>
                <span>API Access</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-green-600">✓</span>
                <span>Settings Access</span>
              </li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Menu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/">
                  <span>Home</span>
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/visitor">
                  <span>Visitor Portal</span>
                </Link>
              </Button>
              <Button 
                variant="default" 
                className="w-full justify-start bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  toast({
                    title: "Full Dashboard",
                    description: "This feature is coming soon for development mode",
                  })
                }}
              >
                <span>Full Admin Dashboard</span>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Application:</span>
                <span className="font-medium">
                  {settings?.appName || "Visitor Management System"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Mode:</span>
                <span className="font-medium">Development</span>
              </div>
              <div className="flex justify-between">
                <span>API Status:</span>
                <span className="font-medium text-green-600">Connected</span>
              </div>
              <div className="flex justify-between">
                <span>Auth Bypass:</span>
                <span className="font-medium text-green-600">Active</span>
              </div>
              <div className="flex justify-between">
                <span>Language:</span>
                <span className="font-medium">{settings?.defaultLanguage || "en"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Wrap in error boundary
  return (
    <ErrorBoundary fallback={<ErrorDisplay error="Something went wrong rendering the dashboard" />}>
      {dashboardContent}
    </ErrorBoundary>
  );
}