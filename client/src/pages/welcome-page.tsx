import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogIn, UserCheck, Loader2, Languages } from "lucide-react";
import { Settings } from "@shared/schema";
import { LiveClock } from "@/components/live-clock";

export default function WelcomePage() {
  // Use state for language toggle (default to French)
  const [isEnglish, setIsEnglish] = useState(false);
  
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

  // Application names
  const appName = settings?.appName || "Visitor Management System";
  const headerAppName = settings?.headerAppName || appName;
  const footerAppName = settings?.footerAppName || appName;
  
  return (
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
                  <LiveClock isEnglish={isEnglish} />
                </div>
                
                <Link href="/visitor">
                  <Button size="lg" className="w-full text-lg py-6 font-medium text-white">
                    <LogIn className="mr-2 h-6 w-6 text-white" />
                    {isEnglish ? 'Check In Now' : 'ARRIVÉE'}
                  </Button>
                </Link>
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