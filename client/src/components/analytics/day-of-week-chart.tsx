import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DayOfWeekDistribution } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DayOfWeekChartProps {
  data: DayOfWeekDistribution[];
}

export function DayOfWeekChart({ data }: DayOfWeekChartProps) {
  // Ensure days of week are in order (Monday to Sunday)
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  // Create a map of the data for quick lookup
  const dataMap = data.reduce((acc, item) => {
    acc[item.day] = item.count;
    return acc;
  }, {} as Record<string, number>);
  
  // Create a properly ordered dataset with all days of the week
  const orderedData = daysOfWeek.map(day => ({
    day,
    count: dataMap[day] || 0
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Visits by Day of Week</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={orderedData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip
                formatter={(value) => [`${value} visits`, "Count"]}
                labelFormatter={(label) => `Day: ${label}`}
              />
              <Bar 
                dataKey="count" 
                fill="#82ca9d" 
                name="Visit Count"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}