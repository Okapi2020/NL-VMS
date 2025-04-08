import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatTimeOnly, formatBadgeId } from "@/lib/utils";
import { AlertTriangle, Tag, Phone, Timer, Home } from "lucide-react";
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

  return (
    <Card className="mt-8">
      <CardContent className="px-4 py-5 sm:p-6 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30">
          <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>

        <h3 className="mt-3 text-lg font-medium text-amber-700 dark:text-amber-400">
          {isEnglish ? "Already Checked In" : "Déjà Enregistré"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {isEnglish 
            ? "You are already checked in to our system. Here are your current visit details."
            : "Vous êtes déjà enregistré dans notre système. Voici les détails de votre visite en cours."}
        </p>

        <div className="mt-4 border-t pt-4 border-border">
          <p className="text-sm font-medium text-muted-foreground">
            {isEnglish ? "Your active visit:" : "Votre visite active :"}
          </p>
          <div className="mt-2 text-sm grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
            <div>
              <span className="font-medium">{isEnglish ? "Name:" : "Nom :"}</span>{" "}
              <span>{visitor.fullName}</span>
            </div>
            <div>
              <span className="font-medium">{isEnglish ? "Check-in time:" : "Heure d'arrivée :"}</span>{" "}
              <span>{formatTimeOnly(visit.checkInTime)}</span>
            </div>

            <div className="flex items-center">
              <Tag className="h-4 w-4 mr-1 text-primary" />
              <span className="font-medium">{isEnglish ? "Badge ID:" : "Numéro de badge :"}</span>{" "}
              <span className="font-mono text-primary ml-1">{formatBadgeId(visitor.id)}</span>
            </div>
            
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-1 text-muted-foreground" />
              <span className="font-medium">{isEnglish ? "Phone:" : "Téléphone :"}</span>{" "}
              <span className="ml-1">
                {visitor.phoneNumber ? (
                  <PhoneNumberLink phoneNumber={visitor.phoneNumber} />
                ) : (
                  isEnglish ? "No phone provided" : "Aucun téléphone fourni"
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <Timer className="h-4 w-4" />
            <span>
              {isEnglish 
                ? `Returning to home page in ${countdown} seconds...`
                : `Retour à la page d'accueil dans ${countdown} secondes...`}
            </span>
            <button 
              onClick={() => setAutoRedirect(false)} 
              className="text-primary hover:text-primary/80 underline text-xs"
            >
              {isEnglish ? "Cancel" : "Annuler"}
            </button>
          </div>
          {!autoRedirect && (
            <p className="mt-1 text-xs text-green-600 dark:text-green-400">
              {isEnglish 
                ? "Auto-redirect cancelled. You can use the button below when ready."
                : "Redirection automatique annulée. Vous pouvez utiliser le bouton ci-dessous quand vous êtes prêt."}
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-center">
          <Link href="/">
            <Button variant="default" className="inline-flex items-center px-6">
              <Home className="h-4 w-4 mr-2" />
              {isEnglish ? "Back to Home" : "Retour à l'Accueil"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}