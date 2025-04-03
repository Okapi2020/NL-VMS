import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatTimeOnly, formatDuration, formatBadgeId } from "@/lib/utils";
import { Visit, Visitor } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Calendar,
  UserRound,
  Clock,
  XCircle,
  Tag,
  Phone,
  ShieldCheck
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

type AdminVisitHistoryProps = {
  visitHistory: { visit: Visit; visitor: Visitor }[];
  isLoading: boolean;
};

export function AdminVisitHistory({ visitHistory, isLoading }: AdminVisitHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<"name" | "checkIn" | "checkOut" | "duration">("checkIn");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  if (isLoading) {
    return <div className="py-4 text-center">Loading visit history...</div>;
  }

  if (visitHistory.length === 0) {
    return <div className="py-4 text-center">No visit history available.</div>;
  }

  // Filter visits based on search term, status, and date range
  const filteredVisits = visitHistory.filter(({ visitor, visit }) => {
    // Generate badge ID for searching
    const badgeId = formatBadgeId(visitor.id).toLowerCase();
    
    const matchesSearch = 
      visitor.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (visitor.email && visitor.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      visitor.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      badgeId.includes(searchTerm.toLowerCase()) ||
      formatDate(visit.checkInTime).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === "all" ||
      (filterStatus === "active" && visit.active) ||
      (filterStatus === "completed" && !visit.active);
    
    // Check if visit date is within selected date range
    let matchesDateRange = true;
    if (dateRange && dateRange.from) {
      const visitDate = new Date(visit.checkInTime);
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        matchesDateRange = visitDate >= fromDate && visitDate <= toDate;
      } else {
        // If only from date is selected, match the exact day
        const nextDay = new Date(fromDate);
        nextDay.setDate(nextDay.getDate() + 1);
        matchesDateRange = visitDate >= fromDate && visitDate < nextDay;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDateRange;
  });

  // Sort the filtered visits
  const sortedVisits = [...filteredVisits].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case "name":
        comparison = a.visitor.fullName.localeCompare(b.visitor.fullName);
        break;
      case "checkIn":
        comparison = new Date(a.visit.checkInTime).getTime() - new Date(b.visit.checkInTime).getTime();
        break;
      case "checkOut":
        // Handle case when one or both checkOut times are null
        if (!a.visit.checkOutTime && !b.visit.checkOutTime) comparison = 0;
        else if (!a.visit.checkOutTime) comparison = 1;
        else if (!b.visit.checkOutTime) comparison = -1;
        else comparison = new Date(a.visit.checkOutTime).getTime() - new Date(b.visit.checkOutTime).getTime();
        break;
      case "duration":
        // Calculate durations for comparison
        const aDuration = a.visit.checkOutTime 
          ? new Date(a.visit.checkOutTime).getTime() - new Date(a.visit.checkInTime).getTime() 
          : 0;
        const bDuration = b.visit.checkOutTime 
          ? new Date(b.visit.checkOutTime).getTime() - new Date(b.visit.checkInTime).getTime() 
          : 0;
        comparison = aDuration - bDuration;
        break;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  };

  const handleSortChange = (field: "name" | "checkIn" | "checkOut" | "duration") => {
    if (field === sortField) {
      toggleSortDirection();
    } else {
      setSortField(field);
      setSortDirection("desc"); // Default to descending for new sort field
    }
  };

  return (
    <div>
      {/* Search and filter controls */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by name, badge, phone, email, date..."
              className="w-full pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline" 
            type="button" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="grid gap-4 p-4 border rounded-md shadow-sm">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium block">Status</label>
                <Select value={filterStatus} onValueChange={(value: "all" | "active" | "completed") => setFilterStatus(value)}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium block">Sort By</label>
                <Select value={sortField} onValueChange={(value: "name" | "checkIn" | "checkOut" | "duration") => handleSortChange(value)}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Visitor Name</SelectItem>
                    <SelectItem value="checkIn">Check-in Time</SelectItem>
                    <SelectItem value="checkOut">Check-out Time</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium block">Direction</label>
                <Button 
                  variant="outline" 
                  onClick={toggleSortDirection}
                  className="w-36 justify-between"
                >
                  {sortDirection === "asc" ? "Ascending" : "Descending"}
                  {sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium block">Date Range</label>
                {dateRange && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 text-xs" 
                    onClick={() => setDateRange(undefined)}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              <DateRangePicker 
                value={dateRange} 
                onChange={setDateRange} 
              />
            </div>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500 mb-2">
        Showing {sortedVisits.length} of {visitHistory.length} visits
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer" 
                onClick={() => handleSortChange("name")}
              >
                <div className="flex items-center">
                  <UserRound className="mr-1 h-4 w-4" />
                  Name
                  {sortField === "name" && (
                    sortDirection === "asc" ? 
                    <ChevronUp className="ml-1 h-4 w-4" /> : 
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>
                <div className="flex items-center">
                  <Phone className="mr-1 h-4 w-4" />
                  Phone
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center">
                  <Tag className="mr-1 h-4 w-4" />
                  Badge ID
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer" 
                onClick={() => handleSortChange("checkIn")}
              >
                <div className="flex items-center">
                  <Calendar className="mr-1 h-4 w-4" />
                  Check-in
                  {sortField === "checkIn" && (
                    sortDirection === "asc" ? 
                    <ChevronUp className="ml-1 h-4 w-4" /> : 
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer" 
                onClick={() => handleSortChange("checkOut")}
              >
                <div className="flex items-center">
                  <Calendar className="mr-1 h-4 w-4" />
                  Check-out
                  {sortField === "checkOut" && (
                    sortDirection === "asc" ? 
                    <ChevronUp className="ml-1 h-4 w-4" /> : 
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center">
                  <ShieldCheck className="mr-1 h-4 w-4" />
                  Verified Badge
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer" 
                onClick={() => handleSortChange("duration")}
              >
                <div className="flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  Duration
                  {sortField === "duration" && (
                    sortDirection === "asc" ? 
                    <ChevronUp className="ml-1 h-4 w-4" /> : 
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedVisits.length > 0 ? (
              sortedVisits.map(({ visitor, visit }) => (
                <TableRow key={visit.id}>
                  <TableCell>
                    <div className="font-medium">{visitor.fullName}</div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{visitor.email || "No email provided"}</TableCell>
                  <TableCell className="text-sm">{visitor.phoneNumber}</TableCell>
                  <TableCell className="font-mono text-xs text-blue-600 font-medium">{formatBadgeId(visitor.id)}</TableCell>
                  <TableCell>
                    <div className="text-sm">{formatTimeOnly(visit.checkInTime)}</div>
                    <div className="text-xs text-gray-500">
                      {formatDate(visit.checkInTime).split(',')[0]}
                    </div>
                  </TableCell>
                  <TableCell>
                    {visit.checkOutTime ? (
                      <>
                        <div className="text-sm">{formatTimeOnly(visit.checkOutTime)}</div>
                        <div className="text-xs text-gray-500">
                          {formatDate(visit.checkOutTime).split(',')[0]}
                        </div>
                      </>
                    ) : (
                      <span className="text-amber-600 font-medium">Active</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {visitor.id % 2 === 0 ? ( // Just a simple pattern for demo, replace with actual verification logic
                      <ShieldCheck className="h-5 w-5 text-green-500 mx-auto" />
                    ) : (
                      <span className="text-xs text-gray-500">Not verified</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {visit.checkOutTime ? (
                      formatDuration(visit.checkInTime, visit.checkOutTime)
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4 text-gray-500">
                  No visits match your search or filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
