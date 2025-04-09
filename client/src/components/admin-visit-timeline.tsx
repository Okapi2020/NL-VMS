import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatTimeOnly, formatDuration, formatBadgeId, formatYearWithAge, normalizeText, getInitials } from "@/lib/utils";
import { Visit, Visitor } from "@shared/schema";
import { useLanguage } from "@/hooks/use-language";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PhoneNumberLink } from "@/components/phone-number-link";
import { KINSHASA_MUNICIPALITIES } from "@/data/municipalities";
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
  CheckCircle,
  Pencil,
  Trash2,
  ArchiveRestore,
  Eye,
  Mail,
  MapPin
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Checkbox } from "@/components/ui/checkbox"; 
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DateRange } from "react-day-picker";
import { VisitorDetailModal } from "./visitor-detail-modal";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Define type for Timeline Entry
type TimelineEntry = {
  visitor: Visitor;
  visits: Visit[];
};

type AdminVisitTimelineProps = {
  visitHistory: { visit: Visit; visitor: Visitor }[];
  isLoading: boolean;
};

// Core component separated to be wrapped with error boundary
function AdminVisitTimelineComponent({ visitHistory, isLoading }: AdminVisitTimelineProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language, t } = useLanguage();
  const [processingVerificationIds, setProcessingVerificationIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<"name" | "lastVisit" | "visitCount" | "totalTime">("lastVisit");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showDeletedVisitors, setShowDeletedVisitors] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Form schema for editing visitor
  const editVisitorSchema = z.object({
    id: z.number(),
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    yearOfBirth: z.number().min(1900, "Year of birth must be after 1900").max(new Date().getFullYear(), "Year of birth cannot be in the future"),
    sex: z.enum(["Masculin", "Feminin"], {
      errorMap: () => ({ message: "Please select either Masculin or Feminin" }),
    }),
    municipality: z.string().min(1, "Municipality selection is required"),
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
      sex: selectedVisitor.sex as "Masculin" | "Feminin",
      municipality: selectedVisitor.municipality || "",
      email: selectedVisitor.email,
      phoneNumber: selectedVisitor.phoneNumber
    } : undefined
  });
  
  // Update form values when selectedVisitor changes
  useEffect(() => {
    if (selectedVisitor) {
      // Format phone number with leading zero if needed
      let formattedPhoneNumber = selectedVisitor.phoneNumber;
      if (formattedPhoneNumber && !formattedPhoneNumber.startsWith('0') && !formattedPhoneNumber.startsWith('+')) {
        formattedPhoneNumber = '0' + formattedPhoneNumber;
      }
      
      form.reset({
        id: selectedVisitor.id,
        fullName: selectedVisitor.fullName,
        yearOfBirth: selectedVisitor.yearOfBirth,
        sex: selectedVisitor.sex as "Masculin" | "Feminin",
        municipality: selectedVisitor.municipality || "",
        email: selectedVisitor.email,
        phoneNumber: formattedPhoneNumber
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
      
      // If we're in trash bin view, check if it's now empty
      const checkTrashStatus = async () => {
        // Only check if we're in trash bin view
        if (showDeletedVisitors) {
          try {
            const res = await apiRequest("GET", "/api/admin/trash");
            const remaining = await res.json();
            // If trash is empty, switch back to regular view
            if (Array.isArray(remaining) && remaining.length === 0) {
              setShowDeletedVisitors(false);
              setPage(1);
            }
          } catch (error) {
            console.error("Error checking trash status:", error);
          }
        }
      };
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visit-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trash"] });
      
      // Check trash status after data refreshes
      setTimeout(checkTrashStatus, 300);
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

  // Consolidate visits by visitor
  const consolidatedVisits: Record<number, TimelineEntry> = {};
  
  try {
    visitHistory.forEach(item => {
      if (!item || !item.visitor || !item.visit) {
        console.error("Invalid visit history item:", item);
        return; // Skip this item
      }
      
      const { visitor, visit } = item;
      
      if (!visitor.id) {
        console.error("Visitor missing ID:", visitor);
        return; // Skip this item
      }
      
      if (!consolidatedVisits[visitor.id]) {
        consolidatedVisits[visitor.id] = {
          visitor,
          visits: [visit]
        };
      } else {
        consolidatedVisits[visitor.id].visits.push(visit);
      }
    });
  } catch (error) {
    console.error("Error processing visit history:", error);
    return <div className="py-4 text-center text-red-500">Error processing visit history. Please refresh and try again.</div>;
  }
  
  // Convert to array for filtering and sorting
  const visitorTimeline = Object.values(consolidatedVisits);
  
  // Filter timeline entries based on search term, status, and date range
  const filteredTimeline = visitorTimeline.filter(item => {
    try {
      // Ensure item and its properties exist - defensive programming
      if (!item || !item.visitor || !item.visits || item.visits.length === 0) {
        return false;
      }
      
      const { visitor, visits } = item;
      
      // Check if any visit matches the active/completed filter
      const hasActiveVisit = visits.some(v => v.active);
      const matchesStatus = 
        filterStatus === "all" ||
        (filterStatus === "active" && hasActiveVisit) ||
        (filterStatus === "completed" && !hasActiveVisit);
      
      // Generate badge ID for searching
      const badgeId = formatBadgeId(visitor.id).toLowerCase();
      const normalizedSearchTerm = normalizeText(searchTerm);
      
      const matchesSearch = searchTerm === '' || 
        normalizeText(visitor.fullName).includes(normalizedSearchTerm) ||
        (visitor.email && normalizeText(visitor.email).includes(normalizedSearchTerm)) ||
        normalizeText(visitor.phoneNumber).includes(normalizedSearchTerm) ||
        badgeId.includes(normalizedSearchTerm) ||
        visits.some(v => normalizeText(formatDate(v.checkInTime, language)).includes(normalizedSearchTerm));
      
      // Check if any visit date is within selected date range
      let matchesDateRange = true;
      if (dateRange && dateRange.from) {
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          matchesDateRange = visits.some(v => {
            const visitDate = new Date(v.checkInTime);
            return visitDate >= fromDate && visitDate <= toDate;
          });
        } else {
          // If only from date is selected, match the exact day
          const nextDay = new Date(fromDate);
          nextDay.setDate(nextDay.getDate() + 1);
          matchesDateRange = visits.some(v => {
            const visitDate = new Date(v.checkInTime);
            return visitDate >= fromDate && visitDate < nextDay;
          });
        }
      }
      
      // Check deleted status
      const matchesDeletedStatus = showDeletedVisitors ? visitor.deleted : !visitor.deleted;
      
      return matchesSearch && matchesStatus && matchesDateRange && matchesDeletedStatus;
    } catch (error) {
      console.error("Error during filtering:", error);
      return false;
    }
  });

  // Sort the filtered timeline
  const sortedTimeline = [...filteredTimeline].sort((a, b) => {
    // Add defensive checks to prevent errors with null/undefined values
    if (!a || !b || !a.visitor || !b.visitor || !a.visits || !b.visits || a.visits.length === 0 || b.visits.length === 0) {
      return 0;
    }

    let comparison = 0;
    
    try {
      switch (sortField) {
        case "name":
          comparison = a.visitor.fullName.localeCompare(b.visitor.fullName);
          break;
        case "lastVisit":
          // Get the most recent visit for each visitor
          const aLastVisit = new Date(Math.max(...a.visits.map(v => new Date(v.checkInTime).getTime())));
          const bLastVisit = new Date(Math.max(...b.visits.map(v => new Date(v.checkInTime).getTime())));
          comparison = aLastVisit.getTime() - bLastVisit.getTime();
          break;
        case "visitCount":
          comparison = a.visits.length - b.visits.length;
          break;
        case "totalTime":
          // Calculate total time spent across all visits
          const aTotalTime = a.visits.reduce((total, visit) => {
            if (visit.checkOutTime) {
              return total + (new Date(visit.checkOutTime).getTime() - new Date(visit.checkInTime).getTime());
            }
            return total;
          }, 0);
          
          const bTotalTime = b.visits.reduce((total, visit) => {
            if (visit.checkOutTime) {
              return total + (new Date(visit.checkOutTime).getTime() - new Date(visit.checkInTime).getTime());
            }
            return total;
          }, 0);
          
          comparison = aTotalTime - bTotalTime;
          break;
      }
    } catch (error) {
      console.error("Error during sorting:", error);
      return 0;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });
  
  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterStatus, dateRange, showDeletedVisitors]);
  
  // Calculate paginated data
  const totalPages = Math.ceil(sortedTimeline.length / itemsPerPage);
  const paginatedTimeline = sortedTimeline.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  };

  const handleSortChange = (field: "name" | "lastVisit" | "visitCount" | "totalTime") => {
    if (field === sortField) {
      toggleSortDirection();
    } else {
      setSortField(field);
      setSortDirection("desc"); // Default to descending for new sort field
    }
  };

  const handleDetailsClick = (visitor: Visitor) => {
    setSelectedVisitor(visitor);
    setIsDetailModalOpen(true);
  };

  const handleEditClick = (visitor: Visitor) => {
    setSelectedVisitor(visitor);
    setIsEditDialogOpen(true);
  };

  const handleDeleteVisitor = (visitorId: number) => {
    if (window.confirm(t("confirmVisitorDelete"))) {
      deleteVisitorMutation.mutate(visitorId);
    }
  };

  const handleRestoreVisitor = (visitorId: number) => {
    restoreVisitorMutation.mutate(visitorId);
  };

  // Calculate last visit date and total time spent for a visitor
  const getLastVisitDate = (visits: Visit[]) => {
    if (!visits || visits.length === 0) return new Date(0);
    return new Date(Math.max(...visits.map(v => new Date(v.checkInTime).getTime())));
  };

  const getTotalVisitDuration = (visits: Visit[]) => {
    if (!visits || visits.length === 0) return 0;
    return visits.reduce((total, visit) => {
      if (visit.checkOutTime) {
        return total + (new Date(visit.checkOutTime).getTime() - new Date(visit.checkInTime).getTime());
      }
      return total;
    }, 0);
  };

  // Calculate if visitor has any active visits
  const hasActiveVisit = (visits: Visit[]) => {
    return visits.some(visit => visit.active);
  };

  return (
    <div>
      {/* Search and filter controls */}
      <div className="mb-4 space-y-2 px-4 pt-4">
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
            type="button"
            onClick={() => setShowDeletedVisitors(!showDeletedVisitors)}
            className={showDeletedVisitors ? "bg-red-600 hover:bg-red-700" : ""}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {showDeletedVisitors ? "Viewing Trash" : "Trash Bin"}
          </Button>
        </div>
        
        {/* Expanded Filters */}
        {showFilters && (
          <div className="bg-accent rounded-md p-3 mt-2 space-y-3">
            <div className="flex flex-wrap gap-3">
              <div className="min-w-[200px]">
                <p className="text-sm font-medium mb-1">Status</p>
                <Select
                  value={filterStatus}
                  onValueChange={(value: "all" | "active" | "completed") => setFilterStatus(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Visits</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="min-w-[200px]">
                <p className="text-sm font-medium mb-1">Sort By</p>
                <Select
                  value={sortField}
                  onValueChange={(value: "name" | "lastVisit" | "visitCount" | "totalTime") => handleSortChange(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Visitor Name</SelectItem>
                    <SelectItem value="lastVisit">Last Visit Date</SelectItem>
                    <SelectItem value="visitCount">Visit Count</SelectItem>
                    <SelectItem value="totalTime">Total Time Spent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="min-w-[220px]">
                <p className="text-sm font-medium mb-1">Date Range</p>
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  className="w-full"
                />
              </div>
              
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setFilterStatus("all");
                    setDateRange(undefined);
                    setSortField("lastVisit");
                    setSortDirection("desc");
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Results summary */}
        <div className="flex justify-between items-center pt-2 text-sm text-gray-500">
          <div>
            Showing {paginatedTimeline.length} of {sortedTimeline.length} visitors
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page > 1 ? page - 1 : 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span>
              Page {page} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
              disabled={page === totalPages || totalPages === 0}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Visitor Timeline Cards */}
      <div className="space-y-4 p-4">
        {paginatedTimeline.length === 0 ? (
          <div className="text-center py-8 bg-accent/30 rounded-lg">
            <p className="text-muted-foreground">
              {showDeletedVisitors 
                ? "Trash bin is empty" 
                : "No visitors match your search or filters"}
            </p>
          </div>
        ) : (
          paginatedTimeline.map(({ visitor, visits }) => {
            // Sort visits by check-in time, most recent first
            const sortedVisits = [...visits].sort((a, b) => 
              new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
            );
            
            const hasActive = hasActiveVisit(visits);
            const lastVisitDate = getLastVisitDate(visits);
            const totalTimeMs = getTotalVisitDuration(visits);
            
            return (
              <Card key={visitor.id} className={`overflow-hidden ${hasActive ? 'border-green-400 border-2' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 bg-primary/10">
                        <AvatarFallback className="text-primary font-medium">
                          {getInitials(visitor.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            {visitor.fullName}
                          </h3>
                          {visitor.verified && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Verified Visitor</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {visitor.deleted && (
                            <Badge variant="destructive">Deleted</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <UserRound className="h-3.5 w-3.5" />
                            {formatYearWithAge(visitor.yearOfBirth)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Tag className="h-3.5 w-3.5" />
                            {formatBadgeId(visitor.id)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => handleDetailsClick(visitor)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      {!visitor.deleted ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => handleEditClick(visitor)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteVisitor(visitor.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-green-600 hover:text-green-700"
                          onClick={() => handleRestoreVisitor(visitor.id)}
                        >
                          <ArchiveRestore className="h-4 w-4 mr-1" />
                          Restore
                        </Button>
                      )}
                      <Button 
                        variant={visitor.verified ? "default" : "outline"}
                        size="sm"
                        className={`h-8 ${visitor.verified ? "bg-green-600 hover:bg-green-700" : ""}`}
                        onClick={() => handleVerifyToggle(visitor.id, visitor.verified)}
                        disabled={processingVerificationIds.has(visitor.id)}
                      >
                        <ShieldCheck className="h-4 w-4 mr-1" />
                        {visitor.verified ? "Verified" : "Verify"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex flex-col gap-2">
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <PhoneNumberLink phoneNumber={visitor.phoneNumber} />
                      </div>
                      {visitor.email && (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <a href={`mailto:${visitor.email}`} className="text-blue-600 hover:underline">
                            {visitor.email}
                          </a>
                        </div>
                      )}
                      {visitor.municipality && (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {visitor.municipality}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="text-sm flex justify-between">
                        <span className="text-muted-foreground">Last Visit:</span>
                        <span className="font-medium">{formatDate(lastVisitDate.toISOString(), language)}</span>
                      </div>
                      <div className="text-sm flex justify-between">
                        <span className="text-muted-foreground">Total Visits:</span>
                        <span className="font-medium">{visits.length}</span>
                      </div>
                      <div className="text-sm flex justify-between">
                        <span className="text-muted-foreground">Total Time Spent:</span>
                        <span className="font-medium">{formatDuration(totalTimeMs, language)}</span>
                      </div>
                      {hasActive && (
                        <div className="text-sm mt-1">
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700">Currently Checked In</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Visit Timeline */}
                  <Accordion type="single" collapsible className="w-full border rounded-md">
                    <AccordionItem value="visits">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">Visit History ({visits.length})</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[120px]">Date</TableHead>
                              <TableHead>Check-In</TableHead>
                              <TableHead>Check-Out</TableHead>
                              <TableHead>Duration</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedVisits.map(visit => {
                              const checkInDate = new Date(visit.checkInTime);
                              const checkOutDate = visit.checkOutTime ? new Date(visit.checkOutTime) : null;
                              const duration = checkOutDate 
                                ? checkOutDate.getTime() - checkInDate.getTime() 
                                : 0;
                              
                              return (
                                <TableRow key={visit.id}>
                                  <TableCell>{formatDate(visit.checkInTime, language)}</TableCell>
                                  <TableCell>{formatTimeOnly(visit.checkInTime)}</TableCell>
                                  <TableCell>
                                    {visit.checkOutTime 
                                      ? formatTimeOnly(visit.checkOutTime)
                                      : '—'}
                                  </TableCell>
                                  <TableCell>
                                    {visit.checkOutTime 
                                      ? formatDuration(duration, language) 
                                      : visit.active ? 'Active' : '—'}
                                  </TableCell>
                                  <TableCell>
                                    {visit.active 
                                      ? <Badge variant="default" className="bg-green-600 hover:bg-green-700">Active</Badge>
                                      : <Badge variant="outline">Completed</Badge>}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      
      {/* Edit Visitor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Visitor</DialogTitle>
            <DialogDescription>
              Update visitor details below. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="yearOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year of Birth</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1900}
                          max={new Date().getFullYear()}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sex</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Masculin">Masculin</SelectItem>
                          <SelectItem value="Feminin">Feminin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="municipality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Municipality</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select municipality" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {KINSHASA_MUNICIPALITIES.map(municipality => (
                          <SelectItem key={municipality} value={municipality}>
                            {municipality}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <Input {...field} />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={editVisitorMutation.isPending}>
                  {editVisitorMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Visitor Detail Modal */}
      {selectedVisitor && (
        <VisitorDetailModal
          visitor={selectedVisitor}
          visit={visitHistory.find(v => v.visitor.id === selectedVisitor.id)?.visit}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          onEdit={() => handleEditClick(selectedVisitor)}
          onDelete={() => handleDeleteVisitor(selectedVisitor.id)}
        />
      )}
    </div>
  );
}

// Export a wrapper that includes error boundary
export function AdminVisitTimeline(props: AdminVisitTimelineProps) {
  return (
    <ErrorBoundary fallback={<div className="p-4 text-center">An error occurred while loading the visit timeline. Please refresh the page and try again.</div>}>
      <AdminVisitTimelineComponent {...props} />
    </ErrorBoundary>
  );
}