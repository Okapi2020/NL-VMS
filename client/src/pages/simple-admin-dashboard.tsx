import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Settings } from "@shared/schema";

// A super simplified admin dashboard for development mode
export default function SimpleAdminDashboard() {
  // Get application settings
  const { 
    data: settings,
    isLoading: isLoadingSettings
  } = useQuery<any>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard (Development)</h1>
        <div className="flex gap-2">
          <Button variant="outline">Refresh</Button>
          <Button variant="destructive">Logout</Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Development Mode Active</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            You are viewing the simplified admin dashboard in development mode. 
            Authentication has been bypassed for easier development.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingSettings ? (
                  <div className="text-center">Loading settings...</div>
                ) : (
                  <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                    {JSON.stringify(settings, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Authentication Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Authentication Bypass:</span>
                    <span className="font-medium text-green-600">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span>User:</span>
                    <span className="font-medium">admin</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Environment:</span>
                    <span className="font-medium">Development</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="mr-2 text-green-600">✓</span>
                <span>Authentication Bypass</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-green-600">✓</span>
                <span>Auto Admin Login</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-green-600">✓</span>
                <span>API Access</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-green-600">✓</span>
                <span>Settings Access</span>
              </li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Visitor Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Temporarily unavailable in simplified mode.</p>
            <Button variant="outline" className="mt-4 w-full">
              Open Full Dashboard
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Application:</span>
                <span className="font-medium">
                  {settings?.appName || "Visitor Management System"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Mode:</span>
                <span className="font-medium">Development</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-medium text-green-600">Online</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}