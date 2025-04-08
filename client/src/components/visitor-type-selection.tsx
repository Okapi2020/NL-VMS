import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { Visitor } from "@shared/schema";
import { formatPhoneNumber } from "@/lib/utils";

type VisitorTypeSelectionProps = {
  isOpen: boolean;
  onClose: () => void;
  onNewVisitorSelected: () => void;
  onReturningVisitorConfirmed: (visitor: Visitor | null, prefill?: { phoneNumber: string; yearOfBirth?: number }) => void;
  isEnglish: boolean;
};

export function VisitorTypeSelection({ 
  isOpen, 
  onClose, 
  onNewVisitorSelected, 
  onReturningVisitorConfirmed,
  isEnglish 
}: VisitorTypeSelectionProps) {
  // States for the returning visitor flow
  const [step, setStep] = useState<'selection' | 'phone-input' | 'year-input' | 'review'>('selection');
  const [phoneNumber, setPhoneNumber] = useState("");
  const [formattedPhoneNumber, setFormattedPhoneNumber] = useState("");
  const [yearOfBirth, setYearOfBirth] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isFound, setIsFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  
  // Reset states when dialog opens/closes
  const resetState = () => {
    setStep('selection');
    setPhoneNumber("");
    setFormattedPhoneNumber("");
    setYearOfBirth(undefined);
    setIsLoading(false);
    setIsFound(false);
    setErrorMessage(null);
    setRetryCount(0);
    setVisitor(null);
  };
  
  // Handle phone number input with formatting
  const handlePhoneInput = (input: string) => {
    // Strip all non-numeric characters
    const cleaned = input.replace(/\D/g, '');
    
    // Only take the first 10 digits
    const limited = cleaned.slice(0, 10);
    
    // Store raw numeric value
    setPhoneNumber(limited);
    
    // Apply formatting with spaces
    const formatted = formatPhoneNumber(limited);
    setFormattedPhoneNumber(formatted);
  };
  
  // Look up visitor by phone number
  const lookupVisitor = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      const response = await apiRequest("POST", "/api/visitors/lookup", {
        phoneNumber: phoneNumber,
        yearOfBirth: yearOfBirth
      });
      
      const data = await response.json();
      
      if (response.ok && data.found) {
        setIsFound(true);
        setVisitor(data.visitor);
        setStep('review');
      } else {
        setIsFound(false);
        
        // Different error message based on step and retry count
        if (step === 'phone-input') {
          setErrorMessage(isEnglish 
            ? "No visitor found with this phone number." 
            : "Aucun visiteur trouvé avec ce numéro de téléphone.");
            
          // If this is the first try, allow a retry
          if (retryCount === 0) {
            setRetryCount(1);
          } else {
            // If it's the second try, suggest check with reception
            setErrorMessage(isEnglish 
              ? "Still not found. Please check with reception if you're a returning visitor." 
              : "Toujours introuvable. Veuillez vérifier à la réception si vous êtes un visiteur récurrent.");
          }
        } else if (step === 'year-input') {
          setErrorMessage(isEnglish 
            ? "The year of birth doesn't match our records." 
            : "L'année de naissance ne correspond pas à nos enregistrements.");
        }
      }
    } catch (error) {
      setErrorMessage(isEnglish 
        ? "An error occurred while looking up your information." 
        : "Une erreur s'est produite lors de la recherche de vos informations.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle selection of new visitor option
  const handleSelectNewVisitor = () => {
    resetState();
    onNewVisitorSelected();
  };
  
  // Handle selection of returning visitor option
  const handleSelectReturningVisitor = () => {
    setStep('phone-input');
  };
  
  // Handle back button
  const handleBack = () => {
    // If on phone input step and already tried once, go back to selection
    if (step === 'phone-input' && retryCount > 0) {
      setStep('selection');
      setRetryCount(0);
    } 
    // Otherwise just go back one step
    else if (step === 'review') {
      setStep('phone-input');
    } else if (step === 'phone-input') {
      setStep('selection');
    }
    
    // Clear any error messages
    setErrorMessage(null);
  };
  
  // Handle continue with no match
  const handleContinueWithNoMatch = () => {
    // Pass the phone number back to the form for pre-filling
    onReturningVisitorConfirmed(null, { phoneNumber });
    resetState();
  };
  
  // Handle confirmation of returning visitor
  const handleConfirmReturningVisitor = () => {
    if (visitor) {
      // First close the dialog to prevent flashing UI
      resetState();
      // Then immediately check in the visitor without URL navigation
      onReturningVisitorConfirmed(visitor);
    }
  };
  
  // Handle dialog close
  const handleDialogClose = () => {
    resetState();
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'selection' && (isEnglish ? "Visitor Type" : "Type de Visiteur")}
            {step === 'phone-input' && (isEnglish ? "Returning Visitor" : "Visiteur Récurrent")}
            {step === 'review' && (isEnglish ? "Confirm Your Information" : "Confirmez Vos Informations")}
          </DialogTitle>
        </DialogHeader>
        
        {/* Step 1: Visitor Type Selection */}
        {step === 'selection' && (
          <div className="grid grid-cols-1 gap-4">
            <Card className="cursor-pointer hover:bg-accent/20 transition-colors" onClick={handleSelectNewVisitor}>
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-medium mb-2">
                  {isEnglish ? "First Time Visit" : "Première Visite"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isEnglish 
                    ? "I'm visiting for the first time and need to register" 
                    : "Je visite pour la première fois et j'ai besoin de m'enregistrer"
                  }
                </p>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:bg-accent/20 transition-colors" onClick={handleSelectReturningVisitor}>
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-medium mb-2">
                  {isEnglish ? "Returning Visitor" : "Visiteur Récurrent"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isEnglish 
                    ? "I've been here before and my information is already in the system" 
                    : "J'ai déjà visité et mes informations sont déjà dans le système"
                  }
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Step 2: Phone Number Input */}
        {step === 'phone-input' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isEnglish 
                ? "Please enter your phone number to look up your information:" 
                : "Veuillez entrer votre numéro de téléphone pour rechercher vos informations:"
              }
            </p>
            
            <div className="space-y-2">
              <Input
                type="tel"
                placeholder={isEnglish ? "e.g. 0808 123 456" : "ex. 0808 123 456"}
                value={formattedPhoneNumber}
                onChange={(e) => handlePhoneInput(e.target.value)}
                disabled={isLoading}
                className="text-lg"
              />
              
              {errorMessage && (
                <p className="text-sm text-destructive mt-1">{errorMessage}</p>
              )}
            </div>
            
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {isEnglish ? "Back" : "Retour"}
              </Button>
              
              <div className="space-x-2">
                {retryCount > 0 && (
                  <Button variant="outline" onClick={handleContinueWithNoMatch}>
                    {isEnglish ? "New Registration" : "Nouvel Enregistrement"}
                  </Button>
                )}
                
                <Button 
                  onClick={lookupVisitor} 
                  disabled={phoneNumber.length < 10 || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {isEnglish ? "Next" : "Suivant"}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Step 3: Review Information */}
        {step === 'review' && visitor && (
          <div className="space-y-4">
            <div className="bg-accent/20 p-4 rounded-md">
              <div className="flex items-center mb-3">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-600">
                  {isEnglish ? "We found your information!" : "Nous avons trouvé vos informations !"}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">{isEnglish ? "Name" : "Nom"}</p>
                  <p className="font-medium">{visitor.fullName}</p>
                </div>
                
                <div>
                  <p className="text-muted-foreground">{isEnglish ? "Year of Birth" : "Année de naissance"}</p>
                  <p className="font-medium">{visitor.yearOfBirth}</p>
                </div>
                
                <div>
                  <p className="text-muted-foreground">{isEnglish ? "Phone" : "Téléphone"}</p>
                  <p className="font-medium">
                    {visitor.phoneNumber.startsWith('+') ? 
                      visitor.phoneNumber :
                      (visitor.phoneNumber.startsWith('0') ? 
                        visitor.phoneNumber : 
                        `0${formatPhoneNumber(visitor.phoneNumber)}`)}
                  </p>
                </div>
                
                <div>
                  <p className="text-muted-foreground">{isEnglish ? "Email" : "Email"}</p>
                  <p className="font-medium">{visitor.email || "—"}</p>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {isEnglish 
                ? "If your information is not correct, please inform reception after check-in." 
                : "Si vos informations ne sont pas correctes, veuillez en informer la réception après l'enregistrement."
              }
            </p>
            
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {isEnglish ? "Back" : "Retour"}
              </Button>
              
              <Button onClick={handleConfirmReturningVisitor}>
                {isEnglish ? "Check In Now" : "SIGNALER MAINTENANT"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}