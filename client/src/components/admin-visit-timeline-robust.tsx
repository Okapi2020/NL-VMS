import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { formatDate, formatBadgeId } from "@/lib/utils";
import { Visit, Visitor } from "@shared/schema";
import { useLanguage } from "@/hooks/use-language";
import { ErrorBoundary } from "@/components/error-boundary";
import { useQueryClient } from "@tanstack/react-query";

type AdminVisitTimelineProps = {
  visitHistory: { visit: Visit; visitor: Visitor }[];
  isLoading: boolean;
  error?: Error | null;
};

// Robust timeline component with retry and error handling
function RobustTimelineComponent({ visitHistory, isLoading, error }: AdminVisitTimelineProps) {
  const { language, t } = useLanguage();
  const queryClient = useQueryClient();
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Handle manual retry
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
      console.log("Manually refreshed visit history data");
    } catch (err) {
      console.error("Error retrying fetch:", err);
    } finally {
      setIsRetrying(false);
    }
  };
  
  // Show loading state
  if (isLoading || isRetrying) {
    return (
      <div className="p-4 text-center">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
        <p>Loading visit history...</p>
      </div>
    );
  }
  
  // Show error state with retry button
  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <h3 className="text-lg font-semibold">Error Loading Visit History</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {error.message || "An error occurred while loading the visit history."}
          </p>
          <Button onClick={handleRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }
  
  // Show empty state
  if (!visitHistory || !Array.isArray(visitHistory) || visitHistory.length === 0) {
    return (
      <div className="p-6 text-center border rounded-lg">
        <p className="text-muted-foreground">No visit history available.</p>
      </div>
    );
  }
  
  // Process visit history data
  try {
    console.log("Processing visit history for timeline view:", visitHistory.length, "records");
    
    // Consolidate visits by visitor
    const visitorMap: Record<number, { visitor: Visitor, visits: Visit[] }> = {};
    
    // Filter out any records with missing data before processing
    const validRecords = visitHistory.filter(record => {
      return record && record.visitor && record.visit && typeof record.visitor.id === 'number';
    });
    
    console.log("Valid records for timeline processing:", validRecords.length);
    
    // Group visits by visitor
    validRecords.forEach(({ visitor, visit }) => {
      if (!visitorMap[visitor.id]) {
        visitorMap[visitor.id] = { visitor, visits: [visit] };
      } else {
        visitorMap[visitor.id].visits.push(visit);
      }
    });
    
    const consolidatedVisitors = Object.values(visitorMap);
    
    // Display timeline cards
    return (
      <div className="p-4">
        <div className="space-y-4">
          {consolidatedVisitors.map(({ visitor, visits }) => (
            <Card key={visitor.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle>{visitor.fullName}</CardTitle>
                <CardDescription>
                  {formatBadgeId(visitor.id)} · {visitor.phoneNumber}
                  {visitor.email && ` · ${visitor.email}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2">
                  <p><strong>Total visits:</strong> {visits.length}</p>
                  <p><strong>Latest visit:</strong> {formatDate(
                    new Date(Math.max(...visits.map(v => new Date(v.checkInTime).getTime()))).toISOString(), 
                    language
                  )}</p>
                  <p><strong>First visit:</strong> {formatDate(
                    new Date(Math.min(...visits.map(v => new Date(v.checkInTime).getTime()))).toISOString(), 
                    language
                  )}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  } catch (processError) {
    console.error("Error processing timeline data:", processError);
    return (
      <div className="p-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <h3 className="text-lg font-semibold">Error Processing Data</h3>
          <p className="text-sm text-muted-foreground mb-4">
            An error occurred while processing the visit history data.
          </p>
          <Button onClick={handleRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
        </div>
      </div>
    );
  }
}

// Export wrapped with error boundary
export function AdminVisitTimeline(props: AdminVisitTimelineProps) {
  const handleReset = () => {
    const queryClient = useQueryClient();
    queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
  };

  return (
    <ErrorBoundary 
      fallback={
        <div className="p-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h3 className="text-lg font-semibold">Something went wrong</h3>
            <p className="text-sm text-muted-foreground mb-4">
              An unexpected error occurred while loading the visit timeline.
            </p>
            <Button onClick={handleReset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </div>
      }
      onReset={handleReset}
    >
      <RobustTimelineComponent {...props} />
    </ErrorBoundary>
  );
}