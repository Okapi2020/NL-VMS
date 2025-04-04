import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { VisitorCheckInForm } from "@/components/visitor-check-in-form";
import { VisitorCheckedIn } from "@/components/visitor-checked-in";
import { Visitor, Visit, Settings } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useIdleTimeout } from "@/hooks/use-idle-timeout";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2, Home } from "lucide-react";

function VisitorPortalComponent() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [, navigate] = useLocation();
  
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

  // Configure idle timeout to redirect to welcome page after 2 minutes of inactivity
  useIdleTimeout({
    timeout: 2 * 60 * 1000, // 2 minutes in milliseconds
    onIdle: () => {
      // Only redirect if checked in or if the form is empty (not being filled out)
      // This will need more sophisticated form state tracking in a real app
      navigate("/");
    },
    // Only enable if not actively filling out the form
    enabled: true
  });

  // We don't want to automatically check for stored visitor IDs
  // on the visitor portal page - it should only show the form

  // Query for active visit if visitor ID is available
  const { refetch } = useQuery({
    queryKey: ["/api/visitors/active-visit"],
    queryFn: async () => {
      const visitorId = localStorage.getItem("visitorId");
      if (!visitorId) return null;
      
      const res = await fetch(`/api/visitors/${visitorId}/active-visit`);
      if (res.status === 404) {
        // No active visit, clear localStorage
        localStorage.removeItem("visitorId");
        return null;
      }
      
      if (!res.ok) throw new Error("Failed to fetch active visit");
      
      const data = await res.json();
      setVisitor(data.visitor);
      setVisit(data.visit);
      setCheckedIn(true);
      return data;
    },
    enabled: false, // Don't run automatically, we'll trigger with refetch
  });

  const handleCheckInSuccess = (visitor: Visitor, visit: Visit) => {
    setVisitor(visitor);
    setVisit(visit);
    setCheckedIn(true);
    localStorage.setItem("visitorId", visitor.id.toString());
  };

  const handleCheckOut = () => {
    setCheckedIn(false);
    setVisitor(null);
    setVisit(null);
    localStorage.removeItem("visitorId");
  };

  // Default application name
  const appName = settings?.appName || "Visitor Management System";
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* No header with theme toggle - only admins can control theme */}
      
      {/* Main Content */}
      <main className="py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Page Title */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">
              Visitor Check-in
            </h1>
            <p className="mt-2 text-muted-foreground">
              Please fill out the form below to register your visit
            </p>
          </div>

          {/* Check-in Form or Checked-in Confirmation */}
          {checkedIn && visitor && visit ? (
            <VisitorCheckedIn 
              visitor={visitor} 
              visit={visit} 
              onCheckOut={handleCheckOut} 
            />
          ) : (
            <Card>
              <CardContent className="px-4 py-5 sm:p-6">
                <VisitorCheckInForm onSuccess={handleCheckInSuccess} />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

// Export with ErrorBoundary
export default function VisitorPortal() {
  return (
    <ErrorBoundary>
      <VisitorPortalComponent />
    </ErrorBoundary>
  );
}
