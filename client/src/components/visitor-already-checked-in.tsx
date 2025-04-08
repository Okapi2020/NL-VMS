import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatTimeOnly, formatBadgeId } from "@/lib/utils";
import { AlertCircle, Tag, Phone, Timer, Home, Clock, Calendar, Info } from "lucide-react";
import { PhoneNumberLink } from "@/components/phone-number-link";
import { Visitor, Visit } from "@shared/schema";
import { Link, useLocation } from "wouter";

type VisitorAlreadyCheckedInProps = {
  visitor: Visitor;
  visit: Visit;
  isEnglish?: boolean;
};

export function VisitorAlreadyCheckedIn({ visitor, visit, isEnglish = true }: VisitorAlreadyCheckedInProps) {
  const [, navigate] = useLocation();
  const [countdown, setCountdown] = useState(7); // 7 seconds countdown
  const [autoRedirect, setAutoRedirect] = useState(true); // Control whether auto-redirect is enabled
  
  // Auto redirect after 7 seconds
  useEffect(() => {
    let timer: number;
    
    if (autoRedirect && countdown > 0) {
      timer = window.setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (autoRedirect && countdown === 0) {
      // When countdown reaches 0, navigate to home page
      navigate("/");
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown, autoRedirect, navigate]);

  // Function to format time
  const formatTime = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString(isEnglish ? 'en-US' : 'fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  // Function to format date
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString(isEnglish ? 'en-US' : 'fr-FR', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <Card className="mt-4 overflow-hidden border border-amber-400 dark:border-amber-400/70 shadow-md max-w-2xl mx-auto">
      {/* Top alert band */}
      <div className="bg-amber-500 dark:bg-amber-600 text-white py-2 px-3 flex items-center justify-center">
        <AlertCircle className="h-5 w-5 mr-2" />
        <h2 className="font-semibold text-base">
          {isEnglish ? "Already Checked In" : "Déjà Enregistré"}
        </h2>
      </div>
      
      <CardContent className="px-4 py-4 sm:p-5">
        {/* Main message */}
        <div className="text-center mb-3">
          <p className="text-amber-700 dark:text-amber-400 font-medium text-sm">
            {isEnglish 
              ? "You already have an active visit in our system."
              : "Vous avez déjà une visite active dans notre système."}
          </p>
        </div>
        
        {/* Visitor information box */}
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-4">
          <div className="flex items-center mb-2">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-2" />
            <h3 className="font-medium text-sm text-amber-800 dark:text-amber-300">
              {isEnglish ? "Your Active Visit Details" : "Détails de Votre Visite Active"}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center p-2 bg-white dark:bg-black/20 rounded border border-amber-200 dark:border-amber-800/50">
              <div className="bg-amber-100 dark:bg-amber-900/50 p-1.5 rounded-full mr-2">
                <Tag className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  {isEnglish ? "Visitor Name" : "Nom du Visiteur"}
                </div>
                <div className="font-medium text-sm">{visitor.fullName}</div>
              </div>
            </div>
            
            <div className="flex items-center p-2 bg-white dark:bg-black/20 rounded border border-amber-200 dark:border-amber-800/50">
              <div className="bg-amber-100 dark:bg-amber-900/50 p-1.5 rounded-full mr-2">
                <Phone className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  {isEnglish ? "Phone Number" : "Numéro de Téléphone"}
                </div>
                <div className="font-medium text-sm">
                  {visitor.phoneNumber ? (
                    <PhoneNumberLink phoneNumber={visitor.phoneNumber} />
                  ) : (
                    isEnglish ? "No phone provided" : "Aucun téléphone fourni"
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center p-2 bg-white dark:bg-black/20 rounded border border-amber-200 dark:border-amber-800/50">
              <div className="bg-amber-100 dark:bg-amber-900/50 p-1.5 rounded-full mr-2">
                <Calendar className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  {isEnglish ? "Visit Date" : "Date de Visite"}
                </div>
                <div className="font-medium text-sm">{formatDate(visit.checkInTime)}</div>
              </div>
            </div>
            
            <div className="flex items-center p-2 bg-white dark:bg-black/20 rounded border border-amber-200 dark:border-amber-800/50">
              <div className="bg-amber-100 dark:bg-amber-900/50 p-1.5 rounded-full mr-2">
                <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  {isEnglish ? "Check-in Time" : "Heure d'Arrivée"}
                </div>
                <div className="font-medium text-sm">{formatTime(visit.checkInTime)}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Countdown timer */}
        <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 rounded-md p-2 mb-4 text-center">
          <div className="flex justify-center items-center gap-1.5 mb-1">
            <Timer className="h-4 w-4 text-primary" />
            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
              {isEnglish 
                ? `Returning to home page in `
                : `Retour à la page d'accueil dans `}
              <span className="inline-flex items-center justify-center bg-primary text-primary-foreground rounded-full w-6 h-6 font-bold mx-1 text-sm">
                {countdown}
              </span>
              {isEnglish ? ` seconds...` : ` secondes...`}
            </p>
          </div>
          <button 
            onClick={() => setAutoRedirect(false)} 
            className="text-primary hover:text-primary/80 underline text-xs font-medium"
          >
            {isEnglish ? "Cancel Auto-Redirect" : "Annuler Redirection Auto"}
          </button>
          
          {!autoRedirect && (
            <p className="mt-1 text-xs text-green-600 dark:text-green-400">
              {isEnglish 
                ? "Auto-redirect cancelled. Please use the button below when ready."
                : "Redirection automatique annulée. Veuillez utiliser le bouton ci-dessous quand vous êtes prêt."}
            </p>
          )}
        </div>

        {/* Action button */}
        <div className="flex justify-center">
          <Link href="/">
            <Button 
              variant="default" 
              size="default"
              className="inline-flex items-center px-4 py-2 font-medium shadow-sm hover:shadow-md transition-all"
            >
              <Home className="h-4 w-4 mr-2" />
              {isEnglish ? "Back to Home" : "Retour à l'Accueil"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}