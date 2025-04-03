import { UsersRound, CheckSquare, Clock, UserCheck, UserPlus } from "lucide-react";
import { AnalyticsSummary as SummaryData } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalyticsSummaryProps {
  data: SummaryData;
}

export function AnalyticsSummary({ data }: AnalyticsSummaryProps) {
  const summaryItems = [
    {
      title: "Total Visits",
      value: data.totalVisits,
      icon: <UsersRound className="h-4 w-4 text-blue-500" />,
      description: "Total number of visits recorded",
    },
    {
      title: "Unique Visitors",
      value: data.uniqueVisitors,
      icon: <UserPlus className="h-4 w-4 text-indigo-500" />,
      description: "Number of distinct visitors",
    },
    {
      title: "Completed Visits",
      value: data.completedVisits,
      icon: <CheckSquare className="h-4 w-4 text-green-500" />,
      description: "Visits with check-out recorded",
    },
    {
      title: "Active Visits",
      value: data.activeVisits,
      icon: <UserCheck className="h-4 w-4 text-amber-500" />,
      description: "Visitors currently checked in",
    },
    {
      title: "Avg. Visit Duration",
      value: `${data.averageVisitDuration.toFixed(0)} min`,
      icon: <Clock className="h-4 w-4 text-rose-500" />,
      description: "Average time spent per visit",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {summaryItems.map((item, index) => (
        <Card key={index}>
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
}