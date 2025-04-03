import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatTimeOnly, formatDuration } from "@/lib/utils";
import { Visit, Visitor } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AdminVisitorsTableProps = {
  visits: { visit: Visit; visitor: Visitor }[];
  isLoading: boolean;
};

export function AdminVisitorsTable({ visits, isLoading }: AdminVisitorsTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  const checkOutMutation = useMutation({
    mutationFn: async (visitId: number) => {
      const res = await apiRequest("POST", "/api/admin/check-out-visitor", { visitId });
      return await res.json();
    },
    onMutate: (visitId) => {
      setProcessingIds(prev => new Set(prev).add(visitId));
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Visitor checked out successfully",
      });
      // Refresh both current visitors and visit history
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to check out visitor: " + error.message,
        variant: "destructive",
      });
    },
    onSettled: (_, __, visitId) => {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(visitId);
        return newSet;
      });
    }
  });

  const handleCheckOut = (visitId: number) => {
    if (confirm("Are you sure you want to check out this visitor?")) {
      checkOutMutation.mutate(visitId);
    }
  };

  // Calculate visit duration
  const calculateDuration = (checkInTime: Date | string): string => {
    const startTime = new Date(checkInTime).getTime();
    const currentTime = new Date().getTime();
    const durationMs = currentTime - startTime;
    
    // Convert to minutes
    const minutes = Math.floor(durationMs / (1000 * 60));
    
    return `${minutes} min`;
  };

  if (isLoading) {
    return <div className="py-4 text-center">Loading current visitors...</div>;
  }

  if (visits.length === 0) {
    return <div className="py-4 text-center">No visitors currently checked in.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Visitor</TableHead>
            <TableHead>Check-in Time</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visits.map(({ visitor, visit }) => (
            <TableRow key={visit.id}>
              <TableCell>
                <div className="font-medium">{visitor.fullName}</div>
                <div className="text-sm text-gray-500">{visitor.email || "No email provided"}</div>
              </TableCell>
              <TableCell>{formatTimeOnly(visit.checkInTime)}</TableCell>
              <TableCell>{calculateDuration(visit.checkInTime)}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  className="text-primary-600 hover:text-primary-900"
                  onClick={() => handleCheckOut(visit.id)}
                  disabled={processingIds.has(visit.id)}
                >
                  {processingIds.has(visit.id) ? "Processing..." : "Check out"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
