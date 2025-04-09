import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatBadgeId } from "@/lib/utils";
import { Visit, Visitor } from "@shared/schema";
import { useLanguage } from "@/hooks/use-language";
import { ErrorBoundary } from "@/components/error-boundary";

type AdminVisitTimelineProps = {
  visitHistory: { visit: Visit; visitor: Visitor }[];
  isLoading: boolean;
};

// Simple timeline component
function SimpleTimelineComponent({ visitHistory, isLoading }: AdminVisitTimelineProps) {
  const { language } = useLanguage();
  
  if (isLoading) {
    return <div className="p-4 text-center">Loading visit history...</div>;
  }
  
  if (!visitHistory || !Array.isArray(visitHistory) || visitHistory.length === 0) {
    return <div className="p-4 text-center">No visit history available.</div>;
  }
  
  console.log("Processing visit history for timeline view:", visitHistory.length, "records");
  
  // Simple consolidation of visits by visitor
  const visitorMap: Record<number, { visitor: Visitor, visits: Visit[] }> = {};
  
  try {
    // Filter out any records with missing data before processing
    const validRecords = visitHistory.filter(record => {
      return record && record.visitor && record.visit && typeof record.visitor.id === 'number';
    });
    
    console.log("Valid records for timeline processing:", validRecords.length);
    
    validRecords.forEach(({ visitor, visit }) => {
      if (!visitorMap[visitor.id]) {
        visitorMap[visitor.id] = { visitor, visits: [visit] };
      } else {
        visitorMap[visitor.id].visits.push(visit);
      }
    });
  } catch (error) {
    console.error("Error processing timeline data:", error);
    return <div className="p-4 text-center">Error processing visit data. Please refresh the page.</div>;
  }
  
  const consolidatedVisitors = Object.values(visitorMap);
  
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
              <div className="text-sm">
                <p>Total visits: {visits.length}</p>
                <p>Latest visit: {formatDate(
                  new Date(Math.max(...visits.map(v => new Date(v.checkInTime).getTime()))).toISOString(), 
                  language
                )}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Export wrapped with error boundary
export function AdminVisitTimeline(props: AdminVisitTimelineProps) {
  return (
    <ErrorBoundary fallback={<div className="p-4 text-center">An error occurred while loading the visit timeline. Please refresh the page and try again.</div>}>
      <SimpleTimelineComponent {...props} />
    </ErrorBoundary>
  );
}