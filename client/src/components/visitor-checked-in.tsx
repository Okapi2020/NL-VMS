import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatTimeOnly, formatBadgeId } from "@/lib/utils";
import { Check, Tag, Phone, Timer } from "lucide-react";
import { PhoneNumberLink } from "@/components/phone-number-link";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Visitor, Visit } from "@shared/schema";
import { Link, useLocation } from "wouter";

type VisitorCheckedInProps = {
  visitor: Visitor;
  visit: Visit;
  onCheckOut: () => void;
  isEnglish?: boolean;
};

export function VisitorCheckedIn({ visitor, visit, onCheckOut, isEnglish = true }: VisitorCheckedInProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [countdown, setCountdown] = useState(6); // 6 seconds countdown
  const [autoRedirect, setAutoRedirect] = useState(true); // Control whether auto-redirect is enabled
  
  // Auto redirect after 6 seconds
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

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/visitors/check-out", { visitId: visit.id });
      return await res.json();
    },
    onSuccess: (updatedVisit) => {
      toast({
        title: isEnglish ? "Check-out successful" : "Déconnexion réussie",
        description: isEnglish 
          ? "You have been checked out successfully. Thank you for your visit!" 
          : "Vous avez été déconnecté avec succès. Merci pour votre visite !",
      });
      
      try {
        // Save visit and visitor data to localStorage for the thank you page
        localStorage.setItem("checkoutVisitor", JSON.stringify(visitor));
        localStorage.setItem("checkoutVisit", JSON.stringify({
          ...visit,
          checkOutTime: updatedVisit.checkOutTime,
          active: false
        }));
        
        // Navigate to thank you page
        navigate("/thank-you");
      } catch (error) {
        console.error("Error saving checkout data:", error);
      }
      
      onCheckOut();
    },
    onError: (error: Error) => {
      toast({
        title: isEnglish ? "Check-out failed" : "Échec de la déconnexion",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCheckOut = () => {
    if (confirm(isEnglish ? "Are you sure you want to check out?" : "Êtes-vous sûr de vouloir vous déconnecter ?")) {
      checkOutMutation.mutate();
    }
  };

  return (
    <Card className="mt-8">
      <CardContent className="px-4 py-5 sm:p-6 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30">
          <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>

        <h3 className="mt-3 text-lg font-medium">
          {isEnglish ? "Successfully Checked In" : "Enregistrement Réussi"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {isEnglish 
            ? "Thank you for checking in. You have been registered in the system."
            : "Merci de vous être enregistré. Vous avez été enregistré dans le système."}
        </p>

        <div className="mt-4 border-t pt-4 border-border">
          <p className="text-sm font-medium text-muted-foreground">
            {isEnglish ? "Your check-in details:" : "Détails de votre enregistrement :"}
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
                ? "Auto-redirect cancelled. You can use the buttons below when ready."
                : "Redirection automatique annulée. Vous pouvez utiliser les boutons ci-dessous quand vous êtes prêt."}
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-center">
          <Link href="/">
            <Button variant="default" className="inline-flex items-center px-6">
              {isEnglish ? "Back to Home" : "Retour à l'Accueil"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
