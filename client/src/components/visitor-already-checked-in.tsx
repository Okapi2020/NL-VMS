import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatTimeOnly, formatBadgeId } from "@/lib/utils";
import { AlertCircle, Tag, Phone, Timer, Home, Clock, Calendar, Info } from "lucide-react";
import { PhoneNumberLink } from "@/components/phone-number-link";
import { Visitor, Visit } from "@shared/schema";
import { useLocation } from "wouter";

type VisitorAlreadyCheckedInProps = {
  visitor: Visitor;
  visit: Visit;
  isEnglish?: boolean;
  onReturn?: () => void; // Optional callback for return button
};

export function VisitorAlreadyCheckedIn({ visitor, visit, isEnglish = true, onReturn }: VisitorAlreadyCheckedInProps) {
  const [, navigate] = useLocation();
  const [countdown, setCountdown] = useState(7); // 7 seconds countdown
  const [autoRedirect, setAutoRedirect] = useState(true); // Control whether auto-redirect is enabled
  
  // Function to handle returning to home
  const handleReturn = () => {
    if (onReturn) {
      // Call the onReturn handler passed from parent component
      onReturn();
    } else {
      // Default behavior - just navigate to home
      navigate("/");
    }
  };
  
  // Auto redirect after 7 seconds
  useEffect(() => {
    let timer: number;
    
    if (autoRedirect && countdown > 0) {
      timer = window.setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (autoRedirect && countdown === 0) {
      // When countdown reaches 0, call the handleReturn function
      handleReturn();
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown, autoRedirect, navigate, onReturn]);

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
    <Card className="mt-4 overflow-hidden border border-amber-400 dark:border-amber-400/70 shadow-md max-w-md mx-auto">
      <CardContent className="px-4 py-5 sm:p-6">
        {/* Avatar and personalized message */}
        <div className="flex flex-col items-center justify-center mb-4">
          <div className="relative mb-3">
            <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center border-2 border-amber-400">
              <span className="text-amber-600 dark:text-amber-400 text-xl font-bold">
                {visitor.fullName 
                  ? visitor.fullName.split(' ').map(name => name[0]).join('').substring(0, 2)
                  : '?'}
              </span>
            </div>
            <div className="absolute -top-1 -right-1 bg-amber-500 dark:bg-amber-600 text-white p-1 rounded-full">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          
          <h2 className="font-medium text-base text-amber-700 dark:text-amber-400 mb-1">
            {isEnglish ? "Hello" : "Bonjour"}, {visitor.fullName?.split(' ')[0] || "Visitor"}!
          </h2>
          
          <p className="text-center text-sm text-gray-700 dark:text-gray-300">
            {isEnglish 
              ? `You are already checked in for today.`
              : `Vous êtes déjà enregistré pour aujourd'hui.`}
          </p>
          
          <div className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">
            {isEnglish 
              ? `Check-in time: ${formatTime(visit.checkInTime)}`
              : `Heure d'arrivée: ${formatTime(visit.checkInTime)}`}
          </div>
        </div>
        
        {/* Countdown timer */}
        <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 rounded-md p-2 mb-4 text-center">
          <div className="flex justify-center items-center gap-1.5 mb-1">
            <Timer className="h-4 w-4 text-primary" />
            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
              {isEnglish 
                ? `Returning to home in `
                : `Retour à l'accueil dans `}
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
                ? "Auto-redirect cancelled. Use the button below when ready."
                : "Redirection automatique annulée. Utilisez le bouton ci-dessous quand vous êtes prêt."}
            </p>
          )}
        </div>

        {/* Action button */}
        <div className="flex justify-center">
          <Button 
            variant="default" 
            size="default"
            className="inline-flex items-center px-5 py-2 font-medium shadow-sm hover:shadow-md transition-all"
            onClick={handleReturn}
          >
            <Home className="h-4 w-4 mr-2" />
            {isEnglish ? "Back to Home" : "Retour à l'Accueil"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}