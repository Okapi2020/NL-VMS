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
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

function VisitorPortalComponent() {
  // Language state (default to French)
  const [isEnglish, setIsEnglish] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [, navigate] = useLocation();
  
  // Load language preference from localStorage on component mount
  useEffect(() => {
    const storedLang = localStorage.getItem('isEnglish');
    if (storedLang !== null) {
      setIsEnglish(storedLang === 'true');
    }
  }, []);
  
  // Toggle language and save to localStorage
  const toggleLanguage = () => {
    const newValue = !isEnglish;
    setIsEnglish(newValue);
    localStorage.setItem('isEnglish', String(newValue));
  };
  
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

  // Get application names from settings
  const appName = settings?.appName || "Visitor Management System";
  const headerAppName = settings?.headerAppName || appName;
  const footerAppName = settings?.footerAppName || appName;
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header with language toggle */}
      <header className="bg-card shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between w-full">
            <h1 className="text-2xl font-bold">{headerAppName}</h1>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleLanguage} 
              className="flex items-center gap-2"
            >
              <Languages size={18} />
              <span>{isEnglish ? 'Français' : 'English'}</span>
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Page Title */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">
              {isEnglish ? 'Visitor Check-in' : 'Enregistrement du Visiteur'}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {isEnglish 
                ? 'Please fill out the form below to register your visit' 
                : 'Veuillez remplir le formulaire ci-dessous pour enregistrer votre visite'}
            </p>
          </div>

          {/* Check-in Form or Checked-in Confirmation */}
          {checkedIn && visitor && visit ? (
            <VisitorCheckedIn 
              visitor={visitor} 
              visit={visit} 
              onCheckOut={handleCheckOut} 
              isEnglish={isEnglish}
            />
          ) : (
            <Card>
              <CardContent className="px-4 py-5 sm:p-6">
                <VisitorCheckInForm 
                  onSuccess={handleCheckInSuccess} 
                  isEnglish={isEnglish}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      {/* Footer with dynamic application name */}
      <footer className="py-6 px-4 mt-8 border-t">
        <div className="text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {footerAppName}
        </div>
      </footer>
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
