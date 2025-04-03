import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  title: string;
  content: ReactNode;
  validate?: () => boolean;
};

type MultiStepFormProps = {
  steps: Step[];
  onComplete: () => void;
  submitButtonText?: string;
  className?: string;
};

export function MultiStepForm({
  steps,
  onComplete,
  submitButtonText = "Submit",
  className,
}: MultiStepFormProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const next = () => {
    if (currentStep.validate && !currentStep.validate()) {
      return;
    }
    
    if (isLastStep) {
      onComplete();
      return;
    }
    
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
                  "rounded-full h-10 w-10 flex items-center justify-center text-white",
                  index < currentStepIndex 
                    ? "bg-green-500" 
                    : index === currentStepIndex 
                      ? "bg-primary" 
                      : "bg-gray-300 text-gray-700"
                )}
              >
                {index < currentStepIndex ? "✓" : index + 1}
              </div>
              <div 
                className={cn(
                  "ml-3 text-sm font-medium", 
                  index <= currentStepIndex ? "text-gray-900" : "text-gray-500"
                )}
              >
                {step.title}
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 border-t-2 border-gray-200 mx-4"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">
          Step {currentStepIndex + 1}: {currentStep.title}
        </h2>
        <div>
          {currentStep.content}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between">
        {!isFirstStep && (
          <button
            type="button"
            onClick={back}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <span className="mr-2">←</span> Previous
          </button>
        )}
        <div className={isFirstStep ? 'ml-auto' : ''}>
          <button
            type="button"
            onClick={next}
            className={cn(
              "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
              isLastStep 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-primary hover:bg-primary/90"
            )}
          >
            {isLastStep ? submitButtonText : (
              <>
                Next <span className="ml-2">→</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
