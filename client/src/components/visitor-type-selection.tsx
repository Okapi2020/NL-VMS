import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { Visitor, Visit } from "@shared/schema";
import { formatPhoneNumber } from "@/lib/utils";

type VisitorTypeSelectionProps = {
  isOpen: boolean;
  onClose: () => void;
  onNewVisitorSelected: () => void;
  onReturningVisitorConfirmed: (
    visitor: Visitor | null, 
    prefill?: { phoneNumber: string; yearOfBirth?: number },
    activeVisit?: Visit, // Visit data when visitor already has an active visit
    alreadyCheckedIn?: boolean // Flag to indicate if visitor already has an active check-in
  ) => void;
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
  const [errorMessage, setErrorMessage] = useState<React.ReactNode | null>(null);
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
      // Use direct fetch instead of apiRequest which throws errors on non-200 responses
      const response = await fetch('/api/visitors/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber: phoneNumber, 
          yearOfBirth: yearOfBirth 
        })
      });
      
      const data = await response.json();
      
      // Check if visitor was found
      if (response.ok && data.found) {
        setIsFound(true);
        setVisitor(data.visitor);
        
        // Check if visitor already has an active visit
        if (data.hasActiveVisit && data.activeVisit) {
          console.log('Visitor already has an active visit, skipping form:', {
            visitor: data.visitor,
            activeVisit: data.activeVisit
          });
          
          // Close the dialog and reset state
          resetState();
          onClose();
          
          // Pass the visitor and visit data directly to parent component to show already checked in screen
          // We use a longer timeout to ensure dialog is fully closed
          setTimeout(() => {
            console.log('Calling onReturningVisitorConfirmed with already checked in flag', data.visitor, data.activeVisit);
            
            // Make sure we have valid data to pass
            if (data.visitor && data.activeVisit && data.activeVisit.visit) {
              onReturningVisitorConfirmed(
                data.visitor, 
                undefined, 
                data.activeVisit.visit,
                true // Flag to indicate this visitor is already checked in
              );
            } else {
              console.error('Missing data for already checked in visitor', data);
              // Fallback in case visit data is missing
              onReturningVisitorConfirmed(
                data.visitor, 
                undefined, 
                // Create minimal visit object if missing
                data.activeVisit?.visit || {
                  id: 0,
                  visitorId: data.visitor.id,
                  checkInTime: new Date(),
                  checkOutTime: null,
                  purpose: null,
                  createdAt: new Date(),
                  active: true
                },
                true // Flag to indicate this visitor is already checked in
              );
            }
          }, 200);
          
          return; // Exit early to prevent showing the review step
        }
        
        // If no active visit, proceed normally to review step
        setStep('review');
      } else {
        setIsFound(false);
        
        // Different error message based on step and retry count
        if (step === 'phone-input') {
          // If this is the first try, give a simple message and allow a retry
          if (retryCount === 0) {
            setErrorMessage(isEnglish 
              ? "No visitor found with this phone number." 
              : "Aucun visiteur trouvé avec ce numéro de téléphone.");
            setRetryCount(1);
          } else {
            // If it's the second try, be more helpful with options
            setErrorMessage(isEnglish 
              ? "We couldn't find any records with this phone number." 
              : "Nous n'avons trouvé aucun enregistrement avec ce numéro de téléphone.");
          }
        } else if (step === 'year-input') {
          setErrorMessage(isEnglish 
            ? "The year of birth doesn't match our records." 
            : "L'année de naissance ne correspond pas à nos enregistrements.");
        }
      }
    } catch (error) {
      console.error("Error during visitor lookup:", error);
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
    onReturningVisitorConfirmed(null, { phoneNumber }, undefined, false);
    resetState();
  };
  
  // Handle confirmation of returning visitor
  const handleConfirmReturningVisitor = () => {
    if (visitor) {
      // First make a local copy of the visitor to prevent any issues if state changes
      const visitorData = { ...visitor };
      
      // Disable any inputs to prevent multiple submissions
      setIsLoading(true);
      
      // Close the dialog and reset all internal state
      resetState();
      onClose();
      
      // After the dialog is closed and animation is complete, 
      // proceed with visitor check-in with a longer delay for safety
      setTimeout(() => {
        onReturningVisitorConfirmed(visitorData, undefined, undefined, false);
      }, 150); // Increased delay for better reliability
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
                <div className="mt-3 mb-2">
                  <div className="bg-red-900/20 border border-red-400/30 rounded-md p-3">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-orange-400 mr-2 shrink-0 mt-0.5" />
                      <div className="text-sm text-orange-400 font-medium">
                        {errorMessage}
                      </div>
                    </div>
                    {retryCount > 0 && (
                      <div className="mt-3 pt-3 border-t border-red-400/30">
                        <p className="text-sm text-white font-medium">
                          {isEnglish 
                            ? "Would you like to check in as a new visitor instead?" 
                            : "Souhaitez-vous vous enregistrer en tant que nouveau visiteur ?"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {isEnglish ? "Back" : "Retour"}
              </Button>
              
              <div className="space-x-2">
                {retryCount > 0 ? (
                  <Button 
                    variant="secondary" 
                    onClick={handleContinueWithNoMatch}
                    className="bg-green-600 hover:bg-green-700 text-white hover:text-white font-medium px-6 py-2 rounded-md shadow-sm transition-all hover:shadow-md dark:bg-green-700 dark:hover:bg-green-800"
                  >
                    {isEnglish ? "Check In as New Visitor" : "Sans aucun doute"}
                  </Button>
                ) : (
                  <Button 
                    onClick={lookupVisitor} 
                    disabled={phoneNumber.length < 10 || isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {isEnglish ? "Next" : "Suivant"}
                  </Button>
                )}
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