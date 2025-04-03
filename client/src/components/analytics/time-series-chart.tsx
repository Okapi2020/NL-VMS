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
        console.error("Date parsing error:", e);
      }
      
      return {
        ...point,
        formattedDate
      };
    });
  }, [data, interval]);

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
              <XAxis dataKey="formattedDate" />
              <YAxis />
              <Tooltip formatter={(value, name) => {
                if (name === "avgDuration") {
                  return [`${value} min`, "Avg. Duration"];
                }
                return [value, name === "count" ? "Total" : name === "active" ? "Active" : "Completed"];
              }} />
              <Legend />
              <Area
                type="monotone"
                dataKey="count"
                stackId="1"
                stroke="#8884d8"
                fill="#8884d8"
                name="Total Visits"
              />
              <Area
                type="monotone"
                dataKey="active"
                stackId="2"
                stroke="#82ca9d"
                fill="#82ca9d"
                name="Active Visits"
              />
              <Area
                type="monotone"
                dataKey="completed"
                stackId="2"
                stroke="#ffc658"
                fill="#ffc658"
                name="Completed Visits"
              />
              <Area
                type="monotone"
                dataKey="avgDuration"
                stroke="#ff7300"
                fill="none"
                name="Avg. Duration (min)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}