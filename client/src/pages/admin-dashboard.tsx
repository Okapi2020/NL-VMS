import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminVisitorsTable } from "@/components/admin-visitors-table";
import { AdminVisitHistory } from "@/components/admin-visit-history";
import { AdminSettings } from "@/components/admin-settings";
import { DayOfWeekChart } from "@/components/analytics/day-of-week-chart";
import { HourlyDistributionChart } from "@/components/analytics/hourly-distribution-chart";
import { ThemeToggle } from "@/components/theme-toggle";

import { exportToCSV } from "@/lib/utils";
import { Visit, Visitor, Settings } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  UsersRound,
  UserRound,
  Clock,
  ClipboardList,
  LayoutDashboard,
  Settings as SettingsIcon,
  LogOut,
  Download,
  ExternalLink,
  Trash2,
  RefreshCw,
  Trash,
  BarChart,
  CalendarDays,
  TrendingUp,
  ChevronDown,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("current");
  const [activeView, setActiveView] = useState("dashboard");
  
  // Get application settings
  const { 
    data: settings 
  } = useQuery<Settings>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });
  
  // Get application names from settings
  const appName = settings?.appName || "Visitor Management System";
  const headerAppName = settings?.headerAppName || appName;
  const footerAppName = settings?.footerAppName || appName;
  
  // Pagination state
  const [trashPage, setTrashPage] = useState(1);
  const [trashItemsPerPage, setTrashItemsPerPage] = useState(10);
  const [selectedVisitors, setSelectedVisitors] = useState<number[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(true);

  // Define types for our API responses
  type VisitWithVisitor = { 
    visit: Visit;
    visitor: Visitor;
  };
  
  type DashboardStats = {
    totalVisitorsToday: number;
    currentlyCheckedIn: number;
    averageVisitDuration: number;
    uniqueVisitorsToday?: number;
    percentChangeFromAvg?: number;
    totalRegisteredVisitors?: number;
    returningVisitors?: number;
    returningVisitorsPercentage?: number;
    peakHour?: number;
    totalVisitsAllTime?: number;
  };

  // Get current visitors
  const {
    data: currentVisitors = [] as VisitWithVisitor[],
    isLoading: isLoadingCurrentVisitors,
  } = useQuery<VisitWithVisitor[]>({
    queryKey: ["/api/admin/current-visitors"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get visit history
  const {
    data: visitHistory = [] as VisitWithVisitor[],
    isLoading: isLoadingVisitHistory,
  } = useQuery<VisitWithVisitor[]>({
    queryKey: ["/api/admin/visit-history"],
  });

  // Get dashboard stats
  const {
    data: stats = { 
      totalVisitorsToday: 0, 
      currentlyCheckedIn: 0, 
      averageVisitDuration: 0 
    } as DashboardStats,
    isLoading: isLoadingStats,
  } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 60000, // Refresh every minute
  });
  
  // Get deleted visitors (trash bin)
  const {
    data: deletedVisitors = [] as Visitor[],
    isLoading: isLoadingDeletedVisitors,
    refetch: refetchTrash
  } = useQuery<Visitor[]>({
    queryKey: ["/api/admin/trash"],
    enabled: activeView === "trash"
  });
  
  // Define type for analytics data
  type AnalyticsData = {
    summary: {
      totalVisits: number;
      uniqueVisitors: number;
      completedVisits: number;
      activeVisits: number;
      averageVisitDuration: number;
    };
    timeSeries: {
      date: string;
      count: number;
      active: number;
      completed: number;
      avgDuration: number;
    }[];
    byHour: {
      hour: string;
      count: number;
    }[];
    byDayOfWeek: {
      day: string;
      count: number;
    }[];
  };
  
  // Get analytics data for dashboard cards
  const {
    data: analyticsData,
    isLoading: isLoadingAnalytics,
  } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/data"],
    enabled: activeView === "dashboard"
  });
  
  // Empty trash bin mutation
  const emptyBinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/admin/empty-bin");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Recycle bin emptied successfully",
      });
      refetchTrash();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to empty recycle bin: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Permanently delete visitor mutation
  const permanentlyDeleteMutation = useMutation({
    mutationFn: async (visitorId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/permanently-delete/${visitorId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Visitor permanently deleted",
      });
      refetchTrash();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete visitor: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Restore visitor mutation
  const restoreVisitorMutation = useMutation({
    mutationFn: async (visitorId: number) => {
      const res = await apiRequest("POST", `/api/admin/restore-visitor/${visitorId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Visitor restored successfully",
      });
      
      // Invalidate all relevant queries to refresh data everywhere
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      
      // If trash bin is now empty, automatically navigate to the visitors view
      if (deletedVisitors.length === 1) {
        setActiveView("visitors");
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to restore visitor: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Calculate paginated data for trash bin
  const paginatedDeletedVisitors = deletedVisitors.slice(
    (trashPage - 1) * trashItemsPerPage, 
    trashPage * trashItemsPerPage
  );

  // Reset selected visitors when changing views
  useEffect(() => {
    setSelectedVisitors([]);
  }, [activeView]);

  const handleExportData = () => {
    // Export visit history data
    const dataToExport = visitHistory.map(({ visit, visitor }) => ({
      VisitorName: visitor.fullName,
      Email: visitor.email || "",
      Phone: visitor.phoneNumber,
      YearOfBirth: visitor.yearOfBirth,
      CheckInTime: new Date(visit.checkInTime).toLocaleString(),
      CheckOutTime: visit.checkOutTime ? new Date(visit.checkOutTime).toLocaleString() : "N/A",
      VisitStatus: visit.active ? "Active" : "Completed"
    }));

    exportToCSV(dataToExport, `visit-history-${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar navigation */}
        <div className="w-64 bg-white shadow-md">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center">
              <svg
                className="h-8 w-8 text-primary-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              <h2 className="ml-2 text-xl font-semibold text-gray-900">{headerAppName} Admin</h2>
            </div>
            <p className="mt-1 text-sm text-gray-600">Welcome, {user?.username}</p>
          </div>
          <nav className="mt-2 flex-1 px-2 bg-white space-y-1">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setActiveView("dashboard"); }}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                activeView === "dashboard" 
                  ? "bg-primary-50 text-primary-700" 
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <LayoutDashboard className={`mr-3 h-5 w-5 ${
                activeView === "dashboard" ? "text-primary-500" : "text-gray-400 group-hover:text-gray-500"
              }`} />
              Dashboard
            </a>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setActiveView("visitors"); }}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                activeView === "visitors" 
                  ? "bg-primary-50 text-primary-700" 
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <UserRound className={`mr-3 h-5 w-5 ${
                activeView === "visitors" ? "text-primary-500" : "text-gray-400 group-hover:text-gray-500"
              }`} />
              Visitors
            </a>

            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setActiveView("reports"); }}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                activeView === "reports" 
                  ? "bg-primary-50 text-primary-700" 
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <ClipboardList className={`mr-3 h-5 w-5 ${
                activeView === "reports" ? "text-primary-500" : "text-gray-400 group-hover:text-gray-500"
              }`} />
              Reports
            </a>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setActiveView("settings"); }}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                activeView === "settings" 
                  ? "bg-primary-50 text-primary-700" 
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <SettingsIcon className={`mr-3 h-5 w-5 ${
                activeView === "settings" ? "text-primary-500" : "text-gray-400 group-hover:text-gray-500"
              }`} />
              Settings
            </a>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              <ExternalLink className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
              Visit Check-In Portal
            </a>
            
            {/* Bottom section with Recycle Bin and Logout */}
            <div className="pt-4 mt-auto border-t border-gray-200">
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setActiveView("trash"); }}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  activeView === "trash" 
                    ? "bg-primary-50 text-primary-700" 
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Trash2 className={`mr-3 h-5 w-5 ${
                  activeView === "trash" ? "text-primary-500" : "text-gray-400 group-hover:text-gray-500"
                }`} />
                Recycle Bin
              </a>
              
              <Button
                variant="ghost"
                className="w-full justify-start group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                {logoutMutation.isPending ? "Logging out..." : "Logout"}
              </Button>
            </div>
          </nav>
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-auto flex flex-col">
          <div className="py-6 px-4 sm:px-6 lg:px-8 flex-1">
            <div className="mb-6 md:flex md:items-center md:justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                  {activeView === "dashboard" && "Dashboard"}
                  {activeView === "visitors" && "Visitors"}
                  {activeView === "reports" && "Reports"}
                  {activeView === "trash" && "Recycle Bin"}
                  {activeView === "settings" && "Settings"}
                </h2>
              </div>
              <div className="mt-4 flex md:mt-0 md:ml-4 items-center space-x-2">
                <ThemeToggle />
                <Button
                  variant="outline"
                  className="inline-flex items-center"
                  asChild
                >
                  <a href="/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Visit Portal
                  </a>
                </Button>
                {activeView === "dashboard" && (
                  <Button
                    onClick={handleExportData}
                    className="ml-3 inline-flex items-center"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                  </Button>
                )}
              </div>
            </div>

            {/* Dashboard View */}
            {activeView === "dashboard" && (
              <>
                {/* Stats Cards */}
                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Total visitors today */}
                  <Card>
                    <CardContent className="px-4 py-5 sm:p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                          <UsersRound className="h-6 w-6 text-primary-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Visitors Today
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-gray-900">
                              {isLoadingStats ? "..." : stats.totalVisitorsToday}
                            </div>
                          </dd>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Currently checked in */}
                  <Card>
                    <CardContent className="px-4 py-5 sm:p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                          <UserRound className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Currently Checked In
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-gray-900">
                              {isLoadingStats ? "..." : stats.currentlyCheckedIn}
                            </div>
                          </dd>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Average visit duration */}
                  <Card>
                    <CardContent className="px-4 py-5 sm:p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                          <Clock className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Average Visit Duration
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-gray-900">
                              {isLoadingStats ? "..." : `${stats.averageVisitDuration} min`}
                            </div>
                          </dd>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Analytics Overview */}
                <Collapsible 
                  open={isAnalyticsOpen} 
                  onOpenChange={setIsAnalyticsOpen}
                  className="mt-6 bg-white rounded-lg shadow overflow-hidden"
                >
                  <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
                    <CollapsibleTrigger asChild>
                      <div className="w-full flex justify-between items-center cursor-pointer group">
                        <div>
                          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                            <BarChart className="mr-2 h-5 w-5 text-gray-500" />
                            Analytics Overview
                          </h3>
                          <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            Insights into visitor patterns and trends
                          </p>
                        </div>
                        <ChevronDown 
                          className={`h-5 w-5 text-gray-400 group-hover:text-gray-500 transition-transform duration-200 ${
                            isAnalyticsOpen ? 'rotate-180' : ''
                          }`} 
                        />
                      </div>
                    </CollapsibleTrigger>
                  </div>
                  
                  <CollapsibleContent>
                    <div className="px-4 py-5 sm:p-6 bg-gray-50">
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Day of Week Chart */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <CalendarDays className="mr-2 h-5 w-5 text-gray-500" />
                              Visitors by Day of Week
                            </CardTitle>
                            <CardDescription>
                              Pattern of visitor frequency by day
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {analyticsData && !isLoadingAnalytics ? (
                              <DayOfWeekChart data={analyticsData.byDayOfWeek} />
                            ) : (
                              <div className="flex justify-center items-center h-64">
                                <p className="text-gray-500">Loading chart data...</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        
                        {/* Hourly Distribution Chart */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <TrendingUp className="mr-2 h-5 w-5 text-gray-500" />
                              Visitors by Hour of Day
                            </CardTitle>
                            <CardDescription>
                              Trend of check-ins throughout the day
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {analyticsData && !isLoadingAnalytics ? (
                              <HourlyDistributionChart data={analyticsData.byHour} />
                            ) : (
                              <div className="flex justify-center items-center h-64">
                                <p className="text-gray-500">Loading chart data...</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                
                <div className="mt-8">
                  <Tabs defaultValue="current" onValueChange={(value) => setActiveTab(value)}>
                    <TabsList className="mb-4">
                      <TabsTrigger value="current">Current Visitors</TabsTrigger>
                      <TabsTrigger value="history">Visit History</TabsTrigger>
                    </TabsList>
                    <TabsContent value="current">
                      <Card>
                        <CardContent className="p-0">
                          <AdminVisitorsTable 
                            visits={currentVisitors}
                            isLoading={isLoadingCurrentVisitors}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="history">
                      <Card>
                        <CardContent className="p-0">
                          <AdminVisitHistory
                            visitHistory={visitHistory}
                            isLoading={isLoadingVisitHistory}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </>
            )}
            
            {/* Visitors View */}
            {activeView === "visitors" && (
              <Tabs defaultValue="current" onValueChange={(value) => setActiveTab(value)}>
                <TabsList className="mb-4">
                  <TabsTrigger value="current">Current Visitors</TabsTrigger>
                  <TabsTrigger value="history">Visit History</TabsTrigger>
                </TabsList>
                <TabsContent value="current">
                  <Card>
                    <CardHeader>
                      <CardTitle>Currently Checked In</CardTitle>
                      <CardDescription>
                        Visitors currently in the building
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
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
                      <CardDescription>
                        Complete record of all visits
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <AdminVisitHistory
                        visitHistory={visitHistory}
                        isLoading={isLoadingVisitHistory}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
            
            {/* Reports View */}
            {activeView === "reports" && (
              <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
                <div className="px-4 py-5 sm:px-6">
                  <h2 className="text-lg font-medium text-gray-900">Export Options</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Generate and download reports from your visitor data
                  </p>
                </div>
                <div className="px-4 py-5 sm:p-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-md font-medium text-gray-900">Visit History Report</h3>
                      <div className="mt-2 max-w-xl text-sm text-gray-500">
                        <p>
                          Export complete visit history including visitor details and check-in/out times
                        </p>
                      </div>
                      <div className="mt-3">
                        <Button onClick={handleExportData}>
                          <Download className="mr-2 h-4 w-4" />
                          Export to CSV
                        </Button>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-5">
                      <h3 className="text-md font-medium text-gray-900">Analytics Report</h3>
                      <div className="mt-2 max-w-xl text-sm text-gray-500">
                        <p>
                          Export analytics data including visitor patterns and trends
                        </p>
                      </div>
                      <div className="mt-3">
                        <Button variant="outline">
                          <Download className="mr-2 h-4 w-4" />
                          Export Analytics
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Settings View */}
            {activeView === "settings" && (
              <div className="bg-white shadow rounded-lg">
                <AdminSettings />
              </div>
            )}
            
            {/* Trash Bin View */}
            {activeView === "trash" && (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Deleted Visitors</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                      Visitors that have been deleted can be restored or permanently removed
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => refetchTrash()}
                      disabled={isLoadingDeletedVisitors}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => {
                        if (window.confirm("Are you sure you want to empty the recycle bin? This action cannot be undone.")) {
                          emptyBinMutation.mutate();
                        }
                      }}
                      disabled={deletedVisitors.length === 0 || emptyBinMutation.isPending}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Empty Bin
                    </Button>
                  </div>
                </div>
                
                {deletedVisitors.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Visitor Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Phone
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Deleted At
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedDeletedVisitors.map((visitor) => (
                          <tr key={visitor.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {visitor.fullName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {visitor.email || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {visitor.phoneNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {visitor.deletedAt ? new Date(visitor.deletedAt).toLocaleString() : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Button
                                variant="outline"
                                size="sm"
                                className="mr-2"
                                onClick={() => restoreVisitorMutation.mutate(visitor.id)}
                                disabled={restoreVisitorMutation.isPending}
                              >
                                Restore
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to permanently delete this visitor? This action cannot be undone.")) {
                                    permanentlyDeleteMutation.mutate(visitor.id);
                                  }
                                }}
                                disabled={permanentlyDeleteMutation.isPending}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Trash2 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No deleted visitors</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      The recycle bin is empty
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <footer className="py-4 px-6 bg-white border-t border-gray-200 text-center mt-auto">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} {footerAppName} • All rights reserved
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}