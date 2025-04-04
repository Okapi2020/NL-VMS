import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogIn, UserCheck, ShieldCheck, Loader2 } from "lucide-react";
import { Settings } from "@shared/schema";
import { LiveClock } from "@/components/live-clock";
// ThemeToggle removed - only admins can control theme

export default function WelcomePage() {
  // Query to fetch application settings
  const { 
    data: settings, 
    isLoading: isLoadingSettings 
  } = useQuery<Settings>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  // Application names
  const appName = settings?.appName || "Visitor Management System";
  const headerAppName = settings?.headerAppName || appName;
  const footerAppName = settings?.footerAppName || appName;
  
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header with logo and admin login */}
      <header className="bg-card shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            {settings?.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt={appName} 
                className="h-10 mr-3 object-contain"
              />
            ) : (
              isLoadingSettings ? (
                <Loader2 className="h-10 w-10 mr-3 text-primary animate-spin" />
              ) : null
            )}
            <h1 className="text-3xl font-bold">{headerAppName}</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/auth" 
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted text-primary hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary" 
              title="Admin Login">
              <ShieldCheck className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Welcome card with big check-in button */}
            <Card className="bg-gradient-to-br from-primary/5 to-background shadow-lg">
              <CardContent className="pt-6 pb-10 px-8 flex flex-col items-center text-center">
                <div className="mb-6 h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCheck className="h-12 w-12 text-primary" />
                </div>
                
                <h2 className="text-2xl font-bold mb-3">Welcome, Visitor!</h2>
                
                <p className="text-muted-foreground mb-4">
                  Thank you for visiting. Please check in by clicking the button below.
                </p>
                
                {/* Live Clock Display */}
                <div className="mb-6 w-full flex justify-center">
                  <LiveClock />
                </div>
                
                <Link href="/visitor">
                  <Button size="lg" className="w-full text-lg py-6 font-medium">
                    <LogIn className="mr-2 h-6 w-6" />
                    Check In Now
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Information card */}
            <Card>
              <CardContent className="pt-6 px-8">
                <h3 className="text-xl font-semibold mb-4">Information</h3>
                
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Our visitor management system helps us create a safe and efficient environment.
                  </p>
                  
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Benefits:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Fast and easy check-in process</li>
                      <li>Digital visitor records</li>
                      <li>Improved security and compliance</li>
                      <li>Professional visitor experience</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Need Help?</h4>
                    <p>
                      Please approach the front desk if you need any assistance with the check-in process.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="text-center text-muted-foreground text-sm">
            <p>&copy; {new Date().getFullYear()} {footerAppName}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}