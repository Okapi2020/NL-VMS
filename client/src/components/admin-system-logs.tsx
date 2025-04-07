import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SystemLog } from "../../../shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistance } from "date-fns";

interface AdminSystemLogsProps {
  className?: string;
}

export function AdminSystemLogs({ className }: AdminSystemLogsProps) {
  const [showAll, setShowAll] = useState(false);
  
  const {
    data: systemLogs,
    isLoading,
    isError,
    refetch
  } = useQuery<SystemLog[]>({
    queryKey: ["/api/admin/system-logs"],
    refetchOnWindowFocus: false,
  });

  // Function to format the timestamp
  const formatTimestamp = (timestamp: Date | string) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return (
      <div className="space-y-1">
        <div>{date.toLocaleDateString()}</div>
        <div className="text-xs text-muted-foreground">{date.toLocaleTimeString()}</div>
        <div className="text-xs text-muted-foreground">
          {formatDistance(date, new Date(), { addSuffix: true })}
        </div>
      </div>
    );
  };

  // Function to format badge for action type
  const getActionBadge = (action: string) => {
    const colorMap: Record<string, string> = {
      "SCHEDULED_AUTO_CHECKOUT": "bg-blue-500",
      "MANUAL_AUTO_CHECKOUT": "bg-green-500",
      "SCHEDULED_AUTO_CHECKOUT_ERROR": "bg-red-500",
      "MANUAL_AUTO_CHECKOUT_ERROR": "bg-red-500"
    };

    const labelMap: Record<string, string> = {
      "SCHEDULED_AUTO_CHECKOUT": "Scheduled Auto-Checkout",
      "MANUAL_AUTO_CHECKOUT": "Manual Auto-Checkout",
      "SCHEDULED_AUTO_CHECKOUT_ERROR": "Scheduled Checkout Error",
      "MANUAL_AUTO_CHECKOUT_ERROR": "Manual Checkout Error"
    };

    const color = colorMap[action] || "bg-gray-500";
    const label = labelMap[action] || action;

    return <Badge className={color}>{label}</Badge>;
  };

  const visibleLogs = showAll ? systemLogs : systemLogs?.slice(0, 5);

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">System Logs</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => refetch()}
        >
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isError ? (
        <div className="text-center p-4 text-destructive">
          Error loading system logs
        </div>
      ) : systemLogs?.length === 0 ? (
        <div className="text-center p-4 text-muted-foreground">
          No system logs available
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Records Affected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleLogs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                    <TableCell>{log.details}</TableCell>
                    <TableCell className="text-right">{log.affectedRecords || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {systemLogs && systemLogs.length > 5 && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? "Show Less" : `Show All (${systemLogs.length})`}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}