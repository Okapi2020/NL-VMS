import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminVisitorsTable } from "@/components/admin-visitors-table";
import { AdminVisitHistory } from "@/components/admin-visit-history";
import { AdminVisitorReports } from "@/components/admin-visitor-reports";
import { Visit, Visitor } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

// Type definition for the API response
type VisitWithVisitor = { 
  visit: Visit;
  visitor: Visitor;
};

// A simplified admin dashboard component for development mode
export default function DevAdminDashboard() {
  // Get current visitors
  const {
    data: currentVisitors = [] as VisitWithVisitor[],
    isLoading: isLoadingCurrentVisitors,
  } = useQuery<VisitWithVisitor[]>({
    queryKey: ["/api/admin/current-visitors"],
  });

  // Get visit history
  const {
    data: visitHistory = [] as VisitWithVisitor[],
    isLoading: isLoadingVisitHistory,
  } = useQuery<VisitWithVisitor[]>({
    queryKey: ["/api/admin/visit-history"],
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard (Development Mode)</h1>
        <div className="flex gap-2">
          <Button variant="outline">Refresh</Button>
          <Button variant="destructive">Logout</Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Development Mode Notice</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            You are viewing the simplified admin dashboard in development mode. 
            Authentication has been bypassed for easier development.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="visitors">
        <TabsList className="mb-4">
          <TabsTrigger value="visitors">Visitors</TabsTrigger>
          <TabsTrigger value="history">Visit History</TabsTrigger>
          <TabsTrigger value="reports">Visitor Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="visitors">
          <Card>
            <CardHeader>
              <CardTitle>Current Visitors</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminVisitorsTable 
                visits={currentVisitors} 
                isLoading={isLoadingCurrentVisitors} 
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Visit History</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminVisitHistory 
                visitHistory={visitHistory} 
                isLoading={isLoadingVisitHistory} 
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Visitor Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminVisitorReports />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}