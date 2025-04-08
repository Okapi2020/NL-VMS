import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogIn, UserCheck, Loader2, Languages, CheckCircle } from "lucide-react";
import { Settings, Visitor, Visit } from "@shared/schema";
import { LiveClock } from "@/components/live-clock";
import { LanguageProvider } from "@/hooks/use-language";
import { VisitorTypeSelection } from "@/components/visitor-type-selection";
import { VisitorAlreadyCheckedIn } from "@/components/visitor-already-checked-in";

export default function WelcomePage() {
  // Use state for language toggle (default to French)
  const [isEnglish, setIsEnglish] = useState(false);
  const [location, navigate] = useLocation();
  
  // State for visitor type selection modal
  const [isTypeSelectionOpen, setIsTypeSelectionOpen] = useState(false);
  
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
  const { data: settings, isLoading: isLoadingSettings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    }
  });
  
  // Handle check-in button click
  const handleCheckInClick = () => {
    setIsTypeSelectionOpen(true);
  };
  
  // Handle selection of new visitor
  const handleNewVisitorSelected = () => {
    // Close the dialog first
    setIsTypeSelectionOpen(false);
    
    console.log('Welcome page: New visitor selected');
    
    // Use setTimeout to ensure the dialog is fully closed before navigating
    setTimeout(() => {
      navigate("/visitor?type=new");
    }, 50);
  };
  
  // New state for direct check-in experience on welcome page
  const [directCheckInLoading, setDirectCheckInLoading] = useState(false);
  const [checkedInVisitor, setCheckedInVisitor] = useState<Visitor | null>(null);
  const [checkedInVisit, setCheckedInVisit] = useState<Visit | null>(null);
  const [checkInCompleted, setCheckInCompleted] = useState(false);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  
  // Handle returning visitor confirmation - now does direct API call instead of navigation
  const handleReturningVisitorConfirmed = (
    visitor: Visitor | null, 
    prefill?: { phoneNumber: string; yearOfBirth?: number },
    activeVisit?: Visit,
    alreadyCheckedIn?: boolean
  ) => {
    // Always close the dialog first
    setIsTypeSelectionOpen(false);
    
    console.log('Welcome page: Returning visitor confirmed', visitor?.id, alreadyCheckedIn ? '(already checked in)' : '');
    
    // If visitor is already checked in, immediately show the already checked in screen
    if (visitor && alreadyCheckedIn && activeVisit) {
      console.log('Visitor already checked in, showing already checked in screen');
      setCheckedInVisitor(visitor);
      setCheckedInVisit(activeVisit);
      setCheckInCompleted(true);
      setAlreadyCheckedIn(true);
      localStorage.setItem("visitorId", visitor.id.toString());
      return;
    }
    
    if (visitor) {
      // Show loading state
      setDirectCheckInLoading(true);
      
      // Make direct API call to check in the visitor without navigation
      fetch('/api/visitors/check-in/returning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: visitor.id })
      })
      .then(response => {
        if (response.status === 409) {
          // Handle the case where visitor is already checked in (409 Conflict)
          return response.json().then(data => {
            console.log('Visitor already has an active check-in:', data);
            
            // We don't have the visit data from a 409 response, so we'll fetch it
            return fetch(`/api/visitors/${visitor.id}/active-visit`)
              .then(visitResponse => {
                if (visitResponse.ok) {
                  return visitResponse.json();
                }
                throw new Error('Failed to fetch active visit data');
              })
              .then(visitData => {
                // Now we have the active visit data
                setCheckedInVisitor(visitor);
                setCheckedInVisit(visitData.visit);
                setCheckInCompleted(true);
                setAlreadyCheckedIn(true);
                localStorage.setItem("visitorId", visitor.id.toString());
                setDirectCheckInLoading(false);
                return { alreadyCheckedIn: true };
              });
          });
        }
        
        if (!response.ok) {
          throw new Error('Failed to check in returning visitor');
        }
        
        return response.json();
      })
      .then(data => {
        // Skip if we already processed an "already checked in" response
        if (data.alreadyCheckedIn) return;
        
        console.log('Check-in successful on welcome page:', data);
        
        // Update state with visitor and visit data
        setCheckedInVisitor(data.visitor);
        setCheckedInVisit(data.visit);
        setCheckInCompleted(true);
        
        // Store visitor ID in localStorage for session management
        localStorage.setItem("visitorId", data.visitor.id.toString());
        
        // Hide loading
        setDirectCheckInLoading(false);
      })
      .catch(error => {
        console.error('Error checking in visitor directly:', error);
        setDirectCheckInLoading(false);
        
        // On error, navigate to visitor page to fill out the form
        setTimeout(() => {
          navigate("/visitor?type=new");
        }, 100);
      });
    } else if (prefill) {
      // For visitors not found, navigate to visitor page with prefill info
      const params = new URLSearchParams();
      params.set('type', 'prefill');
      params.set('phoneNumber', prefill.phoneNumber);
      if (prefill.yearOfBirth) {
        params.set('yearOfBirth', prefill.yearOfBirth.toString());
      }
      
      // Use setTimeout to ensure the dialog is fully closed before navigating
      setTimeout(() => {
        navigate(`/visitor?${params.toString()}`);
      }, 100);
    }
  };

  // Application names
  const appName = settings?.appName || "Visitor Management System";
  const headerAppName = settings?.headerAppName || appName;
  const footerAppName = settings?.footerAppName || appName;
  
  // Function to handle home button click (go back to welcome screen)
  const handleHomeClick = () => {
    setCheckInCompleted(false);
    setCheckedInVisitor(null);
    setCheckedInVisit(null);
    setAlreadyCheckedIn(false);
    localStorage.removeItem("visitorId");
  };
  
  // Auto-redirect to home page after 7 seconds with countdown
  const [countdown, setCountdown] = useState(7);
  
  useEffect(() => {
    let redirectTimer: NodeJS.Timeout | null = null;
    let countdownTimer: NodeJS.Timeout | null = null;
    
    if (checkInCompleted && checkedInVisitor) {
      // Reset countdown when check-in completes
      setCountdown(7);
      
      // Update countdown every second
      countdownTimer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer as NodeJS.Timeout);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Set the redirect timer
      redirectTimer = setTimeout(() => {
        handleHomeClick();
      }, 7000); // 7 seconds
    } else {
      // Reset countdown when not on success screen
      setCountdown(7);
    }
    
    return () => {
      if (redirectTimer) clearTimeout(redirectTimer);
      if (countdownTimer) clearInterval(countdownTimer);
    };
  }, [checkInCompleted, checkedInVisitor]);
  
  return (
    <LanguageProvider defaultLanguage={isEnglish ? 'en' : 'fr'}>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        {/* Header with logo */}
        <header className="bg-card shadow">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between w-full">
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

        {/* Main content */}
        <main className="flex-grow">
          <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
            {directCheckInLoading ? (
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
            ) : checkInCompleted && checkedInVisitor && checkedInVisit ? (
              <div className="max-w-3xl mx-auto">
                {alreadyCheckedIn ? (
                  // Show the "Already Checked In" warning screen
                  <VisitorAlreadyCheckedIn
                    visitor={checkedInVisitor}
                    visit={checkedInVisit}
                    isEnglish={isEnglish}
                  />
                ) : (
                  // Show the regular check-in success screen
                  <>
                    <div className="mb-8 text-center">
                      <h1 className="text-3xl font-bold">
                        {isEnglish ? 'Check-in Successful!' : 'Enregistrement Réussi!'}
                      </h1>
                    </div>
                    <Card>
                      <CardContent className="p-6">
                        <div className="space-y-6">
                          <div className="flex items-center justify-center mb-4">
                            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                              <CheckCircle className="h-12 w-12 text-green-600" />
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <h2 className="text-xl font-semibold">
                              {isEnglish 
                                ? `Welcome, ${checkedInVisitor.fullName}!` 
                                : `Bienvenue, ${checkedInVisitor.fullName}!`}
                            </h2>
                            <p className="text-muted-foreground mt-1">
                              {isEnglish 
                                ? 'You have successfully checked in.' 
                                : 'Vous vous êtes enregistré avec succès.'}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-md">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                {isEnglish ? 'Check-in Time' : 'Heure d\'arrivée'}
                              </p>
                              <p className="font-medium">
                                {new Date(checkedInVisit.checkInTime).toLocaleTimeString(
                                  isEnglish ? 'en-US' : 'fr-FR',
                                  { hour: '2-digit', minute: '2-digit' }
                                )}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-muted-foreground">
                                {isEnglish ? 'Date' : 'Date'}
                              </p>
                              <p className="font-medium">
                                {new Date(checkedInVisit.checkInTime).toLocaleDateString(
                                  isEnglish ? 'en-US' : 'fr-FR'
                                )}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-muted-foreground">
                                {isEnglish ? 'Visitor ID' : 'ID de visiteur'}
                              </p>
                              <p className="font-medium">{checkedInVisitor.id}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-muted-foreground">
                                {isEnglish ? 'Visit Purpose' : 'Raison de la visite'}
                              </p>
                              <p className="font-medium">
                                {checkedInVisit.purpose || (isEnglish ? 'Not specified' : 'Non spécifié')}
                              </p>
                            </div>
                          </div>
                          
                          {/* Countdown display */}
                          <div className="text-center mb-3 text-sm text-muted-foreground">
                            {isEnglish 
                              ? `Redirecting to home in ${countdown} seconds...` 
                              : `Redirection vers l'accueil dans ${countdown} secondes...`}
                          </div>
                          
                          <div className="border-t pt-4 flex justify-center">
                            <Button
                              onClick={handleHomeClick}
                              className="w-40"
                            >
                              <LogIn className="mr-2 h-5 w-5" />
                              {isEnglish ? 'Home' : 'Accueil'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                {/* Welcome card with check-in button */}
                <Card className="bg-gradient-to-br from-primary/5 to-background shadow-lg">
                  <CardContent className="pt-6 pb-10 px-8 flex flex-col items-center text-center">
                    <div className="mb-6 h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCheck className="h-12 w-12 text-primary" />
                    </div>
                    
                    <h2 className="text-2xl font-bold mb-3">
                      {isEnglish ? 'Welcome, Visitor!' : 'Bienvenue, Visiteur!'}
                    </h2>
                    
                    <p className="text-muted-foreground mb-4">
                      {isEnglish 
                        ? 'Thank you for visiting. Please check in by clicking the button below.' 
                        : 'Merci de votre visite. Veuillez vous enregistrer en cliquant sur le bouton ci-dessous.'}
                    </p>
                    
                    {/* Live Clock Display */}
                    <div className="mb-6 w-full flex justify-center">
                      <LiveClock />
                    </div>
                    
                    <Button 
                      size="lg" 
                      className="w-full text-lg py-6 font-medium"
                      onClick={handleCheckInClick}
                    >
                      <LogIn className="mr-2 h-6 w-6" />
                      {isEnglish ? 'Check In Now' : 'SIGNALER MON ARRIVÉE'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Information card */}
                <Card>
                  <CardContent className="pt-6 px-8">
                    <h3 className="text-xl font-semibold mb-4">
                      {isEnglish ? 'Information' : 'Informations'}
                    </h3>
                    
                    <div className="space-y-4 text-muted-foreground">
                      <p>
                        {isEnglish 
                          ? 'Our visitor management system helps us create a safe and efficient environment.' 
                          : 'Notre système de gestion des visiteurs nous aide à créer un environnement sûr et efficace.'}
                      </p>
                      
                      <div>
                        <h4 className="font-medium text-foreground mb-1">
                          {isEnglish ? 'Benefits:' : 'Avantages:'}
                        </h4>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>
                            {isEnglish 
                              ? 'Fast and easy check-in process' 
                              : 'Processus d\'enregistrement rapide et facile'}
                          </li>
                          <li>
                            {isEnglish 
                              ? 'Digital visitor records' 
                              : 'Registres numériques des visiteurs'}
                          </li>
                          <li>
                            {isEnglish 
                              ? 'Improved security and compliance' 
                              : 'Sécurité et conformité améliorées'}
                          </li>
                          <li>
                            {isEnglish 
                              ? 'Professional visitor experience' 
                              : 'Expérience professionnelle pour les visiteurs'}
                          </li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-foreground mb-1">
                          {isEnglish ? 'Need Help?' : 'Besoin d\'aide?'}
                        </h4>
                        <p>
                          {isEnglish 
                            ? 'Please approach the front desk if you need any assistance with the check-in process.' 
                            : 'Veuillez vous adresser à la réception si vous avez besoin d\'aide avec le processus d\'enregistrement.'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
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
      
      {/* Visitor Type Selection Modal */}
      <VisitorTypeSelection
        isOpen={isTypeSelectionOpen}
        onClose={() => setIsTypeSelectionOpen(false)}
        onNewVisitorSelected={handleNewVisitorSelected}
        onReturningVisitorConfirmed={handleReturningVisitorConfirmed}
        isEnglish={isEnglish}
      />
    </LanguageProvider>
  );
}