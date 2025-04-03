import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatTimeOnly } from "@/lib/utils";
import { Check } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Visitor, Visit } from "@shared/schema";
import { Link } from "wouter";

type VisitorCheckedInProps = {
  visitor: Visitor;
  visit: Visit;
  onCheckOut: () => void;
};

export function VisitorCheckedIn({ visitor, visit, onCheckOut }: VisitorCheckedInProps) {
  const { toast } = useToast();

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/visitors/check-out", { visitId: visit.id });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Check-out successful",
        description: "You have been checked out successfully. Thank you for your visit!",
      });
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
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <Check className="h-6 w-6 text-green-600" />
        </div>

        <h3 className="mt-3 text-lg font-medium text-gray-900">Successfully Checked In</h3>
        <p className="mt-2 text-sm text-gray-500">
          Thank you for checking in. You have been registered in the system.
        </p>

        <div className="mt-4 border-t border-gray-200 pt-4">
          <p className="text-sm font-medium text-gray-500">Your check-in details:</p>
          <div className="mt-2 text-sm text-gray-900 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
            <div>
              <span className="font-medium">Name:</span>{" "}
              <span>{visitor.fullName}</span>
            </div>
            <div>
              <span className="font-medium">Check-in time:</span>{" "}
              <span>{formatTimeOnly(visit.checkInTime)}</span>
            </div>

            <div>
              <span className="font-medium">Visitor ID:</span>{" "}
              <span>VIS-{visit.id.toString().padStart(5, '0')}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={handleCheckOut}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
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
