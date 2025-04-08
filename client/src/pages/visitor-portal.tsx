import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { VisitorCheckInForm } from "@/components/visitor-check-in-form";
import { VisitorCheckedIn } from "@/components/visitor-checked-in";
import { Visitor, Visit, Settings, VisitorFormValues } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useIdleTimeout } from "@/hooks/use-idle-timeout";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { VisitorTypeSelection } from "@/components/visitor-type-selection";

function VisitorPortalComponent() {
  // Language state (default to French)
  const [isEnglish, setIsEnglish] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [location, navigate] = useLocation();
  
  // State for visitor type selection modal
  const [isTypeSelectionOpen, setIsTypeSelectionOpen] = useState(false);
  const [formDefaultValues, setFormDefaultValues] = useState<Partial<VisitorFormValues>>({});
  const [showForm, setShowForm] = useState(false);
  const [returningVisitor, setReturningVisitor] = useState<Visitor | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Parse URL query parameters on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    
    if (type === 'new') {
      // For new visitors, just show the form
      setShowForm(true);
      setFormDefaultValues({});
      setReturningVisitor(null);
    } 
    else if (type === 'returning') {
      // For returning visitors, get the visitor from the API
      const visitorId = params.get('visitorId');
      if (visitorId) {
        // Set loading state while fetching
        setIsLoading(true);
        
        fetch(`/api/visitors/${visitorId}`)
          .then(res => res.json())
          .then(data => {
            if (data) {
              // Instead of showing the form, directly check in the returning visitor
              checkInReturningVisitor(data);
            }
          })
          .catch(err => {
            console.error('Error fetching visitor:', err);
            setShowForm(true);
            setIsLoading(false);
          });
      } else {
        setShowForm(true);
      }
    }
    else if (type === 'prefill') {
      // For prefill info (when phone number lookup failed)
      const phoneNumber = params.get('phoneNumber');
      const yearOfBirth = params.get('yearOfBirth');
      
      if (phoneNumber) {
        setFormDefaultValues({
          phoneNumber,
          ...(yearOfBirth ? { yearOfBirth: parseInt(yearOfBirth) } : {}),
        });
        setShowForm(true);
      } else {
        setIsTypeSelectionOpen(true);
      }
    }
    else if (!type && !showForm && !checkedIn) {
      // If no parameters and not already showing form/checked in, show selection modal
      setIsTypeSelectionOpen(true);
    }
  }, [location]);
  
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

  // Handle check-in success (could be new or returning visitor)
  const handleCheckInSuccess = (visitor: Visitor, visit: Visit) => {
    setVisitor(visitor);
    setVisit(visit);
    setCheckedIn(true);
    localStorage.setItem("visitorId", visitor.id.toString());
    
    // Reset form-related states
    setShowForm(false);
    setFormDefaultValues({});
    setReturningVisitor(null);
  };

  // Handle check-out
  const handleCheckOut = () => {
    setCheckedIn(false);
    setVisitor(null);
    setVisit(null);
    localStorage.removeItem("visitorId");
  };
  
  // Handle checking in click - open the visitor type selection modal
  const handleCheckInClick = () => {
    setIsTypeSelectionOpen(true);
  };
  
  // Handle selection of new visitor
  const handleNewVisitorSelected = () => {
    setIsTypeSelectionOpen(false);
    setShowForm(true);
    setFormDefaultValues({});
    setReturningVisitor(null);
  };
  
  // Handle selection of returning visitor or prefill info for a not-found visitor
  // Function to directly check in a returning visitor without going through the form
  const checkInReturningVisitor = async (visitor: Visitor) => {
    setIsLoading(true);
    console.log('Starting direct check-in for visitor:', visitor.id);
    
    try {
      // Make API call to check in the visitor directly
      const response = await fetch('/api/visitors/check-in/returning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId: visitor.id
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Successfully checked in returning visitor:', data);
        
        // First reset the form-related states
        setShowForm(false);
        setFormDefaultValues({});
        setReturningVisitor(null);
        
        // Then update the states that trigger the success view
        setVisitor(data.visitor);
        setVisit(data.visit);
        setCheckedIn(true);
        
        // Store visitor ID in localStorage for session management
        localStorage.setItem("visitorId", data.visitor.id.toString());
      } else {
        console.error('Failed to check in returning visitor:', await response.text());
        // If check-in fails, fall back to the form
        showReturningVisitorForm(visitor);
      }
    } catch (error) {
      console.error('Error checking in returning visitor:', error);
      // If check-in fails, fall back to the form
      showReturningVisitorForm(visitor);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to show the form prefilled with returning visitor data
  const showReturningVisitorForm = (visitor: Visitor) => {
    setReturningVisitor(visitor);
    setShowForm(true);
    setFormDefaultValues({
      firstName: visitor.fullName.split(' ')[0] || '',
      lastName: visitor.fullName.split(' ').slice(-1)[0] || '',
      yearOfBirth: visitor.yearOfBirth,
      phoneNumber: visitor.phoneNumber,
      email: visitor.email || '',
      sex: (visitor.sex as "Masculin" | "Feminin" | undefined) || undefined,
    });
  };

  const handleReturningVisitorConfirmed = (visitor: Visitor | null, prefill?: { phoneNumber: string; yearOfBirth?: number }) => {
    setIsTypeSelectionOpen(false);
    
    if (visitor) {
      // Directly check in the returning visitor without going through the form
      checkInReturningVisitor(visitor);
    } else if (prefill) {
      // Prefill the phone number for a new visitor who tried to return
      setShowForm(true);
      setFormDefaultValues({
        phoneNumber: prefill.phoneNumber,
        yearOfBirth: prefill.yearOfBirth
      });
    }
  };

  // Get application names from settings
  const appName = settings?.appName || "Visitor Management System";
  const headerAppName = settings?.headerAppName || appName;
  const footerAppName = settings?.footerAppName || appName;
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Visitor Type Selection Modal */}
      <VisitorTypeSelection 
        isOpen={isTypeSelectionOpen}
        onClose={() => setIsTypeSelectionOpen(false)}
        onNewVisitorSelected={handleNewVisitorSelected}
        onReturningVisitorConfirmed={handleReturningVisitorConfirmed}
        isEnglish={isEnglish}
      />
      
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

          {/* Loading State */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <div className="my-4">
                  <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary mx-auto"></div>
                </div>
                <p className="text-lg font-medium">
                  {isEnglish ? 'Processing check-in...' : 'Traitement de l\'enregistrement...'}
                </p>
              </div>
            </div>
          ) : checkedIn && visitor && visit ? (
            <VisitorCheckedIn 
              visitor={visitor} 
              visit={visit} 
              onCheckOut={handleCheckOut} 
              isEnglish={isEnglish}
            />
          ) : showForm ? (
            <Card>
              <CardContent className="px-4 py-5 sm:p-6">
                <VisitorCheckInForm 
                  onSuccess={handleCheckInSuccess}
                  defaultValues={formDefaultValues}
                  isReturningVisitor={!!returningVisitor}
                  returningVisitor={returningVisitor}
                  isEnglish={isEnglish}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="py-6 text-center">
              <Button 
                size="lg" 
                className="px-8 py-6 text-lg"
                onClick={handleCheckInClick}
              >
                {isEnglish ? 'Check In' : 'Enregistrement'}
              </Button>
            </div>
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
