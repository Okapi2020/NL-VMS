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
  // Validate input
  if (!data || !Array.isArray(data)) {
    console.error("Invalid data format in HourlyDistributionChart:", data);
    
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Visitors by Hour of Day</CardTitle>
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
          <CardTitle>Visitors by Hour of Day</CardTitle>
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
    // Filter data to only include hours between 10:00 - 22:00 (10 AM - 10 PM)
    // Convert data to 24-hour format
    const filteredData = data
      .filter(item => {
        const hour = parseInt(item.hour, 10);
        return hour >= 10 && hour <= 22; // Only include 10 AM to 10 PM
      })
      .map(item => {
        const hour = parseInt(item.hour, 10);
        return {
          ...item,
          formattedHour: `${hour}:00`, // 24-hour format
        };
      });

    // If we don't have any data for the selected time range, show a message
    if (filteredData.length === 0) {
      return (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Visitors by Hour of Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <p className="text-lg">No data available for 10:00 - 22:00</p>
                <p className="text-sm mt-2">No check-ins recorded during these hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Visitors by Hour of Day (10:00 - 22:00)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="formattedHour" 
                  interval={window.innerWidth < 768 ? 2 : 0} // Show fewer labels on mobile
                />
                <YAxis 
                  allowDecimals={false}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  formatter={(value) => [`${value} visits`, "Count"]}
                  labelFormatter={(label) => `Hour: ${label}`}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#8884d8" 
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
    console.error("Error rendering HourlyDistributionChart:", error);
    
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Visitors by Hour of Day</CardTitle>
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