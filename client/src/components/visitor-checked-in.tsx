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
};

export function VisitorCheckedIn({ visitor, visit, onCheckOut }: VisitorCheckedInProps) {
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
        title: "Check-out successful",
        description: "You have been checked out successfully. Thank you for your visit!",
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
        title: "Check-out failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCheckOut = () => {
    if (confirm("Are you sure you want to check out?")) {
      checkOutMutation.mutate();
    }
  };

  return (
    <Card className="mt-8">
      <CardContent className="px-4 py-5 sm:p-6 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30">
          <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>

        <h3 className="mt-3 text-lg font-medium">Successfully Checked In</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Thank you for checking in. You have been registered in the system.
        </p>

        <div className="mt-4 border-t pt-4 border-border">
          <p className="text-sm font-medium text-muted-foreground">Your check-in details:</p>
          <div className="mt-2 text-sm grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
            <div>
              <span className="font-medium">Name:</span>{" "}
              <span>{visitor.fullName}</span>
            </div>
            <div>
              <span className="font-medium">Check-in time:</span>{" "}
              <span>{formatTimeOnly(visit.checkInTime)}</span>
            </div>

            <div className="flex items-center">
              <Tag className="h-4 w-4 mr-1 text-primary" />
              <span className="font-medium">Badge ID:</span>{" "}
              <span className="font-mono text-primary ml-1">{formatBadgeId(visitor.id)}</span>
            </div>
            
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-1 text-muted-foreground" />
              <span className="font-medium">Phone:</span>{" "}
              <span className="ml-1">
                {visitor.phoneNumber ? (
                  <PhoneNumberLink phoneNumber={visitor.phoneNumber} />
                ) : (
                  "No phone provided"
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <Timer className="h-4 w-4" />
            <span>Returning to home page in {countdown} seconds...</span>
            <button 
              onClick={() => setAutoRedirect(false)} 
              className="text-primary hover:text-primary/80 underline text-xs"
            >
              Cancel
            </button>
          </div>
          {!autoRedirect && (
            <p className="mt-1 text-xs text-green-600 dark:text-green-400">Auto-redirect cancelled. You can use the buttons below when ready.</p>
          )}
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={handleCheckOut}
            disabled={checkOutMutation.isPending}
          >
            {checkOutMutation.isPending ? "Processing..." : "Check Out"}
          </Button>
          
          <Link href="/">
            <Button variant="outline" className="inline-flex items-center">
              Back to Home
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
