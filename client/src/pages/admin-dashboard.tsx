import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminVisitorsTable } from "@/components/admin-visitors-table";
import { AdminVisitHistory } from "@/components/admin-visit-history";
import { exportToCSV } from "@/lib/utils";
import {
  UsersRound,
  UserRound,
  Clock,
  ClipboardList,
  LayoutDashboard,
  Settings,
  LogOut,
  Download,
} from "lucide-react";

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("current");

  // Get current visitors
  const {
    data: currentVisitors = [],
    isLoading: isLoadingCurrentVisitors,
  } = useQuery({
    queryKey: ["/api/admin/current-visitors"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get visit history
  const {
    data: visitHistory = [],
    isLoading: isLoadingVisitHistory,
  } = useQuery({
    queryKey: ["/api/admin/visit-history"],
  });

  // Get dashboard stats
  const {
    data: stats = { totalVisitorsToday: 0, currentlyCheckedIn: 0, averageVisitDuration: 0 },
    isLoading: isLoadingStats,
  } = useQuery({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 60000, // Refresh every minute
  });

  const handleExportData = () => {
    // Export visit history data
    const dataToExport = visitHistory.map(({ visit, visitor }) => ({
      VisitorName: visitor.fullName,
      Email: visitor.email || "",
      Phone: visitor.phoneNumber,
      Company: visitor.company || "",
      Host: visit.host,
      Purpose: visit.purpose === "other" ? visit.otherPurpose : visit.purpose,
      CheckInTime: new Date(visit.checkInTime).toLocaleString(),
      CheckOutTime: visit.checkOutTime ? new Date(visit.checkOutTime).toLocaleString() : "N/A",
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
            className="group flex items-center px-2 py-2 text-sm font-medium rounded-md bg-primary-50 text-primary-700"
          >
            <LayoutDashboard className="mr-3 h-5 w-5 text-primary-500" />
            Dashboard
          </a>
          <a
            href="#"
            className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          >
            <UserRound className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
            Visitors
          </a>
          <a
            href="#"
            className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          >
            <ClipboardList className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
            Reports
          </a>
          <a
            href="#"
            className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          >
            <Settings className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
            Settings
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
        </nav>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-auto">
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Dashboard
              </h2>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <Button
                onClick={handleExportData}
                className="ml-3 inline-flex items-center"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </Button>
            </div>
          </div>

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
        </div>
      </div>
    </div>
  );
}
