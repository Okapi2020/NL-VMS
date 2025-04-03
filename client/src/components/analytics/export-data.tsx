import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "./date-range-picker";
import { ExportedVisit } from "./types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function ExportData() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Function to convert visits data to CSV format
  const convertToCSV = (visits: ExportedVisit[]): string => {
    if (visits.length === 0) return '';
    
    // Get headers from the first visit object
    const headers = Object.keys(visits[0]);
    
    // Create CSV header row
    const csvRows = [headers.join(',')];
    
    // Add data rows
    for (const visit of visits) {
      const values = headers.map(header => {
        const value = visit[header as keyof ExportedVisit];
        // Handle values that might contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\\n');
  };

  // Function to trigger the download of a CSV file
  const downloadCSV = (csvString: string, filename: string) => {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams();
      
      if (dateRange?.from) {
        params.append('fromDate', dateRange.from.toISOString());
      }
      
      if (dateRange?.to) {
        // Set the end of the day for the to date
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        params.append('toDate', toDate.toISOString());
      }
      
      const url = `/api/analytics/export?${params.toString()}`;
      const res = await apiRequest("GET", url);
      return await res.json() as ExportedVisit[];
    },
    onSuccess: (data) => {
      const csvData = convertToCSV(data);
      const fileName = `visitor-data-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      downloadCSV(csvData, fileName);
      
      toast({
        title: "Export successful",
        description: `${data.length} visits exported to ${fileName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Visit Data</CardTitle>
        <CardDescription>
          Export visitor and visit data for your records or for further analysis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div>
            <h3 className="mb-2 text-sm font-medium">Select Date Range</h3>
            <DateRangePicker 
              dateRange={dateRange} 
              onDateRangeChange={setDateRange} 
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <p className="text-sm text-muted-foreground">
          {dateRange?.from && dateRange?.to
            ? `Data from ${format(dateRange.from, "PP")} to ${format(dateRange.to, "PP")}`
            : "All data will be exported if no date range is selected"}
        </p>
        <Button 
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
        >
          {exportMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}