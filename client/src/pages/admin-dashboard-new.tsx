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
  TrendingUp,
  CalendarDays,
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

  // Export data to CSV
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
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
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
        <div className="flex-1 overflow-auto">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            {/* Page header with title and buttons */}
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

                {/* Analytics Cards - Expandable */}
                <div className="mt-8 mb-12">
                  <Collapsible open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
                    <Card className="w-full overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <CardHeader className="pb-2 cursor-pointer hover:bg-gray-50 transition-colors border-b">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">
                                Analytics Overview
                              </CardTitle>
                              <CardDescription>
                                Visitor traffic patterns and peak times
                              </CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isAnalyticsOpen ? "" : "transform rotate-180"}`} />
                              <span className="sr-only">Toggle analytics panel</span>
                            </Button>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-6 pb-10">
                          <Tabs defaultValue="day" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6">
                              <TabsTrigger value="day">
                                <CalendarDays className="h-4 w-4 mr-2" /> 
                                Day Frequency
                              </TabsTrigger>
                              <TabsTrigger value="hour">
                                <TrendingUp className="h-4 w-4 mr-2" /> 
                                Peak Hours
                              </TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="day" className="mt-4 w-full">
                              {isLoadingAnalytics ? (
                                <div className="flex justify-center p-8 h-[300px]">
                                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                                </div>
                              ) : !analyticsData?.byDayOfWeek?.length ? (
                                <div className="text-center py-8 h-[300px] text-gray-500">
                                  <p>No data available</p>
                                </div>
                              ) : (
                                <div className="h-[350px] w-full pb-6">
                                  <DayOfWeekChart data={analyticsData.byDayOfWeek} />
                                </div>
                              )}
                            </TabsContent>
                            
                            <TabsContent value="hour" className="mt-4 w-full">
                              {isLoadingAnalytics ? (
                                <div className="flex justify-center p-8 h-[300px]">
                                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                                </div>
                              ) : !analyticsData?.byHour?.length ? (
                                <div className="text-center py-8 h-[300px] text-gray-500">
                                  <p>No data available</p>
                                </div>
                              ) : (
                                <div className="h-[350px] w-full pb-6">
                                  <HourlyDistributionChart data={analyticsData.byHour} />
                                </div>
                              )}
                            </TabsContent>
                          </Tabs>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                </div>

                {/* Visitor List Tabs */}
                <div className="mt-2 border-t border-gray-200 pt-4">
                  <Card>
                    <CardContent className="p-6">
                      <Tabs defaultValue="current" onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-2 max-w-md">
                          <TabsTrigger value="current">Current Visitors</TabsTrigger>
                          <TabsTrigger value="history">Visit History</TabsTrigger>
                        </TabsList>
                        <div className="mt-6">
                          <TabsContent value="current">
                            <AdminVisitorsTable 
                              visits={currentVisitors} 
                              isLoading={isLoadingCurrentVisitors} 
                            />
                          </TabsContent>
                          <TabsContent value="history">
                            <AdminVisitHistory 
                              visitHistory={visitHistory} 
                              isLoading={isLoadingVisitHistory} 
                            />
                          </TabsContent>
                        </div>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* Visitors View */}
            {activeView === "visitors" && (
              <div className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-medium mb-4">All Visitors</h3>
                    <p className="text-gray-500 mb-4">View and manage all visitors registered in the system.</p>
                    <AdminVisitHistory 
                      visitHistory={visitHistory} 
                      isLoading={isLoadingVisitHistory} 
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Reports View */}
            {activeView === "reports" && (
              <div className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-medium mb-4">Available Reports</h3>
                    <p className="text-gray-500 mb-4">Generate reports for different time periods.</p>
                    
                    <div className="space-y-4 mt-6">
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div>
                          <h4 className="font-medium">Daily Visitor Report</h4>
                          <p className="text-sm text-gray-500">Summary of visitors for the current day</p>
                        </div>
                        <Button onClick={handleExportData}>
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div>
                          <h4 className="font-medium">Weekly Visitor Report</h4>
                          <p className="text-sm text-gray-500">Summary of visitors for the current week</p>
                        </div>
                        <Button onClick={handleExportData}>
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div>
                          <h4 className="font-medium">Monthly Visitor Report</h4>
                          <p className="text-sm text-gray-500">Summary of visitors for the current month</p>
                        </div>
                        <Button onClick={handleExportData}>
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Trash Bin View */}
            {activeView === "trash" && (
              <div className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-medium">Recycle Bin</h3>
                        <p className="text-gray-500">Manage deleted visitor records</p>
                      </div>
                      <div className="space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (selectedVisitors.length > 0) {
                              setSelectedVisitors([]);
                            } else {
                              // Select all visible visitors
                              setSelectedVisitors(paginatedDeletedVisitors.map(visitor => visitor.id));
                            }
                          }}
                        >
                          {selectedVisitors.length > 0 ? "Deselect All" : "Select All"}
                        </Button>
                        {selectedVisitors.length > 0 && (
                          <Button
                            variant="destructive"
                            onClick={() => {
                              if (window.confirm(`Permanently delete ${selectedVisitors.length} selected visitor(s)?`)) {
                                setIsProcessingBulk(true);
                                Promise.all(
                                  selectedVisitors.map(id => permanentlyDeleteMutation.mutateAsync(id))
                                )
                                  .then(() => {
                                    toast({
                                      title: "Success",
                                      description: `${selectedVisitors.length} visitor(s) permanently deleted`,
                                    });
                                    setSelectedVisitors([]);
                                  })
                                  .catch((error) => {
                                    toast({
                                      title: "Error",
                                      description: `Failed to delete visitors: ${error.message}`,
                                      variant: "destructive",
                                    });
                                  })
                                  .finally(() => {
                                    setIsProcessingBulk(false);
                                  });
                              }
                            }}
                            disabled={isProcessingBulk}
                          >
                            {isProcessingBulk ? "Processing..." : "Delete Selected"}
                          </Button>
                        )}
                        {selectedVisitors.length > 0 && (
                          <Button
                            variant="default"
                            onClick={() => {
                              if (window.confirm(`Restore ${selectedVisitors.length} selected visitor(s)?`)) {
                                setIsProcessingBulk(true);
                                Promise.all(
                                  selectedVisitors.map(id => restoreVisitorMutation.mutateAsync(id))
                                )
                                  .then(() => {
                                    toast({
                                      title: "Success",
                                      description: `${selectedVisitors.length} visitor(s) restored successfully`,
                                    });
                                    setSelectedVisitors([]);
                                  })
                                  .catch((error) => {
                                    toast({
                                      title: "Error",
                                      description: `Failed to restore visitors: ${error.message}`,
                                      variant: "destructive",
                                    });
                                  })
                                  .finally(() => {
                                    setIsProcessingBulk(false);
                                  });
                              }
                            }}
                            disabled={isProcessingBulk}
                          >
                            {isProcessingBulk ? "Processing..." : "Restore Selected"}
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Empty bin button */}
                    {deletedVisitors.length > 0 && (
                      <div className="mb-4">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (window.confirm("Permanently delete all items in the recycle bin? This action cannot be undone.")) {
                              emptyBinMutation.mutate();
                            }
                          }}
                          disabled={emptyBinMutation.isPending}
                          className="flex items-center"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          {emptyBinMutation.isPending ? "Emptying bin..." : "Empty Recycle Bin"}
                        </Button>
                      </div>
                    )}
                    
                    {/* Table of deleted visitors */}
                    {isLoadingDeletedVisitors ? (
                      <div className="flex justify-center p-8">
                        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : deletedVisitors.length === 0 ? (
                      <div className="text-center py-8 border rounded-lg">
                        <Trash2 className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-500">Recycle bin is empty</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                  checked={selectedVisitors.length === paginatedDeletedVisitors.length && paginatedDeletedVisitors.length > 0}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedVisitors(paginatedDeletedVisitors.map(visitor => visitor.id));
                                    } else {
                                      setSelectedVisitors([]);
                                    }
                                  }}
                                />
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Visitor
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Contact Info
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedDeletedVisitors.map((visitor) => (
                              <tr key={visitor.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                    checked={selectedVisitors.includes(visitor.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedVisitors([...selectedVisitors, visitor.id]);
                                      } else {
                                        setSelectedVisitors(selectedVisitors.filter(id => id !== visitor.id));
                                      }
                                    }}
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {visitor.fullName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Year of Birth: {visitor.yearOfBirth}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {visitor.email}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {visitor.phoneNumber}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => restoreVisitorMutation.mutate(visitor.id)}
                                      disabled={restoreVisitorMutation.isPending}
                                    >
                                      Restore
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        if (window.confirm("Permanently delete this visitor? This action cannot be undone.")) {
                                          permanentlyDeleteMutation.mutate(visitor.id);
                                        }
                                      }}
                                      disabled={permanentlyDeleteMutation.isPending}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Settings View */}
            {activeView === "settings" && (
              <div className="mt-6 space-y-6">
                {/* Application Settings Section */}
                <AdminSettings />
                
                {/* Account Settings Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                    <CardDescription>
                      Manage administrator accounts and permissions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Your Administrator Account</h4>
                        <div className="bg-gray-50 p-4 rounded-md">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{user?.username}</div>
                              <div className="text-sm text-gray-500">Administrator</div>
                            </div>
                            <Button variant="outline" size="sm">
                              Change Password
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-2">Other Administrators</h4>
                        <p className="text-sm text-gray-500 mb-4">
                          Manage who has administrative access to the system
                        </p>
                        
                        <div className="mt-4">
                          <Button>Create Administrator</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="py-4 px-6 bg-white border-t border-gray-200 text-center">
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} {footerAppName} • All rights reserved
        </p>
      </footer>
    </div>
  );
}