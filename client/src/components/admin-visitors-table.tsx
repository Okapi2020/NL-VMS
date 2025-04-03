import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatTimeOnly, formatDuration, formatBadgeId } from "@/lib/utils";
import { Visit, Visitor } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Search, UserRound, Clock, CalendarClock, ChevronDown, ChevronUp, Tag, Phone, ShieldCheck } from "lucide-react";

type AdminVisitorsTableProps = {
  visits: { visit: Visit; visitor: Visitor }[];
  isLoading: boolean;
};

export function AdminVisitorsTable({ visits, isLoading }: AdminVisitorsTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"name" | "checkIn" | "duration">("checkIn");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const checkOutMutation = useMutation({
    mutationFn: async (visitId: number) => {
      const res = await apiRequest("POST", "/api/admin/check-out-visitor", { visitId });
      return await res.json();
    },
    onMutate: (visitId) => {
      setProcessingIds(prev => new Set(prev).add(visitId));
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Visitor checked out successfully",
      });
      // Refresh both current visitors and visit history
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to check out visitor: " + error.message,
        variant: "destructive",
      });
    },
    onSettled: (_, __, visitId) => {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(visitId);
        return newSet;
      });
    }
  });

  const handleCheckOut = (visitId: number) => {
    if (confirm("Are you sure you want to check out this visitor?")) {
      checkOutMutation.mutate(visitId);
    }
  };

  // Calculate visit duration
  const calculateDuration = (checkInTime: Date | string): string => {
    const startTime = new Date(checkInTime).getTime();
    const currentTime = new Date().getTime();
    const durationMs = currentTime - startTime;
    
    // Convert to minutes
    const minutes = Math.floor(durationMs / (1000 * 60));
    
    return `${minutes} min`;
  };

  // Handle sort change
  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  };

  const handleSortChange = (field: "name" | "checkIn" | "duration") => {
    if (field === sortField) {
      toggleSortDirection();
    } else {
      setSortField(field);
      setSortDirection("desc"); // Default to descending for new sort field
    }
  };

  if (isLoading) {
    return <div className="py-4 text-center">Loading current visitors...</div>;
  }

  if (visits.length === 0) {
    return <div className="py-4 text-center">No visitors currently checked in.</div>;
  }

  // Filter visits based on search term
  const filteredVisits = visits.filter(({ visitor }) => {
    if (!searchTerm) return true;
    
    // Generate badge ID for searching
    const badgeId = formatBadgeId(visitor.id).toLowerCase();
    
    return (
      visitor.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (visitor.email && visitor.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      visitor.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      badgeId.includes(searchTerm.toLowerCase())
    );
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
      case "duration":
        const aDuration = new Date().getTime() - new Date(a.visit.checkInTime).getTime();
        const bDuration = new Date().getTime() - new Date(b.visit.checkInTime).getTime();
        comparison = aDuration - bDuration;
        break;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });

  return (
    <div>
      {/* Search bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by name, badge, phone, email..."
            className="w-full pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500 mb-2">
        Showing {sortedVisits.length} of {visits.length} active visitors
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
                  <CalendarClock className="mr-1 h-4 w-4" />
                  Check-in
                  {sortField === "checkIn" && (
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
              <TableHead className="text-right">Actions</TableHead>
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
                  <TableCell>{formatTimeOnly(visit.checkInTime)}</TableCell>
                  <TableCell className="text-center">
                    {visitor.id % 2 === 0 ? ( // Just a simple pattern for demo, replace with actual verification logic
                      <ShieldCheck className="h-5 w-5 text-green-500 mx-auto" />
                    ) : (
                      <span className="text-xs text-gray-500">Not verified</span>
                    )}
                  </TableCell>
                  <TableCell>{calculateDuration(visit.checkInTime)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      className="text-primary-600 hover:text-primary-900"
                      onClick={() => handleCheckOut(visit.id)}
                      disabled={processingIds.has(visit.id)}
                    >
                      {processingIds.has(visit.id) ? "Processing..." : "Check out"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4 text-gray-500">
                  No visitors match your search criteria
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
