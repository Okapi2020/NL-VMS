import { useState, useEffect } from "react";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
  ShieldCheck,
  Pencil,
  Trash2,
  ArchiveRestore
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Checkbox } from "@/components/ui/checkbox"; 
import { DateRange } from "react-day-picker";

type AdminVisitHistoryProps = {
  visitHistory: { visit: Visit; visitor: Visitor }[];
  isLoading: boolean;
};

export function AdminVisitHistory({ visitHistory, isLoading }: AdminVisitHistoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingVerificationIds, setProcessingVerificationIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<"name" | "checkIn" | "checkOut" | "duration">("checkIn");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [showDeletedVisitors, setShowDeletedVisitors] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Bulk selection
  const [selectedVisitors, setSelectedVisitors] = useState<number[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  
  // Form schema for editing visitor
  const editVisitorSchema = z.object({
    id: z.number(),
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    yearOfBirth: z.number().min(1900, "Year of birth must be after 1900").max(new Date().getFullYear(), "Year of birth cannot be in the future"),
    email: z.string().email("Invalid email format").nullable().optional(),
    phoneNumber: z.string().min(7, "Phone number must be at least 7 characters"),
  });

  type EditVisitorFormValues = z.infer<typeof editVisitorSchema>;
  
  // Edit form
  const form = useForm<EditVisitorFormValues>({
    resolver: zodResolver(editVisitorSchema),
    defaultValues: selectedVisitor ? {
      id: selectedVisitor.id,
      fullName: selectedVisitor.fullName,
      yearOfBirth: selectedVisitor.yearOfBirth,
      email: selectedVisitor.email,
      phoneNumber: selectedVisitor.phoneNumber
    } : undefined
  });
  
  // Update form values when selectedVisitor changes
  useEffect(() => {
    if (selectedVisitor) {
      form.reset({
        id: selectedVisitor.id,
        fullName: selectedVisitor.fullName,
        yearOfBirth: selectedVisitor.yearOfBirth,
        email: selectedVisitor.email,
        phoneNumber: selectedVisitor.phoneNumber
      });
    }
  }, [selectedVisitor, form]);
  
  // Edit visitor mutation
  const editVisitorMutation = useMutation({
    mutationFn: async (visitorData: EditVisitorFormValues) => {
      const res = await apiRequest("PUT", "/api/admin/update-visitor", visitorData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Visitor information updated successfully",
      });
      // Close the dialog
      setIsEditDialogOpen(false);
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update visitor: " + error.message,
        variant: "destructive",
      });
    }
  });
  
  // Delete visitor mutation
  const deleteVisitorMutation = useMutation({
    mutationFn: async (visitorId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/delete-visitor/${visitorId}`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Visitor deleted successfully",
      });
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete visitor: " + error.message,
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
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Visitor restored successfully",
      });
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trash"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to restore visitor: " + error.message,
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (data: EditVisitorFormValues) => {
    editVisitorMutation.mutate(data);
  };
  
  const verifyVisitorMutation = useMutation({
    mutationFn: async ({ visitorId, verified }: { visitorId: number, verified: boolean }) => {
      const res = await apiRequest("POST", "/api/admin/verify-visitor", { visitorId, verified });
      return await res.json();
    },
    onMutate: ({ visitorId }) => {
      setProcessingVerificationIds(prev => new Set(prev).add(visitorId));
    },
    onSuccess: (_, { verified }) => {
      toast({
        title: "Success",
        description: `Visitor ${verified ? "verified" : "unverified"} successfully`,
      });
      // Refresh both current visitors and visit history
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update verification status: " + error.message,
        variant: "destructive",
      });
    },
    onSettled: (_, __, { visitorId }) => {
      setProcessingVerificationIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(visitorId);
        return newSet;
      });
    }
  });

  const handleVerifyToggle = (visitorId: number, currentStatus: boolean) => {
    verifyVisitorMutation.mutate({ 
      visitorId, 
      verified: !currentStatus 
    });
  };

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
    
    // Check deleted status
    const matchesDeletedStatus = showDeletedVisitors ? visitor.deleted : !visitor.deleted;
    
    return matchesSearch && matchesStatus && matchesDateRange && matchesDeletedStatus;
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
  
  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
    setSelectedVisitors([]);
  }, [searchTerm, filterStatus, dateRange, showDeletedVisitors]);
  
  // Calculate paginated data
  const totalPages = Math.ceil(sortedVisits.length / itemsPerPage);
  const paginatedVisits = sortedVisits.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

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
          
          <Button
            variant={showDeletedVisitors ? "default" : "outline"}
            onClick={async () => {
              // If we're already showing deleted visitors, just toggle back
              if (showDeletedVisitors) {
                setShowDeletedVisitors(false);
                return;
              }
              
              // If we're about to show deleted visitors, check if there are any first
              try {
                const res = await apiRequest("GET", "/api/admin/trash");
                const deletedVisitors = await res.json();
                
                if (deletedVisitors.length === 0) {
                  toast({
                    title: "Information",
                    description: "The trash bin is empty.",
                  });
                } else {
                  setShowDeletedVisitors(true);
                }
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to check trash bin status",
                  variant: "destructive",
                });
              }
            }}
            className={showDeletedVisitors ? "bg-amber-600 hover:bg-amber-700" : ""}
          >
            <ArchiveRestore className="mr-2 h-4 w-4" />
            {showDeletedVisitors ? "Showing Trash Bin" : "Show Trash Bin"}
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

      {/* Action buttons and pagination controls */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (paginatedVisits.length > 0) {
                if (selectedVisitors.length === paginatedVisits.length) {
                  setSelectedVisitors([]);
                } else {
                  setSelectedVisitors(paginatedVisits.map(item => item.visitor.id));
                }
              }
            }}
          >
            {selectedVisitors.length > 0 && selectedVisitors.length === paginatedVisits.length ? "Deselect All" : "Select All"}
          </Button>
          
          {!showDeletedVisitors && (
            <Button
              variant="outline"
              size="sm"
              color="danger"
              disabled={isProcessingBulk || selectedVisitors.length === 0}
              onClick={() => {
                if (selectedVisitors.length > 0 && window.confirm(`Are you sure you want to delete ${selectedVisitors.length} selected visitor(s)? This will move them to the trash bin.`)) {
                  setIsProcessingBulk(true);
                  Promise.all(
                    selectedVisitors.map(id => 
                      apiRequest("DELETE", `/api/admin/delete-visitor/${id}`)
                        .then(res => res.json())
                    )
                  )
                    .then(() => {
                      toast({
                        title: "Success",
                        description: `${selectedVisitors.length} visitor(s) deleted successfully`,
                      });
                      setSelectedVisitors([]);
                      // Refresh data
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/trash"] });
                    })
                    .catch(error => {
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
            >
              {isProcessingBulk ? 'Processing...' : `Delete Selected (${selectedVisitors.length})`}
            </Button>
          )}
          
          {showDeletedVisitors && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-green-600 border-green-600 hover:bg-green-50"
                disabled={isProcessingBulk || selectedVisitors.length === 0}
                onClick={() => {
                  if (selectedVisitors.length > 0 && window.confirm("Are you sure you want to restore all selected visitors?")) {
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
                        // Refresh data
                        queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/admin/trash"] });
                      })
                      .catch(error => {
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
              >
                {isProcessingBulk ? 'Processing...' : `Restore Selected (${selectedVisitors.length})`}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={isProcessingBulk || (selectedVisitors.length === 0 && sortedVisits.length === 0)}
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
                          // Refresh data
                          queryClient.invalidateQueries({ queryKey: ["/api/admin/trash"] });
                        })
                        .catch(error => {
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
                  } else if (sortedVisits.length > 0) {
                    // Empty bin functionality
                    if (window.confirm("Are you sure you want to permanently delete ALL items in the trash bin? This action cannot be undone.")) {
                      setIsProcessingBulk(true);
                      apiRequest("DELETE", "/api/admin/empty-bin")
                        .then(res => res.json())
                        .then(() => {
                          toast({
                            title: "Success",
                            description: "Trash bin emptied successfully",
                          });
                          // Refresh data
                          queryClient.invalidateQueries({ queryKey: ["/api/admin/trash"] });
                        })
                        .catch(error => {
                          toast({
                            title: "Error",
                            description: `Failed to empty trash bin: ${error.message}`,
                            variant: "destructive",
                          });
                        })
                        .finally(() => {
                          setIsProcessingBulk(false);
                        });
                    }
                  }
                }}
              >
                {isProcessingBulk ? 'Processing...' : selectedVisitors.length > 0 
                  ? `Delete Selected (${selectedVisitors.length})` 
                  : "Empty Bin"}
              </Button>
            </>
          )}
        </div>
        
        {/* Pagination */}
        <div className="flex items-center gap-2">
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(parseInt(value));
              setPage(1); // Reset to first page when changing items per page
            }}
          >
            <SelectTrigger className="h-9 w-[100px]">
              <SelectValue placeholder="10 per page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="20">20 per page</SelectItem>
              <SelectItem value="30">30 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="h-9 w-9 rounded-r-none"
            >
              &lt;
            </Button>
            <div className="border-y px-3 flex items-center text-sm">
              <span className="text-gray-500">Page {page} of {Math.max(1, totalPages)}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="h-9 w-9 rounded-l-none"
            >
              &gt;
            </Button>
          </div>
        </div>
      </div>
      
      {/* Results count */}
      <div className="text-sm text-gray-500 mb-2">
        Showing {paginatedVisits.length} of {sortedVisits.length} visits
        {showDeletedVisitors && " (Trash Bin)"}
        {selectedVisitors.length > 0 && ` • ${selectedVisitors.length} selected`}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={paginatedVisits.length > 0 && selectedVisitors.length === paginatedVisits.length}
                  onCheckedChange={(checked: boolean) => {
                    if (selectedVisitors.length === paginatedVisits.length) {
                      setSelectedVisitors([]);
                    } else {
                      setSelectedVisitors(paginatedVisits.map(item => item.visitor.id));
                    }
                  }}
                  aria-label="Select all"
                />
              </TableHead>
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedVisits.length > 0 ? (
              paginatedVisits.map(({ visitor, visit }) => (
                <TableRow 
                  key={visit.id} 
                  className={`${visitor.deleted ? "bg-gray-50" : ""} ${selectedVisitors.includes(visitor.id) ? "bg-primary-50" : ""}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedVisitors.includes(visitor.id)}
                      onCheckedChange={(checked: boolean) => {
                        if (checked) {
                          setSelectedVisitors([...selectedVisitors, visitor.id]);
                        } else {
                          setSelectedVisitors(selectedVisitors.filter(id => id !== visitor.id));
                        }
                      }}
                      aria-label={`Select ${visitor.fullName}`}
                    />
                  </TableCell>
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
                    <Button
                      variant="ghost"
                      className={`p-1 rounded-full ${visitor.verified ? "bg-green-50" : "bg-gray-50"}`}
                      onClick={() => handleVerifyToggle(visitor.id, visitor.verified)}
                      disabled={processingVerificationIds.has(visitor.id) || visitor.deleted}
                    >
                      {processingVerificationIds.has(visitor.id) ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : visitor.verified ? (
                        <ShieldCheck className="h-5 w-5 text-green-500" />
                      ) : (
                        <ShieldCheck className="h-5 w-5 text-gray-300" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    {visit.checkOutTime ? (
                      formatDuration(visit.checkInTime, visit.checkOutTime)
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end space-x-2 items-center">
                      {visitor.deleted ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600"
                          onClick={() => {
                            if (confirm(`Are you sure you want to restore ${visitor.fullName}?`)) {
                              restoreVisitorMutation.mutate(visitor.id);
                            }
                          }}
                          title="Restore visitor"
                        >
                          <ArchiveRestore className="h-4 w-4" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600"
                            onClick={() => {
                              setSelectedVisitor(visitor);
                              setIsEditDialogOpen(true);
                            }}
                            title="Edit visitor"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${visitor.fullName}? This will move the visitor to the trash bin.`)) {
                                deleteVisitorMutation.mutate(visitor.id);
                              }
                            }}
                            title="Delete visitor"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-4 text-gray-500">
                  {showDeletedVisitors 
                    ? "Trash bin is empty" 
                    : "No visits match your search or filters"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Visitor Information</DialogTitle>
            <DialogDescription>
              Update the visitor's information. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Full Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="yearOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year of Birth</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Year of Birth" 
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value ? parseInt(e.target.value) : "";
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="Email" 
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          field.onChange(e.target.value || null);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="sm:justify-between mt-6">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={editVisitorMutation.isPending || !form.formState.isDirty}
                >
                  {editVisitorMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                      Saving...
                    </>
                  ) : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}