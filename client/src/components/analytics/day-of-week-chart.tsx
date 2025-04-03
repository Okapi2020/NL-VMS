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
  // Validate input
  if (!data || !Array.isArray(data)) {
    console.error("Invalid data format in DayOfWeekChart:", data);
    
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Visits by Day of Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg">Error displaying chart</p>
              <p className="text-sm mt-2">Invalid data format</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Handle empty data case
  if (data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Visits by Day of Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg">No data available</p>
              <p className="text-sm mt-2">Try selecting a different date range</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  try {
    // Ensure days of week are in order (Monday to Sunday)
    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    
    // Create a map of the data for quick lookup
    const dataMap = data.reduce((acc, item) => {
      if (item && typeof item.day === 'string' && typeof item.count === 'number') {
        acc[item.day] = item.count;
      }
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
                <YAxis allowDecimals={false} domain={[0, 'auto']} />
                <Tooltip
                  formatter={(value) => [`${value} visits`, "Count"]}
                  labelFormatter={(label) => `Day: ${label}`}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#82ca9d" 
                  name="Visit Count"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={true}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  } catch (error) {
    console.error("Error rendering DayOfWeekChart:", error);
    
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Visits by Day of Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg">Error displaying chart</p>
              <p className="text-sm mt-2">Please try again later</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
}