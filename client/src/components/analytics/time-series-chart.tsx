import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parse } from "date-fns";
import { TimeSeriesDataPoint } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  title: string;
  interval?: "hour" | "day" | "week" | "month";
}

export function TimeSeriesChart({ data, title, interval = "day" }: TimeSeriesChartProps) {
  const formattedData = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      console.error("Invalid data format in TimeSeriesChart:", data);
      return [];
    }
    
    return data.map(point => {
      // Format the date for display on the chart
      let formattedDate = point.date;
      
      try {
        if (interval === "hour") {
          // For hourly data (format: 2023-01-01 14:00)
          const date = parse(point.date, "yyyy-MM-dd HH:mm", new Date());
          formattedDate = format(date, "HH:mm");
        } else if (interval === "day") {
          // For daily data (format: 2023-01-01)
          const date = parse(point.date, "yyyy-MM-dd", new Date());
          formattedDate = format(date, "MMM dd");
        } else if (interval === "week") {
          // For weekly data (format: 2023-W01)
          // This is a simplified version, a real implementation would need more logic
          formattedDate = point.date.replace('-W', ' Week ');
        } else if (interval === "month") {
          // For monthly data (format: 2023-01)
          const date = parse(point.date, "yyyy-MM", new Date());
          formattedDate = format(date, "MMM yyyy");
        }
      } catch (e) {
        // Fallback to the original date format if parsing fails
        console.error("Date parsing error:", e, point);
      }
      
      return {
        ...point,
        formattedDate
      };
    });
  }, [data, interval]);

  // Handle empty data
  if (!formattedData.length) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg">No data available for this time period</p>
              <p className="text-sm mt-2">Try selecting a different date range</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={formattedData}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="formattedDate" 
                allowDataOverflow={false}
                minTickGap={15}
              />
              <YAxis 
                allowDecimals={false}
                domain={[0, 'auto']}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (!value && value !== 0) return ['-', ''];
                  if (name === "avgDuration") {
                    return [`${value} min`, "Avg. Duration"];
                  }
                  return [
                    value, 
                    name === "count" ? "Total" : 
                    name === "active" ? "Active" : 
                    name === "completed" ? "Completed" : 
                    name
                  ];
                }}
                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '4px', border: '1px solid #ddd' }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="count"
                stackId="1"
                stroke="#8884d8"
                fill="#8884d8"
                name="Total Visits"
                isAnimationActive={true}
              />
              <Area
                type="monotone"
                dataKey="active"
                stackId="2"
                stroke="#82ca9d"
                fill="#82ca9d"
                name="Active Visits"
                isAnimationActive={true}
              />
              <Area
                type="monotone"
                dataKey="completed"
                stackId="2"
                stroke="#ffc658"
                fill="#ffc658"
                name="Completed Visits"
                isAnimationActive={true}
              />
              <Area
                type="monotone"
                dataKey="avgDuration"
                stroke="#ff7300"
                fill="none"
                name="Avg. Duration (min)"
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}