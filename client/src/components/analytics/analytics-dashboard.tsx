import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DateRange } from "react-day-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "./date-range-picker";
import { TimeSeriesChart } from "./time-series-chart";
import { HourlyDistributionChart } from "./hourly-distribution-chart";
import { DayOfWeekChart } from "./day-of-week-chart";
import { AnalyticsSummary } from "./analytics-summary";
import { ExportData } from "./export-data";
import { AnalyticsData } from "./types";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [activeTab, setActiveTab] = useState("overview");

  // Build the query params for the analytics API
  const getQueryParams = () => {
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
    
    return params.toString();
  };

  const { toast } = useToast();

  const { user } = useAuth();

  // Query to fetch analytics data
  const { data, isLoading, refetch } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics/data', dateRange],
    enabled: !!user, // Only run query if user is logged in
    queryFn: async ({ queryKey }) => {
      const params = getQueryParams();
      const url = `/api/analytics/data${params ? `?${params}` : ''}`;
      
      try {
        const res = await fetch(url, {
          credentials: 'include', // Important for sending cookies with the request
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        
        return await res.json();
      } catch (error: any) {
        toast({
          title: "Error",
          description: `Failed to fetch analytics data: ${error.message}`,
          variant: "destructive",
        });
        throw error;
      }
    }
  });

  // Refetch data when date range changes
  useEffect(() => {
    refetch();
  }, [dateRange, refetch]);

  // Render loading skeletons during data fetch
  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0 justify-between">
          <Skeleton className="h-10 w-full sm:w-64" />
          <Skeleton className="h-10 w-full sm:w-64" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0 justify-between">
        <DateRangePicker 
          dateRange={dateRange} 
          onDateRangeChange={setDateRange} 
        />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <TabsContent value="overview" className="space-y-6 mt-0">
        <AnalyticsSummary data={data.summary} />
        
        <TimeSeriesChart 
          data={data.timeSeries} 
          title="Visitor Traffic Over Time"
        />
        
        <div className="grid gap-6 md:grid-cols-2">
          <HourlyDistributionChart data={data.byHour} />
          <DayOfWeekChart data={data.byDayOfWeek} />
        </div>
      </TabsContent>
      
      <TabsContent value="trends" className="space-y-6 mt-0">
        <AnalyticsSummary data={data.summary} />
        
        <div className="grid gap-6 lg:grid-cols-2">
          <TimeSeriesChart 
            data={data.timeSeries} 
            title="Visit Count Trends"
          />
          
          <TimeSeriesChart 
            data={data.timeSeries.map(point => ({
              ...point,
              count: point.avgDuration
            }))} 
            title="Average Visit Duration Trends"
          />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <HourlyDistributionChart data={data.byHour} />
          <DayOfWeekChart data={data.byDayOfWeek} />
        </div>
      </TabsContent>
      
      <TabsContent value="export" className="mt-0">
        <ExportData />
      </TabsContent>
    </div>
  );
}