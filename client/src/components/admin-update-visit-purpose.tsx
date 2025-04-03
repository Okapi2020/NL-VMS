import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { VISIT_PURPOSES } from "@/lib/constants";
import { Visit } from "@shared/schema";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, SaveIcon } from "lucide-react";

type UpdateVisitPurposeProps = {
  visit: Visit;
  onSuccess?: () => void;
};

export function UpdateVisitPurpose({ visit, onSuccess }: UpdateVisitPurposeProps) {
  const [selectedPurpose, setSelectedPurpose] = useState<string>(visit.purpose || "");
  const { toast } = useToast();

  const updatePurposeMutation = useMutation({
    mutationFn: async ({ visitId, purpose }: { visitId: number; purpose: string }) => {
      const res = await apiRequest("POST", "/api/admin/update-visit-purpose", {
        visitId,
        purpose,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Purpose updated",
        description: "Visit purpose has been updated successfully",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update purpose",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (selectedPurpose) {
      updatePurposeMutation.mutate({
        visitId: visit.id,
        purpose: selectedPurpose,
      });
    }
  };

  const isPendingChanges = selectedPurpose !== visit.purpose;

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedPurpose}
        onValueChange={setSelectedPurpose}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select purpose" />
        </SelectTrigger>
        <SelectContent>
          {VISIT_PURPOSES.map((purpose) => (
            <SelectItem key={purpose} value={purpose}>
              {purpose}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button
        size="sm"
        variant="outline"
        disabled={!isPendingChanges || updatePurposeMutation.isPending}
        onClick={handleSave}
      >
        {updatePurposeMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1" />
        ) : (
          <SaveIcon className="h-4 w-4 mr-1" />
        )}
        Save
      </Button>
    </div>
  );
}