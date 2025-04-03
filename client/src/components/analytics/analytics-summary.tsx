import { UsersRound, CheckSquare, Clock, UserCheck, UserPlus, AlertCircle } from "lucide-react";
import { AnalyticsSummary as SummaryData } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalyticsSummaryProps {
  data: SummaryData;
}

export function AnalyticsSummary({ data }: AnalyticsSummaryProps) {
  // Error handling for missing or invalid data
  if (!data) {
    console.error("Missing data in AnalyticsSummary");
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array(5).fill(0).map((_, index) => (
          <Card key={index} className="border-red-200 bg-red-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-800">
                Error
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-red-800">Data unavailable</div>
              <p className="text-xs text-red-600">
                Please try again later
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  try {
    const summaryItems = [
      {
        title: "Total Visits",
        value: data.totalVisits ?? 0,
        icon: <UsersRound className="h-4 w-4 text-blue-500" />,
        description: "Total number of visits recorded",
      },
      {
        title: "Unique Visitors",
        value: data.uniqueVisitors ?? 0,
        icon: <UserPlus className="h-4 w-4 text-indigo-500" />,
        description: "Number of distinct visitors",
      },
      {
        title: "Completed Visits",
        value: data.completedVisits ?? 0,
        icon: <CheckSquare className="h-4 w-4 text-green-500" />,
        description: "Visits with check-out recorded",
      },
      {
        title: "Active Visits",
        value: data.activeVisits ?? 0,
        icon: <UserCheck className="h-4 w-4 text-amber-500" />,
        description: "Visitors currently checked in",
      },
      {
        title: "Avg. Visit Duration",
        value: `${(data.averageVisitDuration ?? 0).toFixed(0)} min`,
        icon: <Clock className="h-4 w-4 text-rose-500" />,
        description: "Average time spent per visit",
      },
    ];

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {summaryItems.map((item, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {item.title}
              </CardTitle>
              {item.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  } catch (error) {
    console.error("Error rendering AnalyticsSummary:", error);
    
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array(5).fill(0).map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                {["Total Visits", "Unique Visitors", "Completed Visits", "Active Visits", "Avg. Visit Duration"][index]}
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">
                Data processing error
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
}