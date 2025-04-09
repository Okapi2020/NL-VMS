import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminVisitorsTable } from "@/components/admin-visitors-table";
import { AdminVisitHistory } from "@/components/admin-visit-history";
import { AdminVisitTimeline } from "@/components/admin-visit-timeline-robust";
import { AdminSettings } from "@/components/admin-settings";
import { AdminSystemLogs } from "@/components/admin-system-logs";
import { DayOfWeekChart } from "@/components/analytics/day-of-week-chart";
import { HourlyDistributionChart } from "@/components/analytics/hourly-distribution-chart";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelector } from "@/components/language-selector";

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
  // Safely handle auth context
  let user = null;
  let logoutMutation = {
    mutate: () => { console.error("Logout not available"); },
    isPending: false
  };
  
  try {
    const auth = useAuth();
    user = auth.user;
    logoutMutation = auth.logoutMutation;
  } catch (error) {
    console.error("Error accessing auth context:", error);
    // Auth error will be handled by the protected route wrapper
  }
  
  const { toast } = useToast();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("current");
  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  
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
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

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
    error: visitHistoryError,
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
    <div className="flex flex-col h-screen bg-gray-100 admin-dashboard">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar navigation */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white shadow-md transition-all duration-300 ease-in-out`}>
          <div className={`${sidebarCollapsed ? 'px-3' : 'px-6'} pt-6 pb-4`}>
            <div className="flex items-center justify-between">
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
                {!sidebarCollapsed && <h2 className="ml-2 text-xl font-semibold text-gray-900">{headerAppName} Admin</h2>}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <ChevronDown className={`h-5 w-5 transition-transform ${sidebarCollapsed ? 'rotate-90' : 'rotate-270'}`} />
              </Button>
            </div>
            {!sidebarCollapsed && <p className="mt-1 text-sm text-gray-600">Welcome, {user?.username}</p>}
          </div>
          <nav className={`${sidebarCollapsed ? 'px-1' : 'px-2'} mt-2 flex-1 bg-white space-y-1`}>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setActiveView("dashboard"); }}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                activeView === "dashboard" 
                  ? "bg-primary-50 text-primary-700" 
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
              title={t("dashboard")}
            >
              <LayoutDashboard className={`${sidebarCollapsed ? '' : 'mr-3'} h-5 w-5 ${
                activeView === "dashboard" ? "text-primary-500" : "text-gray-400 group-hover:text-gray-500"
              }`} />
              {!sidebarCollapsed && t("dashboard")}
            </a>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setActiveView("visitors"); }}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                activeView === "visitors" 
                  ? "bg-primary-50 text-primary-700" 
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
              title={t("visitors")}
            >
              <UserRound className={`${sidebarCollapsed ? '' : 'mr-3'} h-5 w-5 ${
                activeView === "visitors" ? "text-primary-500" : "text-gray-400 group-hover:text-gray-500"
              }`} />
              {!sidebarCollapsed && t("visitors")}
            </a>

            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setActiveView("reports"); }}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                activeView === "reports" 
                  ? "bg-primary-50 text-primary-700" 
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
              title={t("reports")}
            >
              <ClipboardList className={`${sidebarCollapsed ? '' : 'mr-3'} h-5 w-5 ${
                activeView === "reports" ? "text-primary-500" : "text-gray-400 group-hover:text-gray-500"
              }`} />
              {!sidebarCollapsed && t("reports")}
            </a>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setActiveView("settings"); }}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                activeView === "settings" 
                  ? "bg-primary-50 text-primary-700" 
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
              title={t("settings")}
            >
              <SettingsIcon className={`${sidebarCollapsed ? '' : 'mr-3'} h-5 w-5 ${
                activeView === "settings" ? "text-primary-500" : "text-gray-400 group-hover:text-gray-500"
              }`} />
              {!sidebarCollapsed && t("settings")}
            </a>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 hover:text-gray-900 ${sidebarCollapsed ? 'justify-center' : ''}`}
              title={t("visitPortal")}
            >
              <ExternalLink className={`${sidebarCollapsed ? '' : 'mr-3'} h-5 w-5 text-gray-400 group-hover:text-gray-500`} />
              {!sidebarCollapsed && t("visitPortal")}
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
                } ${sidebarCollapsed ? 'justify-center' : ''}`}
                title={t("recycleBin")}
              >
                <Trash2 className={`${sidebarCollapsed ? '' : 'mr-3'} h-5 w-5 ${
                  activeView === "trash" ? "text-primary-500" : "text-gray-400 group-hover:text-gray-500"
                }`} />
                {!sidebarCollapsed && t("recycleBin")}
              </a>
              
              <Button
                variant="ghost"
                className={`w-full ${sidebarCollapsed ? 'justify-center' : 'justify-start'} group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 hover:text-gray-900`}
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                title={t("logout")}
              >
                <LogOut className={`${sidebarCollapsed ? '' : 'mr-3'} h-5 w-5 text-gray-400 group-hover:text-gray-500`} />
                {!sidebarCollapsed && (logoutMutation.isPending ? t("loggingOut") : t("logout"))}
              </Button>
            </div>
          </nav>
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-auto flex flex-col">
          <div className="py-6 px-4 sm:px-6 lg:px-8 flex-1">
            <div className="mb-6 md:flex md:items-center md:justify-between">
              <div className="flex-1 min-w-0 flex items-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-1 mr-3 rounded-full hover:bg-gray-100 md:hidden"
                >
                  <ChevronDown className={`h-5 w-5 transition-transform ${sidebarCollapsed ? 'rotate-270' : 'rotate-90'}`} />
                </Button>
                <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                  {activeView === "dashboard" && t("dashboard")}
                  {activeView === "visitors" && t("visitors")}
                  {activeView === "reports" && t("reports")}
                  {activeView === "trash" && t("recycleBin")}
                  {activeView === "settings" && t("settings")}
                </h2>
              </div>
              <div className="mt-4 flex md:mt-0 md:ml-4 items-center space-x-2">
                <LanguageSelector size="icon" variant="outline" />
                <ThemeToggle />
                <Button
                  variant="outline"
                  className="inline-flex items-center"
                  asChild
                >
                  <a href="/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t("visitPortal")}
                  </a>
                </Button>
                {activeView === "dashboard" && (
                  <Button
                    onClick={handleExportData}
                    className="ml-3 inline-flex items-center"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {t("exportData")}
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
                            {t("totalVisitorsToday")}
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
                            {t("currentlyCheckedIn")}
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
                            {t("averageVisitDuration")}
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-gray-900">
                              {isLoadingStats ? "..." : `${stats.averageVisitDuration} ${t("minutes")}`}
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
                            {t("analyticsOverview")}
                          </h3>
                          <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            {t("analyticsInsights")}
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
                              {t("visitorsByDayOfWeek")}
                            </CardTitle>
                            <CardDescription>
                              {t("visitorFrequencyPattern")}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {analyticsData && !isLoadingAnalytics ? (
                              <DayOfWeekChart data={analyticsData.byDayOfWeek} />
                            ) : (
                              <div className="flex justify-center items-center h-64">
                                <p className="text-gray-500">{t("loadingChartData")}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        
                        {/* Hourly Distribution Chart */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <TrendingUp className="mr-2 h-5 w-5 text-gray-500" />
                              {t("visitorsByHourOfDay")}
                            </CardTitle>
                            <CardDescription>
                              {t("checkInTrendByHour")}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {analyticsData && !isLoadingAnalytics ? (
                              <HourlyDistributionChart data={analyticsData.byHour} />
                            ) : (
                              <div className="flex justify-center items-center h-64">
                                <p className="text-gray-500">{t("loadingChartData")}</p>
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
                      <TabsTrigger value="current">{t("currentVisitors")}</TabsTrigger>
                      <TabsTrigger value="history">{t("visitHistory")}</TabsTrigger>
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
                  <TabsTrigger value="current">{t("currentVisitors")}</TabsTrigger>
                  <TabsTrigger value="history">{t("visitHistory")}</TabsTrigger>
                </TabsList>
                <TabsContent value="current">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("currentlyCheckedIn")}</CardTitle>
                      <CardDescription>
                        {t("visitorsCurrentlyInBuilding")}
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
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <CardTitle className="mb-2">{t("visitHistory")}</CardTitle>
                      <CardDescription>
                        {t("completeVisitRecord")}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleExportData}>
                        <Download className="mr-2 h-4 w-4" />
                        {t("exportData")}
                      </Button>
                    </div>
                  </div>
                  
                  <Tabs defaultValue="detailed" className="w-full">
                    <TabsList className="w-[400px] mb-4">
                      <TabsTrigger value="detailed">Detailed View</TabsTrigger>
                      <TabsTrigger value="timeline">Timeline View</TabsTrigger>
                    </TabsList>
                    <TabsContent value="detailed">
                      <Card>
                        <CardContent className="p-0">
                          <AdminVisitHistory
                            visitHistory={visitHistory}
                            isLoading={isLoadingVisitHistory}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="timeline">
                      <AdminVisitTimeline
                        visitHistory={visitHistory}
                        isLoading={isLoadingVisitHistory}
                        error={visitHistoryError}
                      />
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              </Tabs>
            )}
            
            {/* Reports View */}
            {activeView === "reports" && (
              <div className="space-y-6">
                <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
                  <div className="px-4 py-5 sm:px-6">
                    <h2 className="text-lg font-medium text-gray-900">{t("exportOptions")}</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {t("generateReportsDescription")}
                    </p>
                  </div>
                  <div className="px-4 py-5 sm:p-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-md font-medium text-gray-900">{t("visitHistoryReport")}</h3>
                        <div className="mt-2 max-w-xl text-sm text-gray-500">
                          <p>
                            {t("exportVisitHistoryDescription")}
                          </p>
                        </div>
                        <div className="mt-3">
                          <Button onClick={handleExportData}>
                            <Download className="mr-2 h-4 w-4" />
                            {t("exportToCsv")}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-200 pt-5">
                        <h3 className="text-md font-medium text-gray-900">{t("analyticsReport")}</h3>
                        <div className="mt-2 max-w-xl text-sm text-gray-500">
                          <p>
                            {t("exportAnalyticsDescription")}
                          </p>
                        </div>
                        <div className="mt-3">
                          <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" />
                            {t("exportAnalytics")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* System Logs Section */}
                <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
                  <div className="px-4 py-5 sm:px-6">
                    <h2 className="text-lg font-medium text-gray-900">{t("systemLogs") || "System Logs"}</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {t("systemLogsDescription") || "View system logs for auto-checkout operations and other system activities"}
                    </p>
                  </div>
                  <div className="px-4 py-5 sm:p-6">
                    <AdminSystemLogs />
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
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{t("deletedVisitors")}</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                      {t("deletedVisitorsDescription")}
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
                      {t("refresh")}
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => {
                        if (window.confirm(t("confirmEmptyRecycleBin"))) {
                          emptyBinMutation.mutate();
                        }
                      }}
                      disabled={deletedVisitors.length === 0 || emptyBinMutation.isPending}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      {t("emptyBin")}
                    </Button>
                  </div>
                </div>
                
                {deletedVisitors.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t("visitorName")}
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t("email")}
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t("phone")}
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t("createdAt")}
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t("actions")}
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
                              {visitor.deleted ? new Date(visitor.createdAt).toLocaleString() : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Button
                                variant="outline"
                                size="sm"
                                className="mr-2"
                                onClick={() => restoreVisitorMutation.mutate(visitor.id)}
                                disabled={restoreVisitorMutation.isPending}
                              >
                                {t("restore")}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (window.confirm(t("confirmPermanentDelete"))) {
                                    permanentlyDeleteMutation.mutate(visitor.id);
                                  }
                                }}
                                disabled={permanentlyDeleteMutation.isPending}
                              >
                                {t("delete")}
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
                    <h3 className="mt-2 text-sm font-medium text-gray-900">{t("noDeletedVisitors")}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {t("recycleBinEmpty")}
                    </p>
                  </div>
                )}
                
                {/* Pagination Controls */}
                {deletedVisitors.length > 0 && (
                  <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-center border-t border-gray-200">
                    <div className="flex items-center mb-4 sm:mb-0">
                      <span className="text-sm text-gray-700">
                        {t("page")} {trashPage} {t("of")} {Math.ceil(deletedVisitors.length / trashItemsPerPage)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTrashPage(prev => Math.max(prev - 1, 1))}
                        disabled={trashPage <= 1}
                      >
                        {t("previous")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTrashPage(prev => Math.min(prev + 1, Math.ceil(deletedVisitors.length / trashItemsPerPage)))}
                        disabled={trashPage >= Math.ceil(deletedVisitors.length / trashItemsPerPage)}
                      >
                        {t("next")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <footer className="py-4 px-6 bg-white border-t border-gray-200 text-center mt-auto">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} {footerAppName} • {t("allRightsReserved")}
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}