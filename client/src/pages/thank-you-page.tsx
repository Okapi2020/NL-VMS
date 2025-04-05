import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { CheckCircle, Clock, Home, Loader2 } from "lucide-react";
import { formatDate, formatTimeOnly, formatDuration } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import type { Visitor, Visit, Settings } from "@shared/schema";
import { ErrorBoundary } from "@/components/error-boundary";
import { RouteComponentProps } from "wouter";

type ThankYouPageProps = RouteComponentProps;

function ThankYouPageContent() {
  const [, navigate] = useLocation();
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const { language } = useLanguage();
  
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
  
  // Default application name
  const appName = settings?.appName || "Visitor Management System";
  
  // Redirect to home after 30 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/");
    }, 30000); // 30 seconds
    
    return () => clearTimeout(timer);
  }, [navigate]);
  
  // Try to get visitor data from localStorage
  useEffect(() => {
    try {
      const storedVisitor = localStorage.getItem("checkoutVisitor");
      const storedVisit = localStorage.getItem("checkoutVisit");
      
      if (storedVisitor && storedVisit) {
        setVisitor(JSON.parse(storedVisitor));
        setVisit(JSON.parse(storedVisit));
        
        // Clear the data after retrieving it
        localStorage.removeItem("checkoutVisitor");
        localStorage.removeItem("checkoutVisit");
      }
    } catch (error) {
      console.error("Error retrieving checkout data:", error);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header with logo */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            {settings?.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt={appName} 
                className="h-10 mr-3 object-contain"
              />
            ) : (
              isLoadingSettings ? (
                <Loader2 className="h-10 w-10 mr-3 text-primary-500 animate-spin" />
              ) : null
            )}
            <h1 className="text-2xl font-bold text-gray-900">{appName}</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-2xl bg-white shadow-lg overflow-hidden">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900">
                {language === 'fr' ? 'Merci de votre visite' : 'Thank You for Visiting'}
              </h2>
              <p className="mt-2 text-lg text-gray-600">
                {language === 'fr' 
                  ? 'Nous apprécions votre visite et espérons vous revoir bientôt.'
                  : 'We appreciate your visit and hope to see you again soon.'}
              </p>
            </div>
            
            {visitor && visit && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {language === 'fr' ? 'Résumé de la visite' : 'Visit Summary'}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{language === 'fr' ? 'Nom:' : 'Name:'}</span>
                    <span className="text-gray-900 font-medium">{visitor.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{language === 'fr' ? 'Heure d\'arrivée:' : 'Check-in Time:'}</span>
                    <span className="text-gray-900">
                      {formatDate(visit.checkInTime, language)} {language === 'fr' ? 'à' : 'at'} {formatTimeOnly(visit.checkInTime, language)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{language === 'fr' ? 'Heure de départ:' : 'Check-out Time:'}</span>
                    <span className="text-gray-900">
                      {visit.checkOutTime && (
                        <>
                          {formatDate(visit.checkOutTime, language)} {language === 'fr' ? 'à' : 'at'} {formatTimeOnly(visit.checkOutTime, language)}
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{language === 'fr' ? 'Durée:' : 'Duration:'}</span>
                    <span className="text-gray-900">
                      {visit.checkOutTime && (
                        formatDuration(visit.checkInTime, visit.checkOutTime, language)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{language === 'fr' ? 'Motif:' : 'Purpose:'}</span>
                    <span className="text-gray-900">{visit.purpose}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                <span>
                  {language === 'fr' 
                    ? 'Cette page sera automatiquement redirigée vers la page d\'accueil dans 30 secondes' 
                    : 'This page will automatically redirect to the home page in 30 seconds'}
                </span>
              </div>
              
              <Link href="/">
                <Button className="w-full" size="lg">
                  <Home className="h-5 w-5 mr-2" />
                  {language === 'fr' ? 'Retour à l\'accueil' : 'Return to Home'}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} {appName}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function ThankYouPage(props: RouteComponentProps) {
  return (
    <ErrorBoundary>
      <ThankYouPageContent />
    </ErrorBoundary>
  );
}