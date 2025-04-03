import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { HourlyDistribution } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HourlyDistributionChartProps {
  data: HourlyDistribution[];
}

export function HourlyDistributionChart({ data }: HourlyDistributionChartProps) {
  // We format the hour to be more readable (e.g., "09" to "9 AM", "13" to "1 PM")
  const formattedData = data.map((item) => {
    const hour = parseInt(item.hour, 10);
    const formattedHour = hour === 0 ? "12 AM" : 
                          hour === 12 ? "12 PM" : 
                          hour < 12 ? `${hour} AM` : 
                          `${hour - 12} PM`;
    
    return {
      ...item,
      formattedHour,
    };
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Hourly Distribution of Check-ins</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={formattedData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="formattedHour" />
              <YAxis />
              <Tooltip
                formatter={(value) => [`${value} visits`, "Count"]}
                labelFormatter={(label) => `Hour: ${label}`}
              />
              <Bar 
                dataKey="count" 
                fill="#8884d8" 
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