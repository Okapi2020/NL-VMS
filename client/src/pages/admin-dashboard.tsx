import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminVisitorsTable } from "@/components/admin-visitors-table";
import { AdminVisitHistory } from "@/components/admin-visit-history";
import { AdminSettings } from "@/components/admin-settings";
import { AnalyticsDashboard } from "@/components/analytics";
import { exportToCSV } from "@/lib/utils";
import { Visit, Visitor } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  UsersRound,
  UserRound,
  Clock,
  ClipboardList,
  LayoutDashboard,
  Settings,
  LogOut,
  Download,
  ExternalLink,
  Trash2,
  RefreshCw,
  Trash,
  BarChart,
} from "lucide-react";

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("current");
  const [activeView, setActiveView] = useState("dashboard");
  
  // Pagination state
  const [trashPage, setTrashPage] = useState(1);
  const [trashItemsPerPage, setTrashItemsPerPage] = useState(10);
  const [selectedVisitors, setSelectedVisitors] = useState<number[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

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
    <div className="flex h-screen bg-gray-100">
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
            <h2 className="ml-2 text-xl font-semibold text-gray-900">Admin Dashboard</h2>
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
            onClick={(e) => { e.preventDefault(); setActiveView("analytics"); }}
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
              activeView === "analytics" 
                ? "bg-primary-50 text-primary-700" 
                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <BarChart className={`mr-3 h-5 w-5 ${
              activeView === "analytics" ? "text-primary-500" : "text-gray-400 group-hover:text-gray-500"
            }`} />
            Analytics
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
            <Settings className={`mr-3 h-5 w-5 ${
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
          <div className="mb-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                {activeView === "dashboard" && "Dashboard"}
                {activeView === "visitors" && "Visitors"}
                {activeView === "analytics" && "Analytics"}
                {activeView === "reports" && "Reports"}
                {activeView === "trash" && "Recycle Bin"}
                {activeView === "settings" && "Settings"}
              </h2>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
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

              {/* Visitor List Tabs */}
              <div className="mt-8">
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

          {/* Analytics View */}
          {activeView === "analytics" && (
            <div className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium mb-4">Visitor Analytics</h3>
                  <p className="text-gray-500 mb-4">Analyze visitor traffic and patterns over time.</p>
                  
                  {/* Analytics Dashboard Component */}
                  <AnalyticsDashboard />
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
                        disabled={isLoadingDeletedVisitors || deletedVisitors.length === 0}
                        size="sm"
                      >
                        {selectedVisitors.length > 0 ? "Deselect All" : "Select All"}
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => {
                          if (selectedVisitors.length > 0 && window.confirm("Are you sure you want to restore all selected visitors?")) {
                            // Restore all selected visitors
                            setIsProcessingBulk(true);
                            Promise.all(
                              selectedVisitors.map(id => 
                                apiRequest("POST", `/api/admin/restore-visitor/${id}`)
                                  .then(res => res.json())
                              )
                            )
                            .then(() => {
                              toast({
                                title: "Success",
                                description: `${selectedVisitors.length} visitor(s) restored successfully`,
                              });
                              setSelectedVisitors([]);
                              
                              // Invalidate all relevant queries to refresh data everywhere
                              queryClient.invalidateQueries({ queryKey: ["/api/admin/trash"] });
                              queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
                              queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
                              queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
                              
                              // If we're in the recycle bin, automatically switch to the visitors view
                              // to show the restored visitors
                              if (activeView === "trash" && deletedVisitors.length <= selectedVisitors.length) {
                                setActiveView("visitors");
                              }
                            })
                            .catch(error => {
                              toast({
                                title: "Error",
                                description: `Failed to restore visitors: ${error.message}`,
                                variant: "destructive",
                              });
                            })
                            .finally(() => setIsProcessingBulk(false));
                          }
                        }}
                        disabled={isProcessingBulk || selectedVisitors.length === 0}
                        size="sm"
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Restore Selected
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          if (selectedVisitors.length > 0) {
                            if (window.confirm(`Are you sure you want to permanently delete ${selectedVisitors.length} selected visitor(s)? This action cannot be undone.`)) {
                              setIsProcessingBulk(true);
                              Promise.all(
                                selectedVisitors.map(id => 
                                  apiRequest("DELETE", `/api/admin/permanently-delete/${id}`)
                                    .then(res => res.json())
                                )
                              )
                              .then(() => {
                                toast({
                                  title: "Success",
                                  description: `${selectedVisitors.length} visitor(s) permanently deleted`,
                                });
                                setSelectedVisitors([]);
                                refetchTrash();
                              })
                              .catch(error => {
                                toast({
                                  title: "Error",
                                  description: `Failed to delete visitors: ${error.message}`,
                                  variant: "destructive",
                                });
                              })
                              .finally(() => setIsProcessingBulk(false));
                            }
                          } else if (deletedVisitors.length > 0) {
                            if (window.confirm("Are you sure you want to permanently delete ALL items in the recycle bin? This action cannot be undone.")) {
                              emptyBinMutation.mutate();
                            }
                          }
                        }}
                        disabled={isProcessingBulk || (selectedVisitors.length === 0 && deletedVisitors.length === 0)}
                        size="sm"
                      >
                        <Trash className="mr-1 h-3 w-3" />
                        {selectedVisitors.length > 0 
                          ? `Delete Selected (${selectedVisitors.length})` 
                          : "Empty Bin"}
                      </Button>
                    </div>
                  </div>
                  
                  {isLoadingDeletedVisitors ? (
                    <div className="flex justify-center p-8">
                      <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : deletedVisitors.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Trash2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Recycle bin is empty</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                    checked={paginatedDeletedVisitors.length > 0 && selectedVisitors.length === paginatedDeletedVisitors.length}
                                    onChange={() => {
                                      if (selectedVisitors.length === paginatedDeletedVisitors.length) {
                                        setSelectedVisitors([]);
                                      } else {
                                        setSelectedVisitors(paginatedDeletedVisitors.map(visitor => visitor.id));
                                      }
                                    }}
                                  />
                                </div>
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Phone
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedDeletedVisitors.map((visitor) => (
                              <tr key={visitor.id} className={selectedVisitors.includes(visitor.id) ? "bg-primary-50" : ""}>
                                <td className="px-3 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                      checked={selectedVisitors.includes(visitor.id)}
                                      onChange={() => {
                                        if (selectedVisitors.includes(visitor.id)) {
                                          setSelectedVisitors(selectedVisitors.filter(id => id !== visitor.id));
                                        } else {
                                          setSelectedVisitors([...selectedVisitors, visitor.id]);
                                        }
                                      }}
                                    />
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{visitor.fullName}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-500">{visitor.email || "N/A"}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-500">{visitor.phoneNumber}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <Button 
                                    onClick={() => restoreVisitorMutation.mutate(visitor.id)}
                                    disabled={restoreVisitorMutation.isPending || isProcessingBulk}
                                    size="sm"
                                    variant="outline"
                                  >
                                    <RefreshCw className="mr-1 h-3 w-3" />
                                    Restore
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Pagination */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-700">
                            Showing <span className="font-medium">{Math.min(deletedVisitors.length, (trashPage - 1) * trashItemsPerPage + 1)}</span> to{" "}
                            <span className="font-medium">{Math.min(deletedVisitors.length, trashPage * trashItemsPerPage)}</span> of{" "}
                            <span className="font-medium">{deletedVisitors.length}</span> results
                          </span>
                          
                          <select
                            className="ml-4 text-sm text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            value={trashItemsPerPage}
                            onChange={(e) => {
                              setTrashItemsPerPage(Number(e.target.value));
                              setTrashPage(1); // Reset to first page when changing items per page
                            }}
                          >
                            {[10, 20, 30, 50, 100].map((value) => (
                              <option key={value} value={value}>
                                {value} per page
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTrashPage(p => Math.max(1, p - 1))}
                            disabled={trashPage === 1}
                          >
                            Previous
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTrashPage(p => Math.min(Math.ceil(deletedVisitors.length / trashItemsPerPage), p + 1))}
                            disabled={trashPage >= Math.ceil(deletedVisitors.length / trashItemsPerPage)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings View */}
          {activeView === "settings" && (
            <div className="mt-6 grid grid-cols-1 gap-6">
              {/* Application Settings Section */}
              <AdminSettings />
              
              {/* Account Settings Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>
                    Manage your administrator account and create new administrators.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-md font-medium mb-2">Account Information</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" 
                            value={user?.username || ''}
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-md font-medium mb-2">Change Password</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                          <input 
                            type="password" 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" 
                            placeholder="Enter current password"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                          <input 
                            type="password" 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" 
                            placeholder="Enter new password"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button>Update Password</Button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-md font-medium mb-2">Create New Administrator</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" 
                            placeholder="Enter username"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                          <input 
                            type="password" 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" 
                            placeholder="Enter password"
                          />
                        </div>
                      </div>
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
  );
}
