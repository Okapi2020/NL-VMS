import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  title: string;
  content: ReactNode;
  validate?: () => boolean | Promise<boolean>;
};

type MultiStepFormProps = {
  steps: Step[];
  onComplete: () => void;
  submitButtonText?: string;
  previousButtonText?: string;
  nextButtonText?: string;
  className?: string;
  isSubmitting?: boolean;
  renderCustomButtons?: (currentStepIndex: number, isFirstStep: boolean) => ReactNode;
};

export function MultiStepForm({
  steps,
  onComplete,
  submitButtonText = "Submit",
  previousButtonText = "Previous",
  nextButtonText = "Next",
  className,
  isSubmitting = false,
  renderCustomButtons,
}: MultiStepFormProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const next = async () => {
    if (currentStep.validate) {
      const isValid = await currentStep.validate();
      if (!isValid) return;
    }
    
    if (isLastStep) {
      onComplete();
      return;
    }
    
    // When moving to next step, clear any fields that might be displayed but not updated yet
    setCurrentStepIndex(i => i + 1);
  };

  const back = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(i => i - 1);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center relative">
              <div 
                className={cn(
                  "rounded-full h-10 w-10 flex items-center justify-center",
                  index < currentStepIndex 
                    ? "bg-green-500 text-white" 
                    : index === currentStepIndex 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                )}
              >
                {index < currentStepIndex ? "✓" : index + 1}
              </div>
              <div 
                className={cn(
                  "ml-3 text-sm font-medium", 
                  index <= currentStepIndex ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.title}
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 border-t-2 border-border mx-4"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-6">
        <h2 className="text-lg font-medium text-foreground mb-6">
          Step {currentStepIndex + 1}: {currentStep.title}
        </h2>
        <div>
          {currentStep.content}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between">
        {isFirstStep ? (
          // Render custom home button on the first step if provided
          renderCustomButtons ? (
            renderCustomButtons(currentStepIndex, isFirstStep)
          ) : null
        ) : (
          <button
            type="button"
            onClick={back}
            disabled={isSubmitting}
            className={cn(
              "inline-flex items-center px-4 py-2 border border-input text-sm font-medium rounded-md shadow-sm text-foreground bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
              isSubmitting && "opacity-70 cursor-not-allowed"
            )}
          >
            <span className="mr-2">←</span> {previousButtonText}
          </button>
        )}
        <div className={isFirstStep ? 'ml-auto' : ''}>
          <button
            type="button"
            onClick={next}
            disabled={isSubmitting}
            className={cn(
              "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
              isLastStep 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-primary hover:bg-primary/90",
              isSubmitting && "opacity-70 cursor-not-allowed"
            )}
          >
            {isLastStep ? (
              isSubmitting ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {submitButtonText}
                </div>
              ) : submitButtonText
            ) : (
              <>
                {nextButtonText} <span className="ml-2">→</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
